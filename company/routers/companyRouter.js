const express = require("express");
const bcrypt= require("bcrypt");
const router= express.Router();
const moment = require('moment-timezone');
const multer= require("multer");
const upload = multer();
const AdmZip = require("adm-zip");
const mime = require('mime-types');
const { Op } = require('sequelize');
const uploadFile = require('../middleware/fileUploader');

const auth = require("../middleware/auth");  
const checkUserRole = require("../middleware/checkUserRole");

const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const { sendEmail } = require("../utils/emailSender");
const profileRouter = require("./companyProfileRouter"); // Import profile router
const internshipController = require("../controllers/companyInternshipController"); // Import profile router
const internshipRouter = require("./companyInternshipRouter");
const applicationRouter = require("./companyApplicationRouter");

const db = require("../data/db");

let totalApplicationsCount = 0;
let totalInternshipsCount = 0;

async function updateTotalApplicationsCount() {
    try {
        totalApplicationsCount = await db.Application.count( 
			{ 
				where: {
					isApprovedByCompany: null	
				} 
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total applications count:', error);
    }
}

// router.use(async (req, res, next) => {
//     await updateTotalApplicationsCount();
//     next();
// });

async function updateTotalInternshipsCount() {
    try {
        totalInternshipsCount = await db.Application.count( 
			{ 
				where: {
					isSentBySecretary: true	
				} 
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total applications count:', error);
    }
}

async function findReceiverByEmail(email) {
	let receiver = null;
	const mail = email;
	const parts = mail.split("@");
	const domain = parts[1];

	if (mail === "buketoksuzoglu@iyte.edu.tr") {
		receiver = await db.Admin.findOne({ where: { email } });
	}
	else if (domain === "iyte.edu.tr") {
		receiver = await db.Secretary.findOne({ where: { email } });
	}
	else if (domain === "std.iyte.edu.tr") {
		receiver = await db.Student.findOne({ where: { email } });
	}
	else {
		receiver = await db.Company.findOne({ where: { email } });
	}

	if (receiver) return receiver;

	return null;
}

// router.use(async (req, res, next) => {
//     await updateTotalInternshipsCount();
//     next();
// });

router.get("/internship/upload", asyncErrorHandler(internshipController.getUploadPage));
router.post("/internship/upload", uploadFile.fields([
    	{ name: 'manualReport', maxCount: 1 },
    	{ name: 'manualForm', maxCount: 1 }
  	]), 
	asyncErrorHandler(internshipController.uploadFiles));

router.get("/internship/download/:fileName", internshipController.downloadFileFromServer);

router.use((req, res, next) => {
  if (
	req.method === "GET" &&
	/^\/profile\/\d+$/.test(req.path)
  ) {
	return next();
  }
  return auth(req, res, () => checkUserRole("company")(req, res, next));
});

router.get("/", [auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await db.Company.findOne({ 
		where: {id: req.user.id},
		attributes: {
			exclude: ["password"],
		}, 
		include: [
			{
				model: db.CompanyProfile,
				attributes: ['companyLogo']
			}
		]
	});
	if (!company) {
        return res.status(404).json({ message: "Company not found" });
    }
	return res.status(200).json({ 
        userType: "company", 
        dataValues: {
            ...company.dataValues,
            profilePicture: company?.CompanyProfile?.companyLogo || null
        }
    });
}));

/*router.post('/announcement', upload.single('image'), [auth, checkUserRole('company')], asyncErrorHandler(async (req, res, next) => {
    const { skillIds = [], ...announcementData } = req.body;

	const transaction = await db.sequelize.transaction();
	try {
	    // Handle image separately
	    if (req.file) {
	        announcementData.image = req.file.buffer;
	    }

	    // Parse dates
	    announcementData.startDate = moment.tz(announcementData.startDate, 'Europe/Istanbul').startOf('day').toDate();
	    announcementData.endDate = moment.tz(announcementData.endDate, 'Europe/Istanbul').endOf('day').toDate();

	    // Set companyId from token
	    announcementData.companyId = req.user.id;

	    // Step 1: Create Announcement
	    const announcement = await db.Announcement.create(announcementData, { transaction });

	    // Step 2: Add AnnouncementSkill entries
	    if (skillIds.length > 0) {
	        const announcementSkills = skillIds.map(skillId => ({
	            announcementId: announcement.id,
	            skillId,
	        }));

	        await db.AnnouncementSkill.bulkCreate(announcementSkills, { transaction });
	    }

	    // Step 3: Commit
	    await transaction.commit();

	    res.status(200).json({ message: "Announcement published successfully" });
	} catch (error) {
	    await transaction.rollback();
	    throw error;
	}
}));

// this is for company to be able to see their announcements
router.get("/announcements",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const announcements = await db.Announcement.findAll({
		where:{companyId: req.user.id},
		attributes: {exclude:['companyId', 'status']}
	});
	
	res.status(200).json({ announcements });
}));

router.get("/announcements/:id", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const announcementId = req.params.id;

	const announcement = await db.Announcement.findOne({
		where: { id: announcementId },
		include: [
			{
				model: db.Skill,
				as: 'skillId_Skills', // Make sure this matches your association alias
				through: { attributes: [] }, // hide join table columns
				attributes: ['id', 'name'], // customize skill fields if needed
			}
		]
	});

	if (!announcement || announcement.companyId !== req.user.id) {
		return res.status(403).json({ error: "You do not have permission to access this resource." });
	}

	const formattedAnnouncement = {
		...announcement.dataValues,
		formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD MM YYYY'),
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
	};

	res.json(formattedAnnouncement);
}));

router.put("/announcements/:id", upload.single('image'), [auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	//This update is wrong.
	const announcementId = req.params.id;
	const announcement = await db.Announcement.findOne( { where: { id: announcementId}} );
	if(!announcement || announcement.companyId!= req.user.id )
		return res.status(403).json({ "error": "You do not have permission to access this resource."});

	let image = null;
	const file = req.file;
	if (file) {
		image = file.buffer;
	}
	
	const { announcementName, description, startDate, endDate } = req.body;
	const startDateInTurkey = moment.tz(startDate, 'Europe/Istanbul').startOf('day').toDate();
    const endDateInTurkey = moment.tz(endDate, 'Europe/Istanbul').endOf('day').toDate();
	await announcement.update(
		{ 
			announcementName,
			description,
			startDate: startDateInTurkey,
			endDate: endDateInTurkey,
			image,
			status: "edited"
		}
	);

	res.status(200).json({ message: "Announcement updated successfully" });
}));

router.get("/applications",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const applications = await db.Application.findAll({
		where: {
			isApprovedByCompany: null,
		},
        include: [
			{
            	model: db.Announcement,
            	where: { companyId: req.user.id },
				attributes: ['announcementName']
			},
			{
				model: db.Student,
				attributes: ['username', 'id', 'year']
			}
		]
    });

	return res.status(200).json({ applications });
}));

router.get("/applications/:applicationId",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await db.Company.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;
    const application = await db.Application.findOne({
		where: {
			id: applicationId
		},
        include: [
			{
            	model: db.Announcement,
            	where: { companyId: company.id },
				attributes: ['announcementName']
			},
			{
				model: db.Student,
				attributes: ['username', 'year'],
				include: [ { 
					model: db.StudentProfile,
					attributes: ['profilePicture']
				}]
			}
		]
    });
	
    const document = await db.Document.findOne({
		where: { applicationId, fileType: "CV" }
	});
	if (!document){console.log("there is no document")}

	res.json({ application: application, documentId: document.id });
}));

router.post("/applications/:applicationId/fillApplicationForm",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	let { internStartDate, internEndDate, internDuration, dutyAndTitle, workOnSaturday, workOnHoliday, day, sgk } = req.body;
	let y1,n1,y2,n2,y3,n3;
	const applicationId = req.params.applicationId;

	const document = await db.Document.findOne({
		where: { applicationId, fileType: "ApplicationForm" },
		include: {
			model: db.Application,
			include: [
				{
					model: db.Announcement,
					include: {
						model: db.Company
					}
				},
				{
					model: db.Student
				}
			]
		}
	});

	const binaryData = document.data;
	const zip = new AdmZip(binaryData);
	let docxTemplate = zip.readAsText("word/document.xml");
	if (workOnSaturday === "yes") {
		y1 = "X", n1 = "";
	}
	else {
		y1 = "", n1 = "X";
	}
	if (workOnHoliday === "yes") {
		y2 = "X", n2 = "";
	}
	else {
		y2 = "", n2 = "X", day = "";
	}
	if (sgk === "yes") {
		y3 = "X", n3 = "";
	}
	else {
		y3 = "", n3 = "X";
	}

	docxTemplate = docxTemplate
        .replace(/«companyName»/g, document.Application.Announcement.Company.name)
        .replace(/«address»/g, document.Application.Announcement.Company.address)
		.replace(/«internStartDate»/g, internStartDate)
		.replace(/«internEndDate»/g, internEndDate)
		.replace(/«internDuration»/g, internDuration)
		.replace(/«representativeName»/g, document.Application.Announcement.Company.username)
		.replace(/«dutyAndTitle»/g, dutyAndTitle)
		.replace(/«y1»/g, y1)
		.replace(/«n1»/g, n1)
		.replace(/«y2»/g, y2)
		.replace(/«n2»/g, n2)
		.replace(/«y3»/g, y3)
		.replace(/«n3»/g, n3)
		.replace(/«day»/g, day);
	zip.updateFile("word/document.xml", Buffer.from(docxTemplate, "utf-8"));

	const updatedDocxBuffer = zip.toBuffer();
	const updatedApplicationForm = await db.Document.findOne({where: {applicationId, fileType: "ApplicationForm"}});

	if (updatedApplicationForm === null) {
		await db.Document.create({
			name:`${document.Application.Student.username}_ApplicationForm.docx`,
			applicationId,
			data: updatedDocxBuffer,
			username: document.Application.Student.username
		});
	}
	else {
		await db.Document.update({ data: updatedDocxBuffer }, { where: { applicationId, fileType: "ApplicationForm" } });   
    }
	return res.status(200).json({ message: "Application filled successfully." });
}));

router.put("/applications/:applicationId",upload.single('upload-file'),[auth,checkUserRole("company")], asyncErrorHandler(async (req, res ,next) => {
	// const company = await db.Commpany.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;
	const { isApproved } = req.body;

	const application = await db.Application.findOne({
		where: { id: applicationId },
	    include: [
			{
				model: db.Student,
	            attributes: ['username', 'email']
	        },
	        {
				model: db.Announcement,
	            attributes: ['announcementName',"companyId"]
	        }
	    ]
	});

	if (application.get().Announcement.get().companyId!=req.user.id) {
		return res.status(400).json({ error: "You are not allowed to make changes on that application!" });
	}
	
	const file = req.file;
	let binaryData = null;
	if (file) {
		binaryData = file.buffer;
		await db.Document.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "ApplicationForm" } });
	}

	const emailSubject = isApproved === "true" ? 'Application Approved' : 'Application Rejected';
	const emailBody = `Hello ${application.Student.username},<br><br>
	    Your application titled "${application.Announcement.announcementName}" has been ${isApproved === "true" ? "approved by company" : "rejected by company and will be removed from our system"}.<br><br>
	    Best Regards,<br>Admin Team`;

	sendEmail(application.Student.email, emailSubject, emailBody);
	
	application.statusUpdateDate = new Date();
	if (isApproved === "true") {
	    application.isApprovedByCompany = true;
	    application.status = 1;
	    await application.save();
	    return res.status(200).json({ message: "Application approved." });
	} else {
	    application.isApprovedByCompany = false;
	    application.status = 4;
	    await application.save();
	    return res.status(200).json({ message: "Application rejected." });
	}
}));*/

router.get("/applications/download/:applicationId/:fileType",[auth,checkUserRole("company")], asyncErrorHandler(async (req, res , next) => {
	const applicationId = req.params.applicationId;
    const fileType = req.params.fileType;
    const takenDocument = await db.Document.findOne({where:{applicationId, fileType}});
    if(!takenDocument){
        return res.status(400).json({ error: "You need to fill the form before downloading the application form." });
    }

    let name = takenDocument.name;
    let data = takenDocument.data;

	const contentType = 'image/jpeg'; // You can make this dynamic if needed

	res.header('Access-Control-Expose-Headers', 'Content-Disposition'); // In order to enable obtaining it in axios request headers, otherwise it is not added into header. 
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(name));
	res.setHeader('Content-Type', contentType);
	res.send(data);
}));

router.get("/internships",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {

	// There should be the processes of upload company form and download Practice Evaluation Survey at this page
	// since there will be internships more than one, the internships should be clickable.
    const company = await db.Company.findOne({ where: { id: req.user.id } });
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
	const interns = await db.Internship.findAll({
		include: [
		  	{
				model: db.Application,
				attributes: ['id','status'],
				where:{
					isSentBySecretary: true,
				},
				include: [
			  		{ //internship's end date must be past by now.
						model: db.Announcement,
						where: { companyId: company.id },
						attributes: ['announcementName', 'id']
			  		},
			  		{
						model: db.Student,
						attributes: ['username', 'id']
			 	 	},
					{
						model: db.Document,
						where:{ fileType: "Internship Report"}
						
					}
				]	
		  	}
		]
	});

	res.json(interns);
}));

router.get("/internships/:applicationId",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	/* The internships that rejected or internships for which feedback sent should be clear 
	for company to understand the status of the intern. */
    const company = await db.Commpany.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;

	
	const internship = await db.Internship.findOne({
		where: {
			id: applicationId		
		},
        include: [
			{
				model: db.Application,
				include: [
					{
						model: db.Announcement,
						attributes: ['announcementName']
					},
					{
						model: db.Student,
						attributes: ['username','id']
					}
				]
			}
		]
    });

	res.send(internship); // to test it on postman

    /*res.render("singleInternship", {
        usertype: "company",
        dataValues: company.dataValues,
        application,
		totalApplicationsCount
    });*/

	// I dont know how this process will be handled at the frontend so I am just writing it like this for now.
}));

