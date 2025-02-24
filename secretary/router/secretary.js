const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const amqp = require('amqplib/callback_api');
const bcrypt = require("bcrypt");


const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/asyncErrorHandler");
const { Op } = require("sequelize");

const Secretary_model = require("../models/secretary-model");
const Application_model = require("../models/application-model");
const Announcement_model = require("../models/announcement-model");
const Company_model = require("../models/company-model");
const Student_model = require("../models/student-model");
const Document_model = require("../models/document-model");
const Internship_model = require("../models/internship-model");
const Admin_model = require("../models/admin-model");
const Conversation_model = require("../models/conversation-model");
const Message_model = require("../models/message-model");

async function findReceiverByEmail(email) {
	let receiver = null;
	const mail = email;
	const parts = mail.split("@");
	const domain = parts[1];

	if (mail === "buketoksuzoglu@iyte.edu.tr") {
		receiver = await Admin_model.findOne({ where: { email } });
	}
	else if (domain === "iyte.edu.tr") {
		receiver = await Secretary_model.findOne({ where: { email } });
	}
	else if (domain === "std.iyte.edu.tr") {
		receiver = await Student_model.findOne({ where: { email } });
	}
	else {
		receiver = await Company_model.findOne({ where: { email } });
	}

	if (receiver) return receiver;

	return null;
}

router.get("/personalInfo",[auth,checkUserRole("secretary")], asyncErrorHandler( async (req, res, next) => {
    const secretary = await Secretary_model.findOne({ 
		where: {id: req.user.id},
		attributes: {
			exclude: ["password"]
	}});
    return res.status(200).json(secretary);
}));

router.post('/personalInfo',[auth,checkUserRole("secretary")], asyncErrorHandler( async (req, res, next) => {
	const secretary = await Secretary_model.findOne({ 
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

		const checkPassword= await bcrypt.compare(currentPassword,secretary.password);
		if(!checkPassword) {
			return res.status(400).json({ error: 'Current password entered wrong!' });
		}

		const checkPassword2= await bcrypt.compare(password,secretary.password);
		if(checkPassword2) {
			return res.status(400).json({ error: 'New password must be different from the current password.' });
		}
		hashedPassword = await bcrypt.hash(password, 10);
	}

	if(hashedPassword){updates.password = hashedPassword;}

    await secretary.update(updates);
	res.status(200).json({ success: 'User information updated succesfully.' });
}));


router.get("/", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const applications = await Application_model.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: true,
			isSentBySecretary: null
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
				attributes: ['username']['id']
			}
		]
	});
	res.status(200).json({ userType: "secretary", dataValues: secretary.dataValues, applications });
}));

router.get("/applicationForms", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	/* There will be application forms of more than one student, so we need to organize them according to each student
	(i.e according to different applicationIds) to be able to seperate them from each other. This way we can get the applicationId 
	of the file a student sent and secretary can send employment certificate to the student with the same applicationId. */
	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const applicationForms = await Document_model.findAll({ where: { fileType: "Updated Manual Application Form" } });

	res.send(applicationForms);

	/*res.render("applicationForms", {
		usertype: "secretary",
		dataValues: secretary.dataValues,
		applicationForms
	});*/
}));

router.post("/employmentCertificate", upload.single('employmentCertificate'), [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const { applicationId, id } = req.body; //can get both from the document table 

	const student = await Student_model.findOne({ where: { id } });

	const file = req.file;
	let binaryData = null;
	if (!file) {
		return res.status(404).json({ errors: "Error uploading file" });
	}
	binaryData = file.buffer;

	await Document_model.update(
		{
			status: "checkedBySecretary"
		},
		{
			where: { applicationId }
		}
	);

	await Document_model.create({
		applicationId,
		name: file.originalname,
		fileType: 'Manual Employment Certificate',
		username: student.username,
		userId: id,
		data: binaryData
	});

	res.status(200).json({ message: "Employment Certificate is uploaded" });

}));

