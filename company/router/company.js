const express = require("express");
const router= express.Router();
const moment = require('moment-timezone');
const multer= require("multer");
const upload = multer();
const AdmZip = require("adm-zip");
const mime = require('mime-types');
const { Op } = require('sequelize');

const auth = require("../middleware/auth");  
const checkUserRole = require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const { sendEmail } = require("../utils/emailSender");

const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Document_model = require("../models/document-model");
const Student_model = require("../models/student-model");
const Internship_model = require("../models/internship-model");
const Message_model = require("../models/message-model");
const Conversation_model = require("../models/conversation-model");
const db=require("../models/index.js");

let totalApplicationsCount = 0;
let totalInternshipsCount = 0;

async function updateTotalApplicationsCount() {
    try {
        totalApplicationsCount = await db.Application.count( 
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

// router.use(async (req, res, next) => {
//     await updateTotalApplicationsCount();
//     next();
// });

async function updateTotalInternshipsCount() {
    try {
        totalInternshipsCount = await db.Application.count( 
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

// router.use(async (req, res, next) => {
//     await updateTotalInternshipsCount();
//     next();
// });

router.get("/",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await db.Company.findOne({ 
		where: {id: req.user.id},
		attributes: {
			exclude: ["password"]
	}});
    return res.status(200).json({ userType: "company", dataValues: company});
}));

router.get("/announcements",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const company = await db.Company.findOne({ where: { id: req.user.id } });
    const applications = await db.Application.findAll({
		where: {
			isApprovedByCompany: null,
		},
		attributes:['id', 'applyDate'],
        include: [
			{
            	model: db.Announcement,
            	where: { companyId: company.id },
				attributes: ['id','announcementName']
			},
			{
				model: db.Student,
				attributes: ['id', 'username','year']
			}
		]
    });
    // res.render("applications", {
    //     usertype: "company",
    //     dataValues: company.dataValues,
    //     applications,
	// 	totalInternshipsCount
    // });
	res.json(applications)
}));

// this endpoint is no longer needed!
// router.get("/announcement",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
// 	const company = await db.Company.findOne({ where: {id: req.user.id} });
//     res.render("companyShareOpportunity",{ 
// 		usertype:"company", 
// 		dataValues:company.dataValues,
// 		totalInternshipsCount
// 	});
// }));

router.post('/announcement',upload.single('image'), [auth, checkUserRole('company')], asyncErrorHandler( async (req, res, next) => {
	const companyId = req.user.id;
	const { announcementName, description, startDate, endDate } = req.body;
	let image = null;
	const file = req.file;
	if (file) {
		image = file.buffer;
	}

    const startDateInTurkey = moment.tz(startDate, 'Europe/Istanbul').startOf('day').toDate();
    const endDateInTurkey = moment.tz(endDate, 'Europe/Istanbul').endOf('day').toDate();
    await db.Announcement.create({
        companyId,
        announcementName,
        description,
		image,
        startDate: startDateInTurkey,
        endDate: endDateInTurkey
    });
    res.status(200).json({ message: "Announcement published successfully" });
}));

router.get("/announcements",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const announcements = await db.Announcement.findAll({
		where:{companyId: req.user.id},
		attributes: {exclude:['companyId', 'status']}
	});
	
	res.json(announcements);
    // res.render("announcements",{ 
	// 	usertype:"company",
	// 	dataValues: company.dataValues,
	// 	announcements,
	// });
}));

router.get("/announcements/:id",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	const announcementId = req.params.id;
	const announcement = await db.Announcement.findOne( { where: { id: announcementId}});
	if(!announcement || announcement.companyId!= req.user.id  )
		return res.status(403).json({ "error": "You do not have permission to access this resource." });

	const formattedAnnouncement = {
		...announcement.dataValues,
		formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD MM YYYY'),
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
	};
	res.json(formattedAnnouncement)
    // res.render("singleAnnouncement",{ 
	// 	usertype:"company", 
	// 	formattedAnnouncement,
	// });
}));

router.put("/announcements/:id", upload.single('image'), [auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {

	/*I thought companies can edit the announcement directly on the page as on the linkedin profile and when they click the 
	"edit or something else" button the announcement will be edited and admin will see it as edited at the announcements page*/
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

	// we can directly save the default announcement image to the table instead of pulling it from the pictures every time
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

	res.json(applications);
	
    // res.render("applications", {
    //     usertype: "company",
    //     dataValues: company.dataValues,
    //     applications,
	// 	totalInternshipsCount
    // });
}));