router.put("/internships/:applicationId",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await db.Commpany.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;
	const { isApproved, feedback } = req.body; // isApproved is a hidden object

	const internship = await db.Internship.findOne(
		{ 
			where: 
			{ 
				id: applicationId
			},
			include: [
				{
					model: db.Student,
					attributes: ['email']
				}
			]
		},	
	);

	if (isApproved === "true") {
		internship.isApproved = "approvedByCompany";
	    await internship.save();
	    return res.status(200).json({ message: "Summer practice report approved." });
	} else if(isApproved === "false") {
		// company must enter a feedback to inform student what the problem is for this option.
		const emailSubject = 'Summer Practice Report Rejected';
		const emailBody = `Hello ${internship.studentName},<br><br>
	    Your summer practice report has been rejected by ${company.name}.<br><br> Feedback: <br> ${feedback}. <br><br>
	    Best Regards,<br>Admin Team`;

		sendEmail(internship.Student.email, emailSubject, emailBody);

		internship.isApproved = "feedbackSent";
		await internship.save();
		// there should be a feedback for this option to inform students why they got rejected.
		// students can be rejected because of a mistake in the file so they can be able to send the file again.
	    return res.status(200).json({ message: `Summer practice report rejected and ${internship.studentName} is informed` });
	}
	else {
		// also there should be an option for company to reject the internship of the student definitly. 
		internship.isApproved = "rejected";
		await internship.save();
		return res.status(200).json({ message: "Internship is rejected." });
	}

}));

