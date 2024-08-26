const express = require("express");
const router= express.Router();
const multer= require("multer");
const upload = multer();
const amqp = require('amqplib/callback_api');

const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const Secretary_model= require("../models/secretary-model");
const Application_model= require("../models/application-model");
const Announcement_model= require("../models/announcement-model");
const Company_model= require("../models/company-model");
const Student_model= require("../models/student-model");
const Document_model= require("../models/document-model");

router.get("/", [auth, checkUserRole("secretary")], asyncErrorHandler( async (req, res, next) => {
 
    const secretary = await Secretary_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
	const applications = await Application_model.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: true,
			isSentBySecretary: false			
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
    res.render("secretary", {
        usertype: "secretary",
        dataValues: secretary.dataValues,
		applications
    });
}));

router.get("/applications/download/:applicationId/:fileType",[auth,checkUserRole("secretary")], asyncErrorHandler( async (req, res, next) => {
    const applicationId = req.params.applicationId;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{applicationId:applicationId, fileType:fileType}});
    if(!takenDocument){
        throw error("There is no such document.")
    }
    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
}));

router.post("/applications/:applicationId",upload.single('studentFile'),[auth,checkUserRole("secretary")], asyncErrorHandler( async (req, res, next) => {
	
	const applicationId=req.params.applicationId.slice(1);

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
  	const fileType="Employment Certificate";
  	const name = file.originalname;

   	await Document_model.create({
   	  	name,
   	  	applicationId,
   	  	data: binaryData,
   	  	fileType,
   	  	username: application.Student.username
   	});
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
	application.status = 3;
	application.isSentBySecretary = true;
	await application.save();
	res.redirect("/secretary");
}));

module.exports= router;