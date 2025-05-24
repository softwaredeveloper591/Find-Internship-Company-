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

router.put("/applications/:id", uploadFile.single('studentFile'), asyncErrorHandler(applicationController.evaluateApplication));
router.put("/manualApplications/:id", uploadFile.single('ApplicationForm'), asyncErrorHandler(applicationController.evaluateManualApplications));

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

router.get("/users", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const secretary = await db.Secretary.findAll({attributes: [ 'username', 'email']});
	const students = await db.Student.findAll({attributes: [ 'username', 'email']});
	const companies = await db.Company.findAll({attributes: [ 'username', 'email']});
	const allUsers = [...secretary, ...students, ...companies];
	res.status(200).json({ allUsers });
}));

router.get("/conversations", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversations = await db.Conversations.findAll({
		where: {
		  [Op.or]: [
			{ user1_email: admin.email, isDeletedByUser1: false },
			{ user2_email: admin.email, isDeletedByUser2: false }
		  ]
		},
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name', 'user1_new_messages', 'user2_new_messages', 'last_message_time']
	  });

	  const formattedConversations = conversations.map(conv => {
		if (conv.user2_email === admin.email) {
			return {
				id: conv.id,
				user1_email: conv.user2_email,
				user1_name: conv.user2_name,
				user2_email: conv.user1_email,
				user2_name: conv.user1_name,
				user1_new_messages: conv.user2_new_messages,
				user2_new_messages: conv.user1_new_messages,
				last_message_time: conv.last_message_time
			};
		}
		return conv;
	});

	res.status(200).json({ conversations: formattedConversations });
}));

router.post("/conversations", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const { receiverEmail,receiverName } = req.body;
	if (admin.email === receiverEmail) {
        return res.status(400).json({ error: "Users cannot create a conversation with themselves" });
    }

	const receiver = await findReceiverByEmail(receiverEmail);
    if (!receiver) {
        return res.status(400).json({ error: "Receiver email does not exist in the system" });
    }

	const existingConversation = await db.Conversations.findOne({
        where: {
            [Op.or]: [
                { user1_email: admin.email, user2_email: receiverEmail },
                { user1_email: receiverEmail, user2_email: admin.email }
            ]
        }
    });

    if (existingConversation) {
		if(existingConversation.user1_email === admin.email && existingConversation.isDeletedByUser1){
			await existingConversation.update({ isDeletedByUser1: false });
		}
		else if(existingConversation.user2_email === admin.email && existingConversation.isDeletedByUser2){
			await existingConversation.update({ isDeletedByUser2: false });
		}
		else
			return res.status(400).json({ error: "Conversation already exists" });
		return res.status(200).json({ conversations: existingConversation });
    }

	const conversations = await db.Conversations.create({
		user1_email: admin.email,
		user1_name: admin.username,
		user2_email: receiverEmail,
		user2_name: receiverName
	  },{
        attributes: ['id', 'user1_email', 'user1_name','user2_email' ,'user2_name']
    });
	res.status(200).json({ conversations });
}));

router.get("/conversations/:id", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const conversationId= req.params.id;
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await db.Conversations.findOne({ where: { id: conversationId } });

    if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
    }
    if (![conversation.user1_email, conversation.user2_email].includes(admin.email)) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
    }

	const messages = await db.Message.findAll({
        where: { conversation_id: conversationId },
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'from', 'to', 'message', 'createdAt', 'fileName', 'data', 'is_read']
    });

	const unifiedMessages = messages.map(msg => ({
        id: msg.id,
        from: msg.from,
        to: msg.to,
        message: msg.message,
        timestamp: msg.createdAt,
        isSentByUser: msg.from === admin.email,
		fileName: msg.fileName,
        data: msg.data ? msg.data.toString('base64') : null,
		is_read: msg.is_read
    }));

    res.status(200).json({ messages: unifiedMessages });
}));