router.post("/companyForm/:applicationId", upload.single('companyForm'), [auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const company = await db.Commpany.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;
    
	const file = req.file;

	if (!file) {
		return res.status(400).json({ error: "No file uploaded" });
	}

  	const binaryData = file.buffer;

	const companyForm = await db.Document.findOne({where: {applicationId, fileType: "Company Form"}});

	if (companyForm === null) {
	  await db.Document.create({
			applicationId,
		  	name: file.originalname,
			fileType:'Company Form',
		  	username: company.username, // I thought using the company name would be better for this file
		  	data: binaryData,
	  });
	}
	else {
	  await db.Document.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "Company Form" } });   
	}

	return res.status(201).json({ message: "Company Form is uploaded" });
}));

router.get('/serveFile/:id', [auth, checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const file = await db.Document.findByPk(req.params.id);
    if (file) {
      res.setHeader('Content-Type', 'application/pdf');
      res.send(file.data);
    } else {
      res.status(404).send('File not found');
    }
}));

router.get("/personalInfo", [auth, checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const company = await db.Company.findOne({ 
		where: {id: req.user.id},
		attributes: {
			exclude: ["password"]
	}});
	console.log(company)
	return res.status(200).json(company);
}));

router.post('/personalInfo', [auth, checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const company = await db.Company.findOne({ 
		where: {id: req.user.id}});
    const { firstName, lastName, email, currentPassword, password, confirmPassword } = req.body;
	
	if (!firstName && !lastName && !email && !password) {
        return res.status(400).json({ error: 'At least one field must be provided for update' });
    }

    const updates = {};
    if (firstName && lastName) updates.username= `${firstName} ${lastName}`;
	if (email) updates.email = email;

	let hashedPassword;
	if (password) {
		if (password.length < 6) {
			return res.status(404).json({ error: 'Minimum password length is 6 characters' });
		}

		if (password !== confirmPassword) {
			return res.status(404).json({ error: 'Passwords do not match' });
		}

		const checkPassword= await bcrypt.compare(currentPassword,company.password);
		if(!checkPassword) {
			return res.status(400).json({ error: 'Current password entered wrong!' });
		}

		const checkPassword2= await bcrypt.compare(password,company.password);
		if(checkPassword2) {
			return res.status(400).json({ error: 'New password must be different from the current password.' });
		}
		hashedPassword = await bcrypt.hash(password, 10);
	}
	if(hashedPassword){updates.password = hashedPassword;}

    await company.update(updates);
	res.status(200).json({ success: 'User information updated succesfully.' });
}));

router.use("/profile", profileRouter);
router.use("/internship", internshipRouter);
router.use("/application", applicationRouter);

module.exports= router;