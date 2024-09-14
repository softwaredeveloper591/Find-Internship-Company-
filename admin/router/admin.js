const express = require("express");
const router = express.Router();
const cron = require('node-cron');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const multer= require("multer");
const upload = multer();

const auth = require("../middleware/auth"); 
const checkUserRole = require("../middleware/checkUserRole")
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const { sendEmail } = require("../utils/emailSender");

const Admin_model = require("../models/admin-model");
const Company_model = require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Student_model = require("../models/student-model");
const Document_model = require("../models/document-model");
const Internship_model = require("../models/internship-model");

let totalAnnouncementsCount = 0;
let totalApplicationsCount = 0;
let totalCompaniesCount = 0;

async function updateTotalAnnouncementsCount() {
    try {
		const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
        totalAnnouncementsCount = await Announcement_model.count( 
			{ 
				where: {
					status: {
						[Sequelize.Op.in]: ["pending", "edited"]
					},
					endDate: {
						[Sequelize.Op.gt]: now // Check if the current time is less than the endDate
					}
				} 
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total announcements count:', error);
    }
}

router.use(async (req, res, next) => {
    await updateTotalAnnouncementsCount();
    next();
});

async function updateTotalApplicationsCount() {
    try {
        totalApplicationsCount = await Application_model.count( 
			{ 
				where: {
					isApprovedByCompany: true,
					isApprovedByDIC: null		
				} 
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total applications count:', error);
    }
}

router.use(async (req, res, next) => {
    await updateTotalApplicationsCount();
    next();
});

async function updateTotalCompaniesCount() {
    try {
        totalCompaniesCount = await Company_model.count( 
			{ 
				where: {
					 statusByDIC: false 
				} 
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total announcements count:', error);
    }
}

router.use(async (req, res, next) => {
    await updateTotalCompaniesCount();
    next();
});

async function deactivateExpiredAnnouncements() {
    try {
        const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
        const result = await Announcement_model.update(
            { status: "inactive" }, // Set status to false
            {
                where: {
                    endDate: {
                        [Sequelize.Op.lte]: now // Check if the current time is greater than or equal to endDate
                    },
                    status: "approved" // Only update active announcements
                }
            }
        );
        console.log(`Deactivated ${result[0]} expired announcements.`);
    } catch (error) {
        console.error('Failed to deactivate expired announcements:', error);
    }
}

cron.schedule('0 0 * * *', deactivateExpiredAnnouncements);

router.get("/", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
    const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
    const applications = await Application_model.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: null			
		},
        include: [
			{
            	model: Announcement_model,
				include: {
					model: Company_model,
					attributes: ['name']
				}
			},
			{
				model: Student_model,
				attributes: ['username'] ['id']
			}
		]
    });
	res.render("applicationRequests", {
        usertype: "admin",
        dataValues: admin.dataValues,
        applications,
		totalAnnouncementsCount,
		totalCompaniesCount
    });
}));

router.get("/files", [auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	/* There will be application forms of more than one student, so we need to organize them according to each student
	(i.e according to different studentIds) to be able to seperate them from each other. This way we can get the studentId 
	of the file a student sent and admin can send a feedback to the student. */
	// also each application form of a student should be organized according to applicationId.
	/* there should be a part to show internship files too and this part should also separate from each other according to file type 
	for admin to be able to send feedback for each of them separately. */
    const admin = await Admin_model.findOne({ where: {id: req.user.id} });

	const applicationForms = await Document_model.findAll({
		where: {
		  	fileType: "Manual Application Form",
		  	[Op.or]: [
            	{ status: { [Op.ne]: "deleted" } },
            	{ status: null }
        	]
		}
	});

	res.send(applicationForms); // to test it at postman

    /*res.render("applicationForm",{ 
		usertype:"admin", 
		dataValues:admin.dataValues,
		applicationForms
	});*/

	// we need to use username to show which student sent the application form

	// in the front end there will be student names and a download button next to the names
	// we need to use /documents/download/:id/:fileType
	/* maybe I can find a way to combine /documents/download/:id/:fileType and /application/download/:applicationId/:fileType 
	in the future but I will leave it like that for now
	There is a library called uuid to assign unique ids to the table. Maybe I can use it or I can use the document model 
	instead of the application model at admin's applications page
	uuid is simply a random number generator which generates very large random numbers so the probolity of collision is very low*/
	// I used uuid
}));