router.delete("/conversations/:id", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const conversationId= req.params.id;
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await db.Conversations.findByPk(conversationId);

    if (!conversation) {
        throw new Error('Conversation not found');
    }

    let updateField, oppositeField;

    if (conversation.user1_email === admin.email) {
        updateField = 'isDeletedByUser1';
        oppositeField = 'isDeletedByUser2';
    } else if (conversation.user2_email === admin.email) {
        updateField = 'isDeletedByUser2';
        oppositeField = 'isDeletedByUser1';
    } else {
        throw new Error('User does not belong to this conversation');
    }

    if (conversation[oppositeField]) {
        await conversation.destroy({ where: { id: conversationId } });
    } else {
        await conversation.update({ [updateField]: true });
    }
	res.status(200).json("Conversation deleted successfully");
}));

router.post("/sendMessage", upload.single('file'), [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const {conversationId, message } = req.body;
	
	const conversation = await db.Conversations.findOne({ where: { id: conversationId } });
	if (!conversation) {
		return res.status(404).json({ errors: "Conversation not found" });
	}
		
	//admin can't create messages in which it's not a part of the conversation
	let receiverEmail;
    if (conversation.user1_email === admin.email) {
        receiverEmail = conversation.user2_email;
	
    } else if (conversation.user2_email === admin.email) {
        receiverEmail = conversation.user1_email;
    } else {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
    }

	const receiver = await findReceiverByEmail(receiverEmail);
	const file = req.file;
	let fileName = null;
	let data = null;

	if (file) {
		fileName = file.originalname;
		data = file.buffer;
	}

	const createdMessage = await db.Message.create(
		{
			from: admin.email,
			senderName: admin.username,
			to: receiverEmail,
			receiverName: receiver.username,
			conversation_id: conversationId,
			message,
			fileName,
			data,
		}
	);
	
	if (conversation.user1_email === admin.email) {
		const numberOfNewMessages = conversation.user2_new_messages + 1;
		conversation.update({ last_message_time: createdMessage.createdAt, user2_new_messages: numberOfNewMessages });
    } else if (conversation.user2_email === admin.email) {
		const numberOfNewMessages = conversation.user1_new_messages + 1;
		conversation.update({ last_message_time: createdMessage.createdAt, user1_new_messages: numberOfNewMessages });
    }
	
	// Send only the necessary parts of the message
	res.status(200).json({
		id: createdMessage.id,
		receiver: createdMessage.receiverName,
		message: createdMessage.message,
	});
}));

router.delete("/deleteMessage/:id", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;
	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await db.Message.findOne({ where: { id } });
	
	if (!message) {
        return res.status(404).json({ error: "Message not found with the given id" });
    }
	
	if (message.from !== admin.email && message.to !== admin.email) {
        return res.status(403).json({ error: "You are not authorized to delete this message!" });
    }

    if (message.is_read === false) {
		const conversation = await db.Conversations.findOne({ where: { id: message.conversation_id } });
        if (conversation.user1_email === admin.email) {
            const numberOfNewMessages = conversation.user2_new_messages - 1;
            await conversation.update({ user2_new_messages: numberOfNewMessages });
        } else if (conversation.user2_email === admin.email) {
            const numberOfNewMessages = conversation.user1_new_messages - 1;
            await conversation.update({ user1_new_messages: numberOfNewMessages });
        }
    }

	await message.destroy();
	res.status(200).json({ message: "Message deleted successfully", deletedMessage: message });
}));

router.put("/updateMessage/:id", [auth, checkUserRole("admin")], asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;

	const admin = await db.Admin.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await db.Message.findOne({ where: { id } });
	
	if (!message) {
        return res.status(404).json({ error: "Message not found with the given id" });
    }
	
	if (message.to !== admin.email) {
        return res.status(403).json({ error: "You are not authorized to update this message!" });
    }

	await message.update({ is_read: true });
	const conversation = await db.Conversations.findOne({ where: { id: message.conversation_id } });
	conversation.user1_email === admin.email ? conversation.update({ user1_new_messages: 0 }) : conversation.update({ user2_new_messages: 0 });
	res.status(200).json({ message: "Message updated successfully", Message: message.message });
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