router.get("/internships",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {

	// There should be the processes of upload company form and download Practice Evaluation Survey at this page
	// since there will be internships more than one, the internships should be clickable.
    const company = await db.Company.findOne({ where: { id: req.user.id } });
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
	const interns = await db.Internship.findAll({
		include: [
		  	{
				model: db.Application,
				attributes: ['id','status'],
				where:{
					isSentBySecretary: true,
				},
				include: [
			  		{ //internship's end date must be past by now.
						model: db.Announcement,
						where: { companyId: company.id },
						attributes: ['announcementName', 'id']
			  		},
			  		{
						model: db.Student,
						attributes: ['username', 'id']
			 	 	},
					{
						model: db.Document,
						where:{ fileType: "Internship Report"}
						
					}
				]	
		  	}
		]
	});

	res.json(interns);

    /*res.render("internships", {
        usertype: "company",
        dataValues: company.dataValues,
        interns,
		totalApplicationsCount
    });*/
}));

router.get("/internships/:applicationId",[auth,checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
	/* The internships that rejected or internships for which feedback sent should be clear 
	for company to understand the status of the intern. */
    const company = await Company_model.findOne({ where: { id: req.user.id } });
	const applicationId = req.params.applicationId;

	
	const internship = await Internship_model.findOne({
		where: {
			id: applicationId		
		},
        include: [
			{
				model: Application_model,
				include: [
					{
						model: Announcement_model,
						attributes: ['announcementName']
					},
					{
						model: Student_model,
						attributes: ['username','id']
					}
				]
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

	const internship = await Internship_model.findOne(
		{ 
			where: 
			{ 
				id: applicationId
			},
			include: [
				{
					model: Student_model,
					attributes: ['email']
				}
			]
		},	
	);

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

		sendEmail(internship.Student.email, emailSubject, emailBody);

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
    // res.render("innerInternshipApplication", {
    //     usertype: "company",
    //     dataValues: company.dataValues,
    //     application,
    //     document,
	// 	totalInternshipsCount
    // });
}));

router.get('/serveFile/:id', [auth, checkUserRole("company")], asyncErrorHandler( async (req, res, next) => {
    const file = await db.Document.findByPk(req.params.id);
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

	const document = await db.Document.findOne({
		where: { applicationId, fileType: "Application Form" },
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
	const updatedApplicationForm = await db.Document.findOne({where: {applicationId, fileType: "Application Form"}});

	if (updatedApplicationForm === null) {
		await db.Document.create({
			name:`${document.Application.Student.username}_ApplicationForm.docx`,
			applicationId,
			data: updatedDocxBuffer,
			username: document.Application.Student.username
		});
	}
	else {
		await db.Document.update({ data: updatedDocxBuffer }, { where: { applicationId, fileType: "Application Form" } });   
    }
	return res.status(200).json({ message: "Application filled successfully." });
}));

router.put("/applications/:applicationId",upload.single('upload-file'),[auth,checkUserRole("company")], asyncErrorHandler(async (req, res ,next) => {
	// const company = await Company_model.findOne({ where: { id: req.user.id } });
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
		await db.Document.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "Application Form" } });
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

    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    const contentType = mime.lookup(filename) || 'application/octet-stream';

    res.setHeader('Content-Disposition', 'attachment; filename='+encodeURI(filename));
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
}));

router.get("/users", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const secretary = await db.Secretary.findAll({attributes: [ 'username', 'email']});
	const students = await db.Student.findAll({attributes: [ 'username', 'email']});
	const companies = await db.Company.findAll({attributes: [ 'username', 'email']});
	const admin = await db.Admin.findOne({attributes: [ 'username', 'email']});
	const allUsers = [...secretary, ...students, ...companies , admin];
	res.status(200).json({ allUsers });
}));

