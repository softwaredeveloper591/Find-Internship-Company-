const express = require("express");
const bcrypt= require("bcrypt");
const router = express.Router();
const cron = require('node-cron');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const multer = require("multer");
const upload = multer();

const uploadFile = require("../middleware/fileUploader");

const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole")
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const { sendEmail } = require("../utils/emailSender");

router.use(auth, checkUserRole("admin"));

const internshipRouter = require("./adminInternshipRouter");
const announcementController = require("../controllers/adminAnnouncementController");
const applicationController = require("../controllers/adminApplicationController");

const db = require("../data/db");

let totalAnnouncementsCount = 0;
let totalApplicationsCount = 0;
let totalCompaniesCount = 0;

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

async function updateTotalAnnouncementsCount() {
	try {
		const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
		totalAnnouncementsCount = await db.Announcement.count(
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
		totalApplicationsCount = await db.Application.count(
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
		totalCompaniesCount = await db.Company.count(
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
		const result = await db.Announcement.update(
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

router.get("/announcementRequests", asyncErrorHandler(announcementController.getAnnouncements));
router.get("/announcement/:id", asyncErrorHandler(announcementController.getAnnouncement));

router.put("/announcement/:id", asyncErrorHandler(announcementController.approveAnnouncement));

router.get("/applicationRequests", asyncErrorHandler(applicationController.getApplications));
router.get("/applications/:id", asyncErrorHandler(applicationController.getApplication));
router.get("/manualApplications/:id", asyncErrorHandler(applicationController.getManualApplication));
router.get("/applications/download/:id/:fileType", asyncErrorHandler(applicationController.downloadFile));

router.put("/applications/:id", uploadFile.single('ApplicationForm'), asyncErrorHandler(applicationController.evaluateApplication));
router.put("/manualApplications/:id", uploadFile.single('ApplicationForm'), asyncErrorHandler(applicationController.evaluateManualApplications));

router.get('/serveFile/:id', [auth, checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const file = await db.Document.findByPk(req.params.id);
	if (file) {
	  res.setHeader('Content-Type', 'application/pdf');
	  res.send(file.data);
	} else {
	  res.status(404).send('File not found');
	}
}));

router.get("/personalInfo",[auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
    const admin = await db.Admin.findOne({ 
		where: {id: req.user.id},
		attributes: {
			exclude: ["password"]
	}});
    return res.status(200).json(admin);
}));

router.post('/personalInfo',[auth,checkUserRole("admin")], asyncErrorHandler( async (req, res, next) => {
	const admin = await db.Admin.findOne({ 
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

		const checkPassword= await bcrypt.compare(currentPassword,admin.password);
		if(!checkPassword) {
			return res.status(400).json({ error: 'Current password entered wrong!' });
		}

		const checkPassword2= await bcrypt.compare(password,admin.password);
		if(checkPassword2) {
			return res.status(400).json({ error: 'New password must be different from the current password.' });
		}
		hashedPassword = await bcrypt.hash(password, 10);
	}

	if(hashedPassword){updates.password = hashedPassword;}

    await admin.update(updates);
	res.status(200).json({ success: 'User information updated succesfully.' });
}));

router.get("/", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const applications = await db.Application.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: null
		},
		include: [
			{
				model: db.Announcement,
				include: {
					model: db.Company,
					attributes: ['name']
				}
			},
			{
				model: db.Student,
				attributes: ['username']['id']
			}
		]
	});
	res.status(200).json({ userType: "admin", dataValues: admin.dataValues, applications, totalAnnouncementsCount, totalCompaniesCount });
}));

