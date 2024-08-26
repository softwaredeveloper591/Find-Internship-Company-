const express = require("express");
const router= express.Router();
const cron = require('node-cron');
const { Sequelize } = require('sequelize');
const moment = require('moment-timezone');
const multer= require("multer");
const upload = multer();
const amqp = require('amqplib/callback_api');

const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole")
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Student_model = require("../models/student-model");
const Document_model = require("../models/document-model");

let totalAnnouncementsCount = 0;
let totalApplicationsCount = 0;
let totalCompaniesCount = 0;

async function updateTotalAnnouncementsCount() {
    try {
		const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
        totalAnnouncementsCount = await Announcement_model.count( 
			{ 
				where: {
					isActive: false,
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
            { isActive: false }, // Set isActive to false
            {
                where: {
                    endDate: {
                        [Sequelize.Op.lte]: now // Check if the current time is greater than or equal to endDate
                    },
                    isActive: true // Only update active announcements
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

router.get("/applicationForms", [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const admin = await Student_model.findOne({ where: {id: req.user.id} });

	const applicationForms = await Document_model.findAll({ where: { applicationId: null }});
    res.render("applicationForm",{ 
		usertype:"admin", 
		dataValues:admin.dataValues,
		applicationForms
	});

	// in the front end there will be student names and a download button next to the names
	// we need to use /documents/download/:id/:fileType
	/* maybe I can combine a way to join /documents/download/:id/:fileType and /application/download/:applicationId/:fileType 
	in the future but I will leave it like that for now*/
}));

router.get("/documents/download/:id/:fileType",[auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
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
}));

router.get("/announcementRequests", [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
	
	const announcements = await Announcement_model.findAll({
		where: {
			isActive: false,
			endDate: {
				[Sequelize.Op.gt]: now // Check if the current time is less than the endDate
			}
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
	}) 

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
	amqp.connect('amqp://rabbitmq', (err, connection) => {
		if (err) throw err;
		connection.createChannel((err, channel) => {
			if (err) throw err;
			const queue = 'email_queue';
			const msg = JSON.stringify({
				to: announcement.Company.email,
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
    if (!isApproved) {
		await Announcement_model.destroy({ where: { id: announcement.id } });
		return res.status(200).json({ message: "Announcement rejected and removed from the system." });
    }
	announcement.isActive = true;
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
	const isApproved = req.body.isApproved;
    const company = await Company_model.findOne({ where: { id: companyId } });
    if (!company) {
        return res.status(404).json({ errors: "Company not found." });
    }
    const emailSubject = isApproved ? 'Company Registration Approved' : 'Company Registration Rejected';
    const emailBody = `Hello ${company.username},<br><br>
        Your registration request has been ${isApproved ? "approved" : "rejected and removed from our system"}.<br><br>
        Best Regards,<br>Admin Team`;
    // Connect to RabbitMQ
    amqp.connect('amqp://rabbitmq', (err, connection) => {
        if (err) throw err;
        connection.createChannel((err, channel) => {
            if (err) throw err;
            const queue = 'email_queue';
            const msg = JSON.stringify({
                to: company.email,
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
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
	const emailBody = `Hello ${application.Announcement.Company.username},<br><br>
		Your application titled "${application.Announcement.announcementName}" has been ${isApproved === "true" ? "approved" : `rejected and will be removed from our system. <br><br> ${feedback ? `Feedback: <br> ${feedback}.` : ""}`} <br><br>
		Best Regards,<br>Admin Team`;
	amqp.connect('amqp://rabbitmq', (err, connection) => {
		if (err) throw err;
		connection.createChannel((err, channel) => {
			if (err) throw err;
			const queue = 'email_queue';
			const msg = JSON.stringify({
				to: application.Announcement.Company.email,
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

module.exports= router;