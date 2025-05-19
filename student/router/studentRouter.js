const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const path = require('path');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');
const AdmZip = require("adm-zip");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const bcrypt = require("bcrypt");
require('dotenv').config();

const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole");
// router.use(auth, checkUserRole("student"));
router.use((req, res, next) => {
  // Allow unauthenticated access only to GET /profile/:studentId
  if (
    req.method === "GET" &&
    /^\/profile\/\d+$/.test(req.path)
  ) {
    return next();
  }
  // Apply auth + role check to all other routes
  return auth(req, res, () => checkUserRole("student")(req, res, next));
});


const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const { uploadFile } = require('../utils/fileUploader');
const profileRouter = require("./studentProfileRouter"); 
const internshipRouter = require("./studentInternshipRouter");
const applicationRouter = require("./studentApplicationRouter");

const db = require('../data/db');

async function findReceiverByEmail(email) {
	let receiver = null;
	const mail = email;
	const parts = mail.split("@");
	const domain = parts[1];

	if (email === "buketoksuzoglu@iyte.edu.tr") {
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

router.get("/", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({
		where: { id: req.user.id },
		attributes: {
			exclude: ["password"]
		},
		include: [
			{
				model: db.StudentProfile,
				attributes: ['profilePicture']
			}
		]
	});
	if (!student) {
        return res.status(404).json({ message: "Student not found" });
    }
	return res.status(200).json({ 
        userType: "student", 
        dataValues: {
            ...student.dataValues,
            profilePicture: student?.StudentProfile?.profilePicture || null
        }
    });
	// return res.status(200).json({ userType: "student", dataValues: student });
}));

router.post("/createStudentInfo",asyncErrorHandler(async (req, res, next) => {
	const id = req.user.id;
    const body = { studentId: id, ...req.body }; // Merge user ID with request body

    await db.StudentInfo.create(body);

    return res.status(200).json({ message: "Student info created successfully." });
}));

router.put("/updateStudentInfo", asyncErrorHandler(async (req, res, next) => {
    const id = req.user.id; 
    const updates = req.body; 

    // Remove any undefined or null values from updates
    Object.keys(updates).forEach(key => {
        if (updates[key] === undefined || updates[key] === null) {
            delete updates[key];
        }
    });

    // Update only the changed fields
    const [updated] = await db.StudentInfo.update(updates, {
        where: { studentId: id }
    });

    if (updated) {
        return res.status(200).json({ message: "Student info updated successfully." });
    } else {
        return res.status(404).json({ message: "No record found to update." });
    }
}));

// AIChatbot için api
router.post("/chatWithAI", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id } });
	const userMessage = req.body.userMessage;
	const conversationId = req.body.conversationId;
	
	const genAI = new GoogleGenerativeAI(process.env.AI_API);  				// process.env.AI_API must be in .env file 
	const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

	const prompt = userMessage; // Message sent by student

	const conversationExists = await db.Conversations.findByPk(conversationId);
	if (!conversationExists) {
		return res.status(404).json({ error: "Conversation not found" });
	}

	if (conversationExists.user1_email !== student.email) {
		return res.status(403).json({ error: "You are not authorized to send messages in this conversation" });
	}

	const studentMessageDb = db.Message.create({
		from: student.email,
		senderName: student.username,
		to: "-",
		receiverName: "AI",
		conversation_id: conversationId,
		message: userMessage
	});

	try {
		const result = await model.generateContent(prompt);
		const aiMessage = result.response.text(); // Response received from AI.

		const aiMessageDb = await db.Message.create({
			from: "-",
			senderName: "AI",
			to: student.email,
			receiverName: student.username,
			conversation_id: conversationId,
			message: aiMessage
		});

		await studentMessageDb;

		res.status(200).json({ userMessage: studentMessageDb.message, aiMessage: aiMessageDb.message }); // Response of AI is returned. 
	} catch (error) {
		console.error("Error generating AI content:", error);
		res.status(500).json({ error: "Failed to generate content from AI" });
	}


	// const aiMessageEntry = await db.Message.create({
	//     from: "-",
	//     senderName: "AI",
	//     to: student.email,
	//     receiverName: student.username,
	//     topic: "Chat with AI",
	//     message: aiMessage
	// });
}));