router.put("/feedback/:studentId", [auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const studentId = req.params.studentId;
	const { applicationId, feedback } = req.body; // we need applicationId to update document table

	await Document_model.update(
		{
			status: "checkedByAdmin"
		},
		{
			where: {applicationId}
		}
	);

	// checked files should be signed as "feedback is sent" so admin can understand which files are checked.

	const student = await Student_model.findOne({ where: { id: studentId}});

	const emailSubject = 'Application Form Checked';
    const emailBody = `Hello ${student.username},<br><br>
        Your application form has been checked by admin. <br><br> Feedback: <br> ${feedback}. <br><br>
        Best Regards,<br>Admin Team`;

	/* admin must send a feedback to the student for student to know if the application form is correct or not. 
	If it is correct, student should wait for the employment certificate. If it is not, student should know this so he can 
	upload the corrected application form. */
	// admin must download the file before sending a feedback.
	sendEmail(student.email, emailSubject, emailBody);

	res.status(200).json({ message: "Feedback sent"});
}));

router.put("/applicationForms/:applicationId", upload.single('ApplicationForm'), [auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	
	const applicationId = req.params.applicationId;

	const file = req.file;

	if(!file) {
		return res.status(404).json({ errors: "Error uploading file" });
	}

	const binaryData = file.buffer;

	await Document_model.update(
		{ 
			name: file.originalname, 
			data: binaryData, fileType: "Updated Manual Application Form" 
		}, 
		{ 
			where: { applicationId }
		}
	);

	res.status(200).json({ message: "Application form sent to secretary"});
}));

router.put("/deleteApplicationForm/:applicationId", [auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	/* admin should be able to delete the application forms which are checked after sending a feedback and uploading application form
	for secretary to download. */
	
	const applicationId = req.params.applicationId;
	await Document_model.update({status: "deleted"},{ where: { applicationId } });

	res.status(200).json({ message: "Application form deleted"});
}));

// since I used uuid we don't need this router. We can use the /application/download/:applicationId/:fileType

/*router.get("/documents/download/:id/:fileType",[auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
    const id = req.params.id;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{id, fileType}});
    if(!takenDocument){
        throw new Error("There is no such document.")
    }
    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
}));*/

router.get("/announcementRequests", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
	
	const announcements = await Announcement_model.findAll({
		where: {
			status: {
				[Sequelize.Op.in]: ["pending", "edited"] // Match status to either "pending" or "edited"
			},

			// We should indicate at the frontend whether the announcement has been edited or not.
			endDate: {
				[Sequelize.Op.gt]: now // Check if the current time is less than the endDate
			}

			// we can automaticly reject the announcements with pass due dates.
		},
		include: [
			{
				model: Company_model,
				attributes: ['name'] 
			}
		]
	})
	const announcementsWithImages = announcements.map(announcement => {
		return {
		  ...announcement.dataValues,
		  image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
		};
	});
	res.render("announcementRequests", {
		usertype: "admin",
		dataValues: admin.dataValues,
		announcements: announcementsWithImages,
		totalApplicationsCount,
		totalCompaniesCount
	});
}));

router.get("/announcement/:announcementId", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
	const announcementId = req.params.announcementId.slice(1);
    const announcement = await Announcement_model.findOne({ 
		where: {
			id: announcementId
		},
		include: [
			{
				model: Company_model,
				attributes: ['name']
			}
		]
	}); 

	const formattedAnnouncement = {
        ...announcement.dataValues,
        formattedStartDate: moment(announcement.startDate).tz('Europe/Istanbul').format('DD/MM/YYYY'),
        formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD/MM/YYYY'),
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
    };

    res.render("innerAnnouncement", {
		usertype: "admin",
		dataValues: admin.dataValues,
		announcement: formattedAnnouncement,
		totalApplicationsCount,
		totalCompaniesCount
	});
}));

