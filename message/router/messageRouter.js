const express = require("express");
const router = express.Router();
const { Op } = require('sequelize');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {GoogleGenAI} =  require('@google/genai');
require('dotenv').config();

const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole");

const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const db = require('../data/db');

router.use(auth, checkUserRole(["student","company","admin","secretary"])); 

async function findReceiverByEmail(email) {
    let receiver = null;
    const mail = email;
    const parts = mail.split("@");
    const domain = parts[1];

    if (email === "buketoksuzoglu@iyte.edu.tr") {
        receiver = await db.Admin.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    else if (domain === "iyte.edu.tr") {
        receiver = await db.Secretary.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    else if (domain === "std.iyte.edu.tr") {
        receiver = await db.Student.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    else {
        receiver = await db.Company.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    return receiver;
}

findUserByIdandType = async (userId, userType) => {
    let user = null;
    // Check the userType and find the user accordingly
    if(userType == "student") {
         user = await db.Student.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    else if(userType == "company") {
         user = await db.Company.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    else if(userType == "admin") {
         user = await db.Admin.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    else if(userType == "secretary") {
         user = await db.Secretary.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    // If userType is not recognized, return null or throw an error
    return user;
}

const GEMINI_API_KEY = 'AIzaSyAtjOy-QJ3UxN9f-Npw69zoHjCcOc6-E6Y';
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});		
//client: no need to provide a conversation id, it will be found by the email of the student
router.post("/chatWithAI", checkUserRole(["student"]), asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id } });
	const userMessage = req.body.userMessage;
	
	// const genAI = new GoogleGenerativeAI();  		
	// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

	const prompt = userMessage; // Message sent by student

	const conversationExists = await db.Conversations.findOne({
		where: {
			user1_email: student.email,
			isDeletedByUser1: false,
			user2_email: "-",   
			user2_name: "AI",   // The condition to find the conversation with AI
		},
	});
	
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
		conversation_id: conversationExists.id,
		message: userMessage
	});

	try {
		const response = await ai.models.generateContent({
			model: 'tunedModels/internship-chatbot-akoqstzz8k5crm00pk4dr',
			contents: prompt,
  });
		const aiMessage = response.text;

		const aiMessageDb = await db.Message.create({
			from: "-",
			senderName: "AI",
			to: student.email,
			receiverName: student.username,
			conversation_id: conversationExists.id,
			message: aiMessage
		});

		// wait for the message to be created in the database
		await studentMessageDb;

		res.status(200).json({ userMessage: studentMessageDb.message, aiMessage: aiMessageDb.message }); // Response of AI is returned. 
	} catch (error) {
		console.error("Error generating AI content:", error);
		res.status(500).json({ error: "Failed to generate content from AI" });
	}
}));