router.get("/conversation/ai", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({
		where: { id: req.user.id },
		attributes: { exclude: ["password"] },
	});
	
	const conversation = await db.Conversations.findOne({
		where: {
			user1_email: student.email,
			isDeletedByUser1: false,
			user2_email: "-",   // AI ile konuşma koşulu
			user2_name: "AI",   // AI ile konuşma koşulu
		},
		attributes: ["id"], // Sadece id değeri dönülecek
	});
	
	return res.status(200).json({ id: conversation ? conversation.id : null });
  })
);

router.post("/conversation/ai", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const receiverEmail = "-";
	const receiverName = "AI";

	const existingConversation = await db.Conversations.findOne({
		where: {
			[Op.or]: [
				{ user1_email: student.email, user2_name: receiverName },
			]
		}
	});

	if (existingConversation) {
		return res.status(400).json({ error: "Conversation already exists" });
	}

	const conversations = await db.Conversations.create({
		user1_email: student.email,
		user1_name: student.username,
		user2_email: receiverEmail,
		user2_name: receiverName
	}, {
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name']
	});

	res.status(200).json({ conversations });
}));

router.get("/opportunities", asyncErrorHandler(async (req, res, next) => {

	const student = await db.Student.findOne({ where: { id: req.user.id } });
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
	const announcements = await db.Announcement.findAll({
		where: {
			status: "approved",
			startDate: {
				[Sequelize.Op.lte]: now // Ensure the announcement has started
			},
			endDate: { [Sequelize.Op.gt]: now },

			//to make sure students don't see the opportunities they have already applied so far. 
			id: {
				[Op.notIn]: Sequelize.literal(`(
                    SELECT announcementId
                    FROM Application
                    WHERE studentId = ${student.id}
                )`)
			}
		},
		attributes: ["id", "announcementName", "image"],
		include: [
			{
				model: db.Company,
				attributes: ['name']
			}
		]
	});

	const formattedAnnouncements = announcements.map(announcement => ({
		...announcement.dataValues,
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
	}));
	res.status(200).json({ announcements: formattedAnnouncements });
}));

router.get("/opportunities/matchingSkills", asyncErrorHandler(async (req, res) => {
	const studentId = req.user.id;
	const now = moment.tz('Europe/Istanbul').toDate();

	// Get student skill IDs
	const studentSkills = await db.StudentSkill.findAll({
		where: { studentId },
		attributes: ['skillId']
	});
	const skillIds = studentSkills.map(s => s.skillId);

	if (skillIds.length === 0) {
		return res.status(200).json({ announcements: [] }); // No skills, no matches
	}

	const announcements = await db.Announcement.findAll({
		where: {
			status: "approved",
			startDate: { [Op.lte]: now },
			endDate: { [Op.gt]: now },
			id: {
				[Op.notIn]: Sequelize.literal(`(
                    SELECT announcementId
                    FROM Application
                    WHERE studentId = ${studentId}
                )`)
			}
		},
		attributes: ["id", "announcementName", "image"],
		include: [
			{
				model: db.Company,
				attributes: ['name']
			},
			{
				model: db.Skill,
				as: 'skillId_Skills',
				where: {
					id: {
						[Op.in]: skillIds
					}
				},
				attributes: [] 
			}
		],
		distinct: true
	});

	const formattedAnnouncements = announcements.map(a => ({
		...a.dataValues,
		image: a.image ? `data:image/png;base64,${a.image.toString('base64')}` : null
	}));

	res.status(200).json({ announcements: formattedAnnouncements });
}));