router.put("/announcement/:announcementId", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
    const announcementId = req.params.announcementId;
    const { isApproved, feedback } = req.body;

    const announcement = await Announcement_model.findOne({
		where: {
			id: announcementId
		},
		include: [
			{
				model: Company_model,
				attributes: ['username', 'email'] 
			}
		]
	})
    if (!announcement) {
        return res.status(404).json({ errors: "Announcement not found." });
    }
    const emailSubject = isApproved ? 'Announcement Approved' : 'Announcement Rejected';
    const emailBody = `Hello ${announcement.Company.username},<br><br>
        Your announcement titled "${announcement.announcementName}" has been ${isApproved ? "approved" : `rejected and will be removed from our system. <br><br> ${feedback ? `Feedback: <br> ${feedback}.` : ""}`} <br><br>
        Best Regards,<br>Admin Team`;

	sendEmail(announcement.Company.email, emailSubject, emailBody);

    if (!isApproved) {
		await Announcement_model.destroy({ where: { id: announcement.id } });
		return res.status(200).json({ message: "Announcement rejected and removed from the system." });
    }
	announcement.status = "approved";
    await announcement.save();
	res.status(200).json({ message: "Announcement approved." });
}));

router.get("/companyRequests", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
    let admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
    const pendingCompanies = await Company_model.findAll({ where: { statusByDIC: false } });
    res.render("companyRequests", {
        usertype: "admin",
        dataValues: admin.dataValues,
        companies: pendingCompanies,
		totalAnnouncementsCount,
		totalApplicationsCount
    });
}));

router.put("/company/:companyId", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const companyId = req.params.companyId;
	const { isApproved } = req.body;
    const company = await Company_model.findOne({ where: { id: companyId } });
    if (!company) {
        return res.status(404).json({ errors: "Company not found." });
    }
    const emailSubject = isApproved ? 'Company Registration Approved' : 'Company Registration Rejected';
    const emailBody = `Hello ${company.username},<br><br>
        Your registration request has been ${isApproved ? "approved" : "rejected and removed from our system"}.<br><br>
        Best Regards,<br>Admin Team`;
    // Connect to RabbitMQ
    sendEmail(company.email, emailSubject, emailBody);

    if (!isApproved) {
        await company.destroy();
        return res.status(200).json({ message: "Company registration request rejected and deleted." });
    }
    company.statusByDIC = true;
    await company.save();
    res.status(200).json({ message: "Company registration request approved." });
}));

router.get("/applicationRequests", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
   
    const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
    const applications = await Application_model.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: null			
		},
        include: [
			{
            	model: Announcement_model,
				include: {
					model: Company_model,
					attributes: ['name']
				}
			},
			{
				model: Student_model,
				attributes: ['username'] ['id']
			}
		]
    });
	res.render("applicationRequests", {
        usertype: "admin",
        dataValues: admin.dataValues,
        applications,
		totalAnnouncementsCount,
		totalCompaniesCount
    });
}));

router.get("/applications/:applicationId",[auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const applicationId = req.params.applicationId.slice(1);
    const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
    const application = await Application_model.findOne({
		where: {
			id: applicationId		
		},
        include: [
			{
            	model: Announcement_model,
				include: {
					model: Company_model,
					attributes: ['name']
				}
			},
			{
				model: Student_model,
				attributes: ['username', 'id']
			}
		]
    });
	res.render("adminInnerApplication", {
        usertype: "admin",
        dataValues: admin.dataValues,
        application,
		totalAnnouncementsCount,
		totalCompaniesCount
    });
}));