/*router.get("/applicationRequests", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	try {
		// Fetch the admin details, excluding the password
		const admin = await db.Admin.findOne({
			where: { id: req.user.id },
			attributes: { exclude: ['password'] }
		});

		if (!admin) {
			return res.status(404).json({ message: 'Admin not found' });
		}

		// Fetch the applications with the specified conditions
		const applications = await db.Application.findAll({
			where: {
				isApprovedByCompany: true,
				isApprovedByDIC: null
			},
			include: [
				{
					model: db.Announcement,
					include: {
						model: db.Company,
						attributes: ['name']
					}
				},
				{
					model: db.Student,
					attributes: ['username', 'id'] // Corrected the attribute format
				}
			]
		});

		res.status(200).json({
			dataValues: admin.dataValues,
			applications,
		});
	} catch (error) {
		console.error('Error fetching application requests:', error);
		res.status(500).json({ message: 'An error occurred while fetching application requests', error: error.message });
	}
}));

router.get("/applications/:applicationId", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const applicationId = req.params.applicationId;
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });

	const application = await db.Application.findOne({
		where: {
			id: applicationId
		},
		include: [
			{
				model: db.Announcement,
				include: {
					model: db.Company,
					attributes: ['name']
				}
			},
			{
				model: db.Student,
				attributes: ['username', 'id']
			}
		]
	});

	res.status(200).json({ application });
}));

router.get("/applications/download/:applicationId/:fileType", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const applicationId = req.params.applicationId;
	const fileType = req.params.fileType;
	const takenDocument = await db.Document.findOne({ where: { applicationId, fileType } });
	if (!takenDocument) {
		throw new Error("There is no such document.")
	}

	let filename = takenDocument.dataValues.name;
	let binaryData = takenDocument.dataValues.data;
	let contentType = 'application/octet-stream'; // Default content type
	contentType = 'image/jpeg';
	res.header('Access-Control-Expose-Headers', 'Content-Disposition'); // In order to enable obtaining it in axios request headers, otherwise it is not added into header. 
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(filename));
	res.setHeader('Content-Type', contentType);
	res.send(binaryData);
}));

router.put("/applications/:applicationId", upload.single('studentFile'), [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const applicationId = req.params.applicationId;
	const file = req.file;

	let binaryData = null;
	if (file) {
		binaryData = file.buffer;
		await db.Document.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "UpdatedApplicationForm" } });
	}
	const { isApproved, feedback } = req.body;

	const application = await db.Application.findOne({
		where: {
			id: applicationId
		},
		include: [
			{
				model: db.Student,
				attributes: ['username', 'email']
			},
			{
				model: db.Announcement,
				include: [
					{
						model: db.Company
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

	application.statusUpdateDate = new Date();
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

router.get("/announcementRequests", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone

	const announcements = await db.Announcement.findAll({
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
				model: db.Company,
				attributes: ['name']
			}
		]
	})
	const announcementsWithImages = announcements.map(announcement => {
		return {
			...announcement.dataValues
		};
	});
	res.status(200).json({ dataValues: admin.dataValues, announcements: announcementsWithImages });
}));

router.get("/announcement/:announcementId", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	try {
		const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
		const announcementId = req.params.announcementId;

		const announcement = await db.Announcement.findOne({
			where: { id: announcementId },
			include: [
				{ 
					model: db.Company, 
					attributes: ['name'] 
				},
				{
					model: db.Skill,
					as: 'skillId_Skills', // Make sure this matches your association alias
					through: { attributes: [] }, // hide join table columns
					attributes: ['id', 'name'], // customize skill fields if needed
				}
			]
		});

		if (!announcement) {
			return res.status(404).json({ message: 'Announcement not found' });
		}

		const formattedAnnouncement = {
			...announcement.dataValues,
			formattedStartDate: moment(announcement.startDate).tz('Europe/Istanbul').format('DD/MM/YYYY'),
			formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD/MM/YYYY')
		};
		res.status(200).json({ dataValues: admin.dataValues, announcement: formattedAnnouncement });
	} catch (error) {
		console.error('Error fetching announcement:', error); // Hata günlüğe yaz
		res.status(500).json({ message: 'Internal server error', error: error.message });
	}
}));

router.put("/announcement/:announcementId", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const announcementId = req.params.announcementId;
	const { isApproved, feedback } = req.body;

	const announcement = await db.Announcement.findOne({
		where: {
			id: announcementId
		},
		include: [
			{
				model: db.Company,
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
		await db.Announcement.destroy({ where: { id: announcement.id } });
		return res.status(200).json({ message: "Announcement rejected and removed from the system." });
	}
	announcement.status = "approved";
	await announcement.save();
	res.status(200).json({ message: "Announcement approved." });
}));*/

router.get("/companyRequests", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	// let admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
	const pendingCompanies = await db.Company.findAll({ where: { statusByDIC: null } });
	res.status(200).json({ companies: pendingCompanies });
}));

router.put("/company/:companyId", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const companyId = req.params.companyId;
	const { isApproved } = req.body;
	const company = await db.Company.findOne({ where: { id: companyId } });
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

router.use("/internship", internshipRouter);

module.exports = router;