router.get("/opportunities/:opportunityId", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id } });
	const opportunityId = req.params.opportunityId
	const now = moment.tz('Europe/Istanbul').toDate(); 
	const applications = await db.Application.findAll({ where: { announcementId: opportunityId, studentId: student.id } })
	var announcement;
	const isApplied = (applications.length != 0);
	//if students have already applied that opportunity then they can see the opportunities that are outdated.
	if (isApplied) {
		announcement = await db.Announcement.findOne({
			where: { id: opportunityId },
			include: [{ model: db.Company, attributes: ['name'] }]
		});
	}
	else {
		announcement = await db.Announcement.findOne({
			where: {
				id: opportunityId,
				// The announcement must have started and must not be finished yet!
				startDate: { [Sequelize.Op.lte]: now },
				endDate: { [Sequelize.Op.gt]: now }
			},
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
	}

	if (!announcement) return res.status(400).json({ error: "There is no available announcement you are allowed to see." });

	const timeDifference = announcement.endDate - now;
	const remainingSeconds = Math.floor(timeDifference / 1000);
	
	const formattedAnnouncement = {
		...announcement.dataValues,
		remainingSeconds,
		isApplied: !!isApplied,
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
	};
	res.status(200).json({ announcement: formattedAnnouncement });
}));

router.post("/opportunities/:opportunityId", upload.single('CV'), asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id } });
	const announcementId = req.params.opportunityId;
	const isApplied = await db.Application.findOne({ where: { announcementId, studentId: student.id } });
	if (isApplied) { return res.status(409).json({ error: "Already applied to this announcement." }); }

	const { user_phone, relative_phone } = req.body;
	const templatePath = path.join(__dirname, '../files', 'ApplicationForm.docx');
	const createFilledDocument = async () => {
		const zip = new AdmZip(templatePath);
		const docxTemplate = zip.readAsText("word/document.xml");
		const filledDocx = docxTemplate
			.replace(/«name»/g, student.username)
			.replace(/«studentClass»/g, student.year)
			.replace(/«studentNumber»/g, student.id)
			.replace(/«tcNo»/g, student.tc)
			.replace(/«user_phone»/g, user_phone)
			.replace(/«relative_phone»/g, relative_phone)
			.replace(/«email»/g, student.email);
		zip.updateFile("word/document.xml", Buffer.from(filledDocx, "utf-8"));
		return zip.toBuffer();
	};

	bufferedApplicationForm = await createFilledDocument();

	const application = await db.Application.create({
		studentId: student.id,
		announcementId,
	});

	await db.Document.create({
		name: "ApplicationForm.docx",
		applicationId: application.id,
		data: bufferedApplicationForm,
		fileType: 'ApplicationForm',
		username: student.username
	});

	const file = req.file;
	const fileType = "CV";
	const name = file.originalname;
	const applicationId = application.id;

	await uploadFile(file, applicationId, student, name, fileType, db.Document);
	res.status(200).json({ message: "Succesfully applied." });
}));

router.get("/applications", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id } });
	const applications = await db.Application.findAll({
		where: {
			studentId: student.id  // Filter applications by the provided student ID
		},
		include: [
			{
				model: db.Student,
				attributes: ['username'] // Fetching only the student name
			},
			{
				model: db.Announcement,
				attributes: ['announcementName'],
				include: [
					{
						model: db.Company,
						attributes: ['id', 'name'], // Fetching the company name
						include: [
							{
								model: db.CompanyProfile,
								attributes: ['companyLogo']
							}
						]
					}
				]
			}
		]
	});

	res.status(200).json({ applications });
}));

// what is this for?
router.get("/download/:studentId/:fileType", asyncErrorHandler(async (req, res, next) => {
	const userId = req.params.studentId;
	const fileType = req.params.fileType;
	const takenDocument = await db.Document.findOne({ where: { userId, fileType } });
	if (!takenDocument) {
		return res.status(404).json({ error: "Error downloading file" });
	}
	let filename = takenDocument.dataValues.name;
	let binaryData = takenDocument.dataValues.data;
	let contentType = 'application/octet-stream'; // Default content type
	contentType = 'image/jpeg';
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(filename));
	res.setHeader('Content-Type', contentType);
	res.send(binaryData);
}));