router.get("/applications/download/:applicationId/:fileType", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const applicationId = req.params.applicationId;
	const fileType = req.params.fileType;
	const takenDocument = await Document_model.findOne({ where: { applicationId, fileType } });
	
	if (!takenDocument) {
		return res.status(404).json({ errors: "Error downloading file" });
	}
	let filename = takenDocument.dataValues.name;
	let binaryData = takenDocument.dataValues.data;
	let contentType = 'application/octet-stream'; // Default content type
	contentType = 'image/jpeg';
	res.header('Access-Control-Expose-Headers', 'Content-Disposition'); // In order to enable obtaining it in axios request headers, otherwise it is not added into header.
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(filename)); // this doesn't solve the problem completely
	res.setHeader('Content-Type', contentType);										   // the file name is corrupted
	res.send(binaryData);
}));

router.post("/applications/:applicationId", upload.single('studentFile'), [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const applicationId = req.params.applicationId.slice(0);
	const application = await Application_model.findOne({
		where: {
			id: applicationId
		},
		include: [
			{
				model: Student_model
			},
			{
				model: Announcement_model,
				include: [
					{
						model: Company_model
					}
				]
			}
		]
	})

	const file = req.file;
	const binaryData = file.buffer;
	const fileType = "Employment Certificate";
	const name = file.originalname;

	await Document_model.create({
		name,
		applicationId,
		data: binaryData,
		fileType,
		username: application.Student.username
	});

	application.status = 3;
	application.statusUpdateDate = new Date();
	application.isSentBySecretary = true;
	await application.save();

	await Internship_model.create({
		id: applicationId,
		studentName: application.Student.username,
		studentId: application.Student.id
	});

	const emailSubject = 'SSI certificate';
	const emailBody = `Hello ${application.Announcement.Company.username},<br><br>
	The SSI certificate of the student named ${application.Student.username} has been sent to you. You can download it from the system.<br><br>
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
	// res.redirect("/secretary");
}));

router.get("/users", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const students = await Student_model.findAll({ attributes: ['username', 'email'] });
	const companies = await Company_model.findAll({ attributes: ['username', 'email'] });
	const admin = await Admin_model.findAll({ attributes: ['username', 'email'] });
	const allUsers = [...students, ...companies, ...admin];
	res.status(200).json({ allUsers });
}));

router.get("/conversations", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const secretary = await Secretary_model.findOne({
		where: { id: req.user.id },
		attributes: { exclude: ['password'] }
	});

	const conversations = await Conversation_model.findAll({
		where: {
			[Op.or]: [
				{ user1_email: secretary.email, isDeletedByUser1: false },
				{ user2_email: secretary.email, isDeletedByUser2: false }
			]
		},
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name','user1_new_messages', 'user2_new_messages', 'last_message_time']
	});

	// In order to obtain all the time user 1 as the secretary
	const formattedConversations = conversations.map(conv => {
		if (conv.user2_email === secretary.email) {
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


router.post("/conversations", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const { receiverEmail, receiverName } = req.body;
	if (secretary.email === receiverEmail) {
		return res.status(400).json({ error: "Users cannot create a conversation with themselves" });
	}

	const receiver = await findReceiverByEmail(receiverEmail);
	if (!receiver) {
		return res.status(400).json({ error: "Receiver email does not exist in the system" });
	}

	const existingConversation = await Conversation_model.findOne({
		where: {
			[Op.or]: [
				{ user1_email: secretary.email, user2_email: receiverEmail },
				{ user1_email: receiverEmail, user2_email: secretary.email }
			]
		}
	});

	if (existingConversation) {
		if (existingConversation.user1_email === secretary.email && existingConversation.isDeletedByUser1) {
			await existingConversation.update({ isDeletedByUser1: false });
		}
		else if (existingConversation.user2_email === secretary.email && existingConversation.isDeletedByUser2) {
			await existingConversation.update({ isDeletedByUser2: false });
		}
		else
			return res.status(400).json({ error: "Conversation already exists" });
		return res.status(200).json({ conversations: existingConversation });
	}

	const conversations = await Conversation_model.create({
		user1_email: secretary.email,
		user1_name: secretary.username,
		user2_email: receiverEmail,
		user2_name: receiverName
	}, {
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name']
	});
	res.status(200).json({ conversations });
}));

router.get("/conversations/:id", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const conversationId = req.params.id;
	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await Conversation_model.findOne({ where: { id: conversationId } });

	if (!conversation) {
		return res.status(404).json({ error: "Conversation not found" });
	}
	if (![conversation.user1_email, conversation.user2_email].includes(secretary.email)) {
		return res.status(403).json({ error: "You are not a participant in this conversation" });
	}

	const messages = await Message_model.findAll({
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
		isSentByUser: msg.from === secretary.email,
		fileName: msg.fileName,
		data: msg.data ? msg.data.toString('base64') : null,
		is_read: msg.is_read
	}));

	res.status(200).json({ messages: unifiedMessages });
}));

router.delete("/conversations/:id", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const conversationId = req.params.id;
	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await Conversation_model.findByPk(conversationId);

	if (!conversation) {
		throw new Error('Conversation not found');
	}

	let updateField, oppositeField;

	if (conversation.user1_email === secretary.email) {
		updateField = 'isDeletedByUser1';
		oppositeField = 'isDeletedByUser2';
	} else if (conversation.user2_email === secretary.email) {
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

router.post("/sendMessage", upload.single('file'), [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const { conversationId, message } = req.body;

	const conversation = await Conversation_model.findOne({ where: { id: conversationId } });
	if (!conversation) {
		return res.status(404).json({ errors: "Conversation not found" });
	}
	
	//user can't create messages in which it's not a part of the conversation
	let receiverEmail;
	if (conversation.user1_email === secretary.email) {
		receiverEmail = conversation.user2_email;
	} else if (conversation.user2_email === secretary.email) {
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

	const createdMessage = await Message_model.create(
		{
			from: secretary.email,
			senderName: secretary.username,
			to: receiverEmail,
			receiverName: receiver.username,
			conversation_id: conversationId,
			message,
			fileName,
			data,
		}
	);

	if (conversation.user1_email === secretary.email) {
		const numberOfNewMessages = conversation.user2_new_messages + 1;
		conversation.update({ last_message_time: createdMessage.createdAt, user2_new_messages: numberOfNewMessages });
    } else if (conversation.user2_email === secretary.email) {
		const numberOfNewMessages = conversation.user1_new_messages + 1;
		conversation.update({ last_message_time: createdMessage.createdAt, user1_new_messages: numberOfNewMessages });
    }

	res.status(200).json({
		id: createdMessage.id,
		receiver: createdMessage.receiverName,
		message: createdMessage.message,
	});
}));

router.delete("/deleteMessage/:id", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;
	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await Message_model.findOne({ where: { id } });

	if (!message) {
		return res.status(404).json({ error: "Message not found with the given id" });
	}

	if (message.from !== secretary.email && message.to !== secretary.email) {
		return res.status(403).json({ error: "You are not authorized to delete this message!" });
	}

	if (message.is_read === false) {
		const conversation = await Conversation_model.findOne({ where: { id: message.conversation_id } });
        if (conversation.user1_email === secretary.email) {
            const numberOfNewMessages = conversation.user2_new_messages - 1;
            await conversation.update({ user2_new_messages: numberOfNewMessages });
        } else if (conversation.user2_email === secretary.email) {
            const numberOfNewMessages = conversation.user1_new_messages - 1;
            await conversation.update({ user1_new_messages: numberOfNewMessages });
        }
    }

	await message.destroy();
	res.status(200).json({ message: "Message deleted successfully", deletedMessage: message });
}));

router.put("/updateMessage/:id", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;

	const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await Message_model.findOne({ where: { id } });
	
	if (!message) {
        return res.status(404).json({ error: "Message not found with the given id" });
    }
	
	if (message.to !== secretary.email) {
        return res.status(403).json({ error: "You are not authorized to update this message!" });
    }

	await message.update({ is_read: true });
	const conversation = await Conversation_model.findOne({ where: { id: message.conversation_id } });
	conversation.user1_email === secretary.email ? conversation.update({ user1_new_messages: 0 }) : conversation.update({ user2_new_messages: 0 });
	res.status(200).json({ message: "Message updated successfully", Message: message.message });
}));


module.exports = router;