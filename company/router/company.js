const express = require("express");
const router= express.Router();
const moment = require('moment-timezone');
const multer= require("multer");
const upload = multer();
const AdmZip = require("adm-zip");
const amqp = require('amqplib/callback_api');

const auth = require("../middleware/auth");  
const checkUserRole = require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Document_model = require("../models/document-model");
const Student_model = require("../models/student-model");
const Internship_model = require("../models/internship-model");

let totalApplicationsCount = 0;
let totalInternshipsCount = 0;

async function updateTotalApplicationsCount() {
    try {
        totalApplicationsCount = await Application_model.count( 
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

router.use(async (req, res, next) => {
    await updateTotalApplicationsCount();
    next();
});

async function updateTotalInternshipsCount() {
    try {
        totalInternshipsCount = await Application_model.count( 
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

router.use(async (req, res, next) => {
    await updateTotalInternshipsCount();
    next();
});

router.get("/",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await Company_model.findOne({ where: { id: req.user.id } });
    const applications = await Application_model.findAll({
		where: {
			isApprovedByCompany: null,
		},
        include: [
			{
            	model: Announcement_model,
            	where: { companyId: company.id },
				attributes: ['announcementName']
			},
			{
				model: Student_model,
				attributes: ['username', 'id', 'year']
			}
		]
    });
    res.render("applications", {
        usertype: "company",
        dataValues: company.dataValues,
        applications,
		totalInternshipsCount
    });
}));

router.get("/announcement",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const company = await Company_model.findOne({ where: {id: req.user.id} });
    res.render("companyShareOpportunity",{ 
		usertype:"company", 
		dataValues:company.dataValues,
		totalInternshipsCount
	});
}));

router.post('/announcement',upload.single('image'), [auth, checkUserRole('company')], asyncErrorHandler( async (req, res, next) => {
	const { companyId, announcementName, description, startDate, endDate } = req.body;
	let image = null;
	const file = req.file;
	if (file) {
		image = file.buffer;
	}

    const startDateInTurkey = moment.tz(startDate, 'Europe/Istanbul').startOf('day').toDate();
    const endDateInTurkey = moment.tz(endDate, 'Europe/Istanbul').endOf('day').toDate();
    await Announcement_model.create({
        companyId,
        announcementName,
        description,
		image,
        startDate: startDateInTurkey,
        endDate: endDateInTurkey
    });
    res.redirect("/company?action=formfilled");
}));

router.get("/announcements",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const company = await Company_model.findOne({ where: {id: req.user.id} });
	const announcements = await Announcement_model.findAll( { companyId: company.id });

    res.render("announcements",{ 
		usertype:"company",
		dataValues: company.dataValues,
		announcements,
	});
}));

router.get("/announcements/:id",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const announcementId = req.params.id;
	const announcement = await Announcement_model.findOne( { where: { id: announcementId}} );

	const formattedAnnouncement = {
		...announcement.dataValues,
		formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD MM YYYY'),
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
	};

    res.render("singleAnnouncement",{ 
		usertype:"company", 
		formattedAnnouncement,
	});
}));

router.put("/announcements/:id", upload.single('image'), [auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {

	/*I thought companies can edit the announcement directly on the page as on the linkedin profile and when they click the 
	"edit or something else" button the announcement will be edited and admin will see it as edited at the announcements page*/
	const announcementId = req.params.id;
	const announcement = await Announcement_model.findOne( { where: { id: announcementId}} );

	const { announcementName, description, startDate, endDate } = req.body;
	let image = null;
	const file = req.file;
	if (file) {
		image = file.buffer;
	}
	
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

	// we can directly save the default announcement image to the table instead of pulling it from the pictures every time
}));

router.get("/applications",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await Company_model.findOne({ where: { id: req.user.id } });
    const applications = await Application_model.findAll({
		where: {
			isApprovedByCompany: null,
		},
        include: [
			{
            	model: Announcement_model,
            	where: { companyId: company.id },
				attributes: ['announcementName']
			},
			{
				model: Student_model,
				attributes: ['username', 'id', 'year']
			}
		]
    });

    res.render("applications", {
        usertype: "company",
        dataValues: company.dataValues,
        applications,
		totalInternshipsCount
    });
}));

router.get("/internships",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {

	// There should be the processes of upload company form and download Practice Evaluation Survey at this page
	// since there will be internships more than one, the internships should be clickable.
    const company = await Company_model.findOne({ where: { id: req.user.id } });
    const interns = await Application_model.findAll({
		where: {
			isSentBySecretary: true,
		},
        include: [
			{
            	model: Announcement_model,
            	where: { companyId: company.id },
				attributes: ['announcementName']
			},
			{
				model: Student_model,
				attributes: ['username', 'id']
			}
		]
    });

    res.render("internships", {
        usertype: "company",
        dataValues: company.dataValues,
        interns,
		totalApplicationsCount
    });
}));