router.get("/users", asyncErrorHandler(async (req, res, next) => {
	const secretary = await db.Secretary.findAll({ attributes: ['username', 'email'] });
	const companies = await db.Company.findAll({ attributes: ['username', 'email'] });
	const admin = await db.Admin.findAll({ attributes: ['username', 'email'] });
	const allUsers = [...secretary, ...companies, ...admin];
	res.status(200).json({ allUsers });
}));

router.get("/conversations", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({
		where: { id: req.user.id },
		attributes: { exclude: ['password'] }
	});

	const conversations = await db.Conversations.findAll({
		where: {
			[Op.or]: [
				// We don't want to show the conversation with AI
				{ user1_email: student.email, isDeletedByUser1: false, user2_name: { [Op.not]: "AI" } },
				{ user2_email: student.email, isDeletedByUser2: false, user2_name: { [Op.not]: "AI" } }
			]
		},
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name', 'user1_new_messages', 'user2_new_messages', 'last_message_time']
	});

	// To obtain requesting student as the user1 in the conversation
	const formattedConversations = conversations.map(conv => {
		if (conv.user2_email === student.email) {
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

router.post("/conversations", asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const { receiverEmail, receiverName } = req.body;
	if (student.email === receiverEmail) {
		return res.status(400).json({ error: "Users cannot create a conversation with themselves" });
	}

	const receiver = await findReceiverByEmail(receiverEmail);
	if (!receiver) {
		return res.status(400).json({ error: "Receiver email does not exist in the system" });
	}

	const existingConversation = await db.Conversations.findOne({
		where: {
			[Op.or]: [
				{ user1_email: student.email, user2_email: receiverEmail },
				{ user1_email: receiverEmail, user2_email: student.email }
			]
		}
	});

	if (existingConversation) {
		if (existingConversation.user1_email === student.email && existingConversation.isDeletedByUser1) {
			await existingConversation.update({ isDeletedByUser1: false });
		}
		else if (existingConversation.user2_email === student.email && existingConversation.isDeletedByUser2) {
			await existingConversation.update({ isDeletedByUser2: false });
		}
		else
			return res.status(400).json({ error: "Conversation already exists" });
		return res.status(200).json({ conversations: existingConversation });
	}

	const conversations = await db.Conversations.create({
		user1_email: student.email,
		user1_name: student.username,
		user2_email: receiverEmail,
		user2_name: receiverName
	}, {
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name']
	});
	res.status(200).json({ conversations });
}));

router.get("/conversations/:id", asyncErrorHandler(async (req, res, next) => {
	const conversationId = req.params.id;
	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await db.Conversations.findOne({ where: { id: conversationId } });

	if (!conversation) {
		return res.status(404).json({ error: "Conversation not found" });
	}
	if (![conversation.user1_email, conversation.user2_email].includes(student.email)) {
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
		isSentByUser: msg.from === student.email,
		fileName: msg.fileName,
		data: msg.data ? msg.data.toString('base64') : null,
		is_read: msg.is_read
	}));

	res.status(200).json({ messages: unifiedMessages });
}));

router.delete("/conversations/:id", asyncErrorHandler(async (req, res, next) => {
	const conversationId = req.params.id;
	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await db.Conversations.findByPk(conversationId);

	if (!conversation) {
		throw new Error('Conversation not found');
	}

	let updateField, oppositeField;

	if (conversation.user1_email === student.email) {
		updateField = 'isDeletedByUser1';
		oppositeField = 'isDeletedByUser2';
		// if the conversation is with AI, it will be deleted from the database without waiting for the other user
		if (conversation.user2_name === "AI") {
			await conversation.destroy({ where: { id: conversationId } });
			return res.status(200).json("Conversation deleted successfully");
		}
	} else if (conversation.user2_email === student.email) {
		updateField = 'isDeletedByUser2';
		oppositeField = 'isDeletedByUser1';
	} else {
		return res.status(403).json({ error: "You are not authorized to delete this conversation!" });
	}

	// if both users delete the conversation, it will be deleted from the database
	if (conversation[oppositeField]) {
		await conversation.destroy({ where: { id: conversationId } });
		// if only one user deletes the conversation, the conversation will be marked  as deleted by that user
	} else {
		await conversation.update({ [updateField]: true });
	}
	res.status(200).json("Conversation deleted successfully");
}));