router.get("/conversations", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const company = await db.Company.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversations = await db.Conversation.findAll({
		where: {
		  [Op.or]: [
			{ user1_email: company.email, isDeletedByUser1: false },
			{ user2_email: company.email, isDeletedByUser2: false }
		  ]
		},
		attributes: ['id', 'user1_email', 'user1_name', 'user2_email', 'user2_name', 'user1_new_messages', 'user2_new_messages', 'last_message_time']
	  });

	  const formattedConversations = conversations.map(conv => {
		if (conv.user2_email === company.email) {
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

router.post("/conversations", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const company = await db.Company.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const { receiverEmail,receiverName } = req.body;
	if (company.email === receiverEmail) {
        return res.status(400).json({ error: "Users cannot create a conversation with themselves" });
    }

	const receiver = await findReceiverByEmail(receiverEmail);
    if (!receiver) {
        return res.status(400).json({ error: "Receiver email does not exist in the system" });
    }

	const existingConversation = await db.Conversation.findOne({
        where: {
            [Op.or]: [
                { user1_email: company.email, user2_email: receiverEmail },
                { user1_email: receiverEmail, user2_email: company.email }
            ]
        }
    });

    if (existingConversation) {
		if(existingConversation.user1_email === company.email && existingConversation.isDeletedByUser1){
			await existingConversation.update({ isDeletedByUser1: false });
		}
		else if(existingConversation.user2_email === company.email && existingConversation.isDeletedByUser2){
			await existingConversation.update({ isDeletedByUser2: false });
		}
		else
			return res.status(400).json({ error: "Conversation already exists" });
		return res.status(200).json({ conversations: existingConversation });
    }

	const conversations = await db.Conversation.create({
		user1_email: company.email,
		user1_name: company.username,
		user2_email: receiverEmail,
		user2_name: receiverName
	  },{
        attributes: ['id', 'user1_email', 'user1_name','user2_email' ,'user2_name']
    });
	res.status(200).json({ conversations });
}));

router.get("/conversations/:id", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const conversationId= req.params.id;
	const company = await db.Company.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await db.Conversation.findOne({ where: { id: conversationId } });

    if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
    }
    if (![conversation.user1_email, conversation.user2_email].includes(company.email)) {
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
        isSentByUser: msg.from === company.email,
		fileName: msg.fileName,
        data: msg.data ? msg.data.toString('base64') : null,
		is_read: msg.is_read
    }));

    res.status(200).json({ messages: unifiedMessages });
}));

router.delete("/conversations/:id", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const conversationId= req.params.id;
	const company = await db.Company.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const conversation = await db.Conversation.findByPk(conversationId);

    if (!conversation) {
        throw new Error('Conversation not found');
    }

    let updateField, oppositeField;

    if (conversation.user1_email === company.email) {
        updateField = 'isDeletedByUser1';
        oppositeField = 'isDeletedByUser2';
    } else if (conversation.user2_email === company.email) {
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

router.post("/sendMessage", upload.single('file'), [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const company = await db.Company.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const {conversationId, message } = req.body;
	
	const conversation = await db.Conversation.findOne({ where: { id: conversationId } });
	if (!conversation) {
		return res.status(404).json({ errors: "Conversation not found" });
	}
		
	//user can't create messages in which it's not a part of the conversation
	let receiverEmail;
    if (conversation.user1_email === company.email) {
        receiverEmail = conversation.user2_email;
    } else if (conversation.user2_email === company.email) {
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
			from: company.email,
			senderName: company.username,
			to: receiverEmail,
			receiverName: receiver.username,
			conversation_id: conversationId,
			message,
			fileName,
			data,
		}
	);

	if (conversation.user1_email === company.email) {
		const numberOfNewMessages = conversation.user2_new_messages + 1;
		conversation.update({ last_message_time: createdMessage.createdAt, user2_new_messages: numberOfNewMessages });
    } else if (conversation.user2_email === company.email) {
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

router.delete("/deleteMessage/:id", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;
	const company = await db.Company.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await db.Message.findOne({ where: { id } });
	
	if (!message) {
        return res.status(404).json({ error: "Message not found with the given id" });
    }
	
	if (message.from !== company.email && message.to !== company.email) {
        return res.status(403).json({ error: "You are not authorized to delete this message!" });
    }

	await message.destroy();
	res.status(200).json({ message: "Message deleted successfully", deletedMessage: message });
}));


router.put("/updateMessage/:id", [auth, checkUserRole("company")], asyncErrorHandler(async (req, res, next) => {
	const id = req.params.id;
	const isRead=true;

	const company = await db.Company.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
	const message = await Message_model.findOne({ where: { id } });
	
	if (!message) {
        return res.status(404).json({ error: "Message not found with the given id" });
    }
	
	if (message.from !== company.email && message.to !== company.email) {
        return res.status(403).json({ error: "You are not authorized to update this message!" });
    }
	
	
	await message.update({ is_read: isRead });
	const conversation = await db.Conversation.findOne({ where: { id: message.conversation_id } });
	conversation.user1_email === company.email ? conversation.update({ user1_new_messages: 0 }) : conversation.update({ user2_new_messages: 0 });
	res.status(200).json({ message: "Message updated successfully", Message: message.message });
}));

module.exports= router;