const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const applicationController = require("../controllers/companyApplicationController"); 
const uploadFile = require('../middleware/fileUploader'); 
const uploadImage = require('../middleware/imageUploader'); 

router.post("/announcement", uploadImage.single('image'), asyncErrorHandler(applicationController.postAnnouncement));

router.get("/announcements", asyncErrorHandler(applicationController.getAnnouncements));

router.get("/announcements/:id", asyncErrorHandler(applicationController.getAnnouncement));

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
				attributes: ['username']
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
}));

router.get("/applications/download/:applicationId/:fileType",[auth,checkUserRole("company")], asyncErrorHandler(async (req, res , next) => {
	const applicationId = req.params.applicationId;
	const fileType = req.params.fileType;
	const takenDocument = await db.Document.findOne({where:{applicationId:applicationId, fileType:fileType}});
	if(!takenDocument){
		return res.status(400).json({ error: "You need to fill the form before downloading the application form." });
	}

	let filename = takenDocument.name;
	let binaryData = takenDocument.data;
	console.log(binaryData);
	const contentType = mime.lookup(filename) || 'application/octet-stream';

	res.header('Access-Control-Expose-Headers', 'Content-Disposition');
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(filename));
	res.setHeader('Content-Type', contentType);
	res.send(binaryData);
}));

module.exports = router;