router.post("/sendMessage", upload.single('file'), asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const { conversationId, message } = req.body;

	const conversation = await db.Conversations.findOne({ where: { id: conversationId } });
	if (!conversation) {
		return res.status(404).json({ errors: "Conversation not found" });
	}

	//user can't create messages in which it's not a part of the conversation
	let receiverEmail;
	if (conversation.user1_email === student.email) {
		receiverEmail = conversation.user2_email;
	} else if (conversation.user2_email === student.email) {
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
			from: student.email,
			senderName: student.username,
			to: receiverEmail,
			receiverName: receiver.username,
			conversation_id: conversationId,
			message,
			fileName,
			data,
		}
	);

	if (conversation.user1_email === student.email) {
		const numberOfNewMessages = conversation.user2_new_messages + 1;
		conversation.update({ last_message_time: createdMessage.createdAt, user2_new_messages: numberOfNewMessages });
    } else if (conversation.user2_email === student.email) {
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

router.delete("/deleteMessage/:id", asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;
	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await db.Message.findOne({ where: { id } });

	if (!message) {
		return res.status(404).json({ error: "Message not found with the given id" });
	}

	if (message.from !== student.email && message.to !== student.email) {
		return res.status(403).json({ error: "You are not authorized to delete this message!" });
	}

	if (message.is_read === false) {
		const conversation = await db.Conversations.findOne({ where: { id: message.conversation_id } });
        if (conversation.user1_email === student.email) {
            const numberOfNewMessages = conversation.user2_new_messages - 1;
            await conversation.update({ user2_new_messages: numberOfNewMessages });
        } else if (conversation.user2_email === student.email) {
            const numberOfNewMessages = conversation.user1_new_messages - 1;
            await conversation.update({ user1_new_messages: numberOfNewMessages });
        }
    }

	await message.destroy();
	res.status(200).json({ message: "Message deleted successfully", deletedMessage: message });
}));

router.put("/updateMessage/:id", asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;

	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await db.Message.findOne({ where: { id } });
	
	if (!message) {
        return res.status(404).json({ error: "Message not found with the given id" });
    }
	
	if (message.to !== student.email) {
        return res.status(403).json({ error: "You are not authorized to update this message!" });
    }

	await message.update({ is_read: true });
	const conversation = await db.Conversations.findOne({ where: { id: message.conversation_id } });
	conversation.user1_email === student.email ? conversation.update({ user1_new_messages: 0 }) : conversation.update({ user2_new_messages: 0 });
	res.status(200).json({ message: "Message updated successfully", Message: message.message });
}));

router.get("/personalInfo", asyncErrorHandler( async (req, res, next) => {
	const student = await db.Student.findOne({ 
		where: {id: req.user.id},
		attributes: {
			exclude: ["password"]
	}});
	return res.status(200).json(student);
}));

router.post('/personalInfo', asyncErrorHandler( async (req, res, next) => {
	const student = await db.Student.findOne({ 
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

		const checkPassword= await bcrypt.compare(currentPassword,student.password);
		if(!checkPassword) {
			return res.status(400).json({ error: 'Current password entered wrong!' });
		}

		const checkPassword2= await bcrypt.compare(password,student.password);
		if(checkPassword2) {
			return res.status(400).json({ error: 'New password must be different from the current password.' });
		}
		hashedPassword = await bcrypt.hash(password, 10);
	}
	if(hashedPassword){updates.password = hashedPassword;}

    await student.update(updates);
	res.status(200).json({ success: 'User information updated succesfully.' });
}));

router.use("/profile", profileRouter);
router.use("/internship", internshipRouter);
router.use("/application", applicationRouter);

module.exports = router;