// client rules : will get all the conversation messages it has with AI, if there is not itll be created, no post for creating a conversation with AI
// if the conversation doesn't exist, it will create a new one and return an empty array
// if the conversation exists, it will return the messages in that conversation
// there can be only one history with AI for each student
// the conversation with AI and all its messages can be deleted with delete "conversations/:id" endpoint
router.get("/conversation/ai",checkUserRole(["student"]), asyncErrorHandler(async (req, res, next) => {
	const student = await db.Student.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await db.Conversations.findOne({
		where: {
			user1_email: student.email,
			isDeletedByUser1: false,
			user2_email: "-",   
			user2_name: "AI",   // The condition to find the conversation with AI
		},
		attributes: ["id", "user1_email"], 
	});

	// Check if the conversation exists
	// If it doesn't exist, create a new conversation with AI
	if (!conversation) {
		const receiverEmail = "-";
		const receiverName = "AI";
		await db.Conversations.create({
			user1_email: student.email,
			user1_name: student.username,
			user2_email: receiverEmail,
			user2_name: receiverName
		});
		return res.status(200).json({ messages: [] });
	
	}
	if (conversation.user1_email !== student.email) {
		return res.status(403).json({ error: "You are not authorized to access this conversation" });
	}

	const messages = await db.Message.findAll({
		where: { conversation_id: conversation.id },
		order: [["createdAt", "ASC"]],
		attributes: ["id", "from", "to", "message", "createdAt", "fileName", "data", "is_read"],
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

	return res.status(200).json({ messages: unifiedMessages });
  })
);

router.get("/users", asyncErrorHandler(async (req, res, next) => {
	const secretary = await db.Secretary.findAll({ attributes: ['username', 'email'] });
	const companies = await db.Company.findAll({ attributes: ['username', 'email'] });
	const admin = await db.Admin.findAll({ attributes: ['username', 'email'] });
	const students = await db.Student.findAll({ attributes: ['username', 'email'] });
	const allUsers = [...secretary, ...companies, ...admin, ...students];
	res.status(200).json({ allUsers });
}));

router.get("/conversations", asyncErrorHandler(async (req, res, next) => {
	const user = await findUserByIdandType(req.user.id, req.user.userType);
	if (!user) {
		return res.status(404).json({ error: "User not found" });
	}

	const conversations = await db.Conversations.findAll({
		where: {
			[Op.or]: [
				// We don't want to show the conversation with AI
				{ user1_email: user.email, isDeletedByUser1: false, user2_name: { [Op.not]: "AI" } },
				{ user2_email: user.email, isDeletedByUser2: false, user2_name: { [Op.not]: "AI" } }
			]
		},
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name', 'user1_new_messages', 'user2_new_messages', 'last_message_time']
	});

	// To obtain requesting student as the user1 in the conversation
	const formattedConversations = conversations.map(conv => {
		if (conv.user2_email === user.email) {
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

//client: if the conversation already exists, it will be returned without creating a new one
// if the conversation doesn't exist, it will be created and returned
router.post("/conversations", asyncErrorHandler(async (req, res, next) => {
	const user = await findUserByIdandType(req.user.id, req.user.userType);
	if (!user) {
		return res.status(404).json({ error: "User not found" });
	}
	const { receiverEmail, receiverName } = req.body;  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1
	if (user.email === receiverEmail) {
		return res.status(400).json({ error: "Users cannot create a conversation with themselves" });
	}

	const receiver = await findReceiverByEmail(receiverEmail);
	if (!receiver) {
		return res.status(400).json({ error: "Receiver email could not found in the system" });
	}

	const existingConversation = await db.Conversations.findOne({
		where: {
			[Op.or]: [
				{ user1_email: user.email, user2_email: receiverEmail },
				{ user1_email: receiverEmail, user2_email: user.email }
			]
		}
	});

	// Check if the conversation already exists
	// If it is deleted by one of the users, it will be updated and returned
	// If it is not deleted, it will be returned as it is
	if (existingConversation) {
		if (existingConversation.user1_email === user.email && existingConversation.isDeletedByUser1) {
			await existingConversation.update({ isDeletedByUser1: false });
		}
		else if (existingConversation.user2_email === user.email && existingConversation.isDeletedByUser2) {
			await existingConversation.update({ isDeletedByUser2: false });
		}
		return res.status(200).json({ conversations: existingConversation });
		
	}

	// If the conversation doesn't exist, create a new one
	const conversations = await db.Conversations.create({
		user1_email: user.email,
		user1_name: user.username,
		user2_email: receiver.email,
		user2_name: receiver.username
	});
	res.status(200).json({ conversations });
}));

// client check the case in which both users deleted the conversation
router.delete("/conversations/:id", asyncErrorHandler(async (req, res, next) => {
	const conversationId = req.params.id;
	const user = await findUserByIdandType(req.user.id, req.user.userType);
	if (!user) {
		return res.status(404).json({ error: "User not found" });
	}
	const conversation = await db.Conversations.findByPk(conversationId);

	if (!conversation) {
		throw new Error('Conversation not found');
	}
	// I moved the check whetner the user is a participant in the conversation to the incoming lines
	// with proper deletion logic

	let updateField, oppositeField;

	if (conversation.user1_email === user.email) {
		updateField = 'isDeletedByUser1';
		oppositeField = 'isDeletedByUser2';
		// if the conversation is with AI, it will be deleted from the database without waiting for the other user
		if (conversation.user2_name === "AI") {
			await conversation.destroy({ where: { id: conversationId } });
			return res.status(200).json("Conversation deleted successfully");
		}
	} else if (conversation.user2_email === user.email) {
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

module.exports = router;
