const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const uploadFile = require("../middleware/fileUploader");
const amqp = require('amqplib/callback_api');
const bcrypt = require("bcrypt");

const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/asyncErrorHandler");
const { Op } = require("sequelize");

const db = require("../data/db");

router.use(auth, checkUserRole("secretary"));

router.get("/personalInfo",[auth,checkUserRole("secretary")], asyncErrorHandler( async (req, res, next) => {
    const secretary = await db.Secretary.findOne({ 
		where: {id: req.user.id},
		attributes: {
			exclude: ["password"]
	}});
    return res.status(200).json(secretary);
}));

router.post('/personalInfo',[auth,checkUserRole("secretary")], asyncErrorHandler( async (req, res, next) => {
	const secretary = await db.Secretary.findOne({ 
		where: {id: req.user.id}});
    const { firstName, lastName, email, currentPassword, password, confirmPassword } = req.body;
	
	if (!firstName && !lastName && !email && !password) {
        return res.status(400).json({ error: 'At least one field must be provided for update' });
    }

    const updates = {};
    if (firstName && lastName) updates.username= `${firstName} ${lastName}`;
	if (email) {
		if (!email.endsWith('@iyte.edu.tr')) {
			return res.status(400).json({ error: 'Email must end with @iyte.edu.tr' });
		}
		updates.email = email;
	}

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

/*router.get("/", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const secretary = await db.Secretary.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const applications = await db.Application.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: true,
			isSentBySecretary: null
		},
		include: [
			{
				model: db.Announcement,
				include: {
					model: db.Company,
					attributes: ['name'],
					include: {
						model: db.CompanyProfile,
						attributes: ['companyLogo']
					}
				}
			},
			{
				model: db.Student,
				attributes: ['username']['id']
			}
		]
	});
	res.status(200).json({ userType: "secretary", dataValues: secretary.dataValues, applications });
}));

router.get("/applications/download/:applicationId/:fileType", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const applicationId = req.params.applicationId;
	const fileType = req.params.fileType;
	const takenDocument = await db.Document.findOne({ where: { applicationId, fileType } });
	
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
	
	const applicationId = req.params.applicationId;
	
	const internship = await db.Internship.findOne( { where: { applicationId } });

	if (internship) return res.status(403).json( { message: "This internship already approved" });

	const application = await db.Application.findOne({
		where: {
			id: applicationId
		},
		include: [
			{
				model: db.Student
			},
			{
				model: db.Announcement,
				include: [
					{
						model: db.Company
					}
				]
			}
		]
	})

	const file = req.file;
	const binaryData = file.buffer;
	const fileType = "EmploymentCertificate";
	const name = file.originalname;

	await db.Document.create({
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

	await db.Internship.create({
		applicationId,
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
	
	res.status(200).json({ message: "Employment certificate is uploded"});
}));*/

router.get("/users", [auth, checkUserRole("secretary")], asyncErrorHandler(async (req, res, next) => {
	const students = await db.Student.findAll({ attributes: ['username', 'email'] });
	const companies = await db.Company.findAll({ attributes: ['username', 'email'] });
	const admin = await db.Admin.findAll({ attributes: ['username', 'email'] });
	const allUsers = [...students, ...companies, ...admin];
	res.status(200).json({ allUsers });
}));


module.exports = router;