router.get("/internships/:applicationId",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	/* The internships that rejected or internships for which feedback sent should be clear 
	for company to understand the status of the intern. */
    const company = await Company_model.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;
    const internship = await Application_model.findOne({
		where: {
			id: applicationId
		},
        include: [
			{
            	model: Announcement_model,
            	where: { companyId: company.id },
				attributes: ['announcementName']
			},
			{
				model: Student_model,
				attributes: ['username', 'id']
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
    const company = await Company_model.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;
	const { isApproved, feedback } = req.body; // isApproved is a hidden object

	const internship = await Internship_model.findOne({ where: { id: applicationId}});

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

		amqp.connect('amqp://rabbitmq', (err, connection) => {
			if (err) throw err;
			connection.createChannel((err, channel) => {
				if (err) throw err;
				const queue = 'email_queue';
				const msg = JSON.stringify({
					to: application.Student.email,
					subject: emailSubject,
					body: emailBody
				});
				// Ensure the queue exists
				channel.assertQueue(queue, { durable: true });
				// Publish the message to the queue
				channel.sendToQueue(queue, Buffer.from(msg), { persistent: true });
				console.log(" [x] Sent %s", msg);
			});
	
			setTimeout(() => {
				connection.close();
			}, 500);
		});	

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
	const company = await Company_model.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;
    
	const file = req.file;

	if (!file) {
		return res.status(400).json({ error: "No file uploaded" });
	}

  	const binaryData = file.buffer;

	const companyForm = await Document_model.findOne({where: {applicationId, fileType: "Company Form"}});

	if (companyForm === null) {
	  await Document_model.create({
			applicationId,
		  	name: file.originalname,
			fileType:'Company Form',
		  	username: company.username, // I thought using the company name would be better for this file
		  	data: binaryData,
	  });
	}
	else {
	  await Document_model.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "Company Form" } });   
	}

	return res.status(201).json({ message: "Company Form is uploaded" });
}));

router.get("/applications/:applicationId",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await Company_model.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId.slice(1);
    const application = await Application_model.findOne({
		where: {
			id: applicationId
		},
        include: [
			{
            	model: Announcement_model,
            	where: { companyId: company.id },
				attributes: ['announcementName']
			},
			{
				model: Student_model,
				attributes: ['username']
			}
		]
    });
	
    const document = await Document_model.findOne({
		where: { applicationId, fileType: "CV" }
	});

    res.render("innerInternshipApplication", {
        usertype: "company",
        dataValues: company.dataValues,
        application,
        document,
		totalInternshipsCount
    });
}));

router.get('/serveFile/:id', [auth, checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const file = await Document_model.findByPk(req.params.id);
    if (file) {
      res.setHeader('Content-Type', 'application/pdf');
      res.send(file.data);
    } else {
      res.status(404).send('File not found');
    }
}));
  
router.post("/applications/:applicationId/fillApplicationForm",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	let { internStartDate, internEndDate, internDuration, dutyAndTitle, workOnSaturday, workOnHoliday, day, sgk } = req.body;
	let y1,n1,y2,n2,y3,n3;
	const applicationId = req.params.applicationId;

	const document = await Document_model.findOne({
		where: { applicationId, fileType: "Application Form" },
		include: {
			model: Application_model,
			include: [
				{
					model: Announcement_model,
					include: {
						model: Company_model
					}
				},
				{
					model: Student_model
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
	const updatedApplicationForm = await Document_model.findOne({where: {applicationId, fileType: "Updated Application Form"}});

	if (updatedApplicationForm === null) {
		await Document_model.create({
			name:`${document.Application.Student.username}_ApplicationForm.docx`,
			applicationId,
			data: updatedDocxBuffer,
			fileType:'Updated Application Form',
			username: document.Application.Student.username
		});
	}
	else {
		await Document_model.update({ data: updatedDocxBuffer }, { where: { applicationId, fileType: "Updated Application Form" } });   
    }
	res.send("you are okay");
}));

router.put("/applications/:applicationId",upload.single('upload-file'),[auth,checkUserRole("company")], asyncErrorHandler(async (req, res ,next) => {
	const applicationId = req.params.applicationId;
	const { isApproved } = req.body;

	const file = req.file;
	let binaryData = null;
	if (file) {
	    binaryData = file.buffer;
	    await Document_model.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "Updated Application Form" } });
	}

	const application = await Application_model.findOne({
	    where: { id: applicationId },
	    include: [
	        {
	            model: Student_model,
	            attributes: ['username', 'email']
	        },
	        {
	            model: Announcement_model,
	            attributes: ['announcementName']
	        }
	    ]
	});

	const emailSubject = isApproved === "true" ? 'Application Approved' : 'Application Rejected';
	const emailBody = `Hello ${application.Student.username},<br><br>
	    Your application titled "${application.Announcement.announcementName}" has been ${isApproved === "true" ? "approved by company" : "rejected by company and will be removed from our system"}.<br><br>
	    Best Regards,<br>Admin Team`;

	amqp.connect('amqp://rabbitmq', (err, connection) => {
		if (err) throw err;
		connection.createChannel((err, channel) => {
			if (err) throw err;
			const queue = 'email_queue';
			const msg = JSON.stringify({
				to: application.Student.email,
				subject: emailSubject,
				body: emailBody
			});
			// Ensure the queue exists
			channel.assertQueue(queue, { durable: true });
			// Publish the message to the queue
			channel.sendToQueue(queue, Buffer.from(msg), { persistent: true });
			console.log(" [x] Sent %s", msg);
		});

		setTimeout(() => {
			connection.close();
		}, 500);
	});	

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
}));

router.get("/applications/download/:applicationId/:fileType",[auth,checkUserRole("company")], asyncErrorHandler(async (req, res , next) => {
	const applicationId = req.params.applicationId;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{applicationId:applicationId, fileType:fileType}});
    if(!takenDocument){
        return res.status(400).json({ error: "You need to fill the form before downloading the application form." });
    }

    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
}));

module.exports= router;