router.get("/applications/download/:applicationId/:fileType",[auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
    const applicationId = req.params.applicationId;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{applicationId, fileType}});
    if(!takenDocument){
        throw new Error("There is no such document.")
    }
    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';
    res.setHeader('Content-Disposition', 'attachment; filename='+encodeURI(filename));
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
}));

router.put("/applications/:applicationId",upload.single('studentFile'),[auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const applicationId = req.params.applicationId;
  	const file = req.file;
	let binaryData = null;
	if(file) {
		binaryData = file.buffer;
		await Document_model.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "Updated Application Form" } });
	}
	const { isApproved, feedback } = req.body; 
	const application = await Application_model.findOne({
		where: {
			id: applicationId
		},
        include: [
			{
            	model: Student_model,
				attributes: ['username', 'email']
			},
			{
            	model: Announcement_model,
				include: [
					{
						model: Company_model
					}
				],
				attributes: ['announcementName']
			}
		]
    });
	const emailSubject = isApproved === "true" ? 'Application Approved' : 'Application Rejected';
	const emailBody = `Hello ${application.Student.username},<br><br>
		Your application titled "${application.Announcement.announcementName}" has been ${isApproved === "true" ? "approved" : `rejected and will be removed from our system. <br><br> ${feedback ? `Feedback: <br> ${feedback}.` : ""}`} <br><br>
		Best Regards,<br>Admin Team`;

	sendEmail(application.Student.email, emailSubject, emailBody);

	if (isApproved === "true") {
        application.isApprovedByDIC = true;
		application.status = 2;
        await application.save();
        return res.status(200).json({ message: "Application approved." });
    } else {
        application.isApprovedByDIC = false;
		application.status = 4;
		await application.save();
        return res.status(200).json({ message: "Application rejected." });
    }
}));

router.get("/interns", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
    const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});

	const interns = await Internship_model.findAll({
		include: [
			{
				model: Application_model,
				include: {
					model: Announcement_model,
					include: {
						model: Company_model,
						attributes: ['name']
					}
				}
			},
			{
				model: Student_model,
				attributes: ['username', 'id']
			}
		]
	});
    
	res.send(interns); // to test it on postman

	/*res.render("applicationRequests", {
        usertype: "admin",
        dataValues: admin.dataValues,
        interns,
		totalAnnouncementsCount,
		totalCompaniesCount
    });*/

}));

router.get("/interns/:applicationId", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	// there will be all files off the student at this page
	// admin should be able to see if the internship of the student rejected by the company.
    const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
	const applicationId = req.params.applicationId;

    const intern = await Internship_model.findOne({
		where: {
			id: applicationId		
		},
        include: [
			{
				model: Application_model,
				include: [
					{
						model: Announcement_model,
						include: 
							{
								model: Company_model,
								attributes: ['name']
							}
					},
					{
						model: Student_model,
						attributes: ['username', 'id']
					}
				]
			}
		]
    });

	res.send(intern); // to test it on postman

	/*res.render("applicationRequests", {
        usertype: "admin",
        dataValues: admin.dataValues,
        intern,
		totalAnnouncementsCount,
		totalCompaniesCount
    });*/
	
}));

router.put("/interns/:applicationId", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	/* I think admin doesn't have to approve summer practice report or survey but should be able to give feedback to companies and students.
	This way companies and students can upload the files again if there is a mistake. It is enough to check the necessary files
	for admin to enter the score. Files don't have to be approved by admin, there should be just feedback option. */

	const applicationId = req.params.applicationId;
	const { score, feedback } = req.body; 

	const internship = await Internship_model.findOne({ where: { id: applicationId}});

    if (feedback !== null) {
		// I forgot to add feedback :d
		internship.isApproved = "feedbackSentByAdmin"
		await internship.save();
		return res.status(200).json({ message: "feedback is sent to company" });
	} else {
		internship.isApproved = "approved";
		internship.score = score;
		await internship.save();
		return res.status(200).json({ message: "score is entered" });
	}
}));

module.exports= router;