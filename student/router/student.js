const express = require("express");
const router= express.Router();
const multer= require("multer");
const upload = multer();
const path = require('path');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');
const AdmZip = require("adm-zip");
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const Student_model= require("../models/student-model");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Document_model = require("../models/document-model");
const Application_model = require("../models/application-model");

/*let totalAnnouncementsCount = 0;

async function updateTotalAnnouncementsCount(id) {
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
    try {
        totalAnnouncementsCount = await Announcement_model.count( 
			{ 
				where: {
					isActive: true,
					startDate: {
						[Sequelize.Op.lte]: now // Ensure the announcement has started
					},
					id: {
						[Op.notIn]: Sequelize.literal(`(
							SELECT announcementId
							FROM application
							WHERE studentId = ${id}
						)`)
					}
				}
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total applications count:', error);
    }
}

router.use([auth,checkUserRole("student")],async function(req, res, next){
    await updateTotalAnnouncementsCount(req.user.id);
    next();
});*/

router.get("/",[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const student = await Student_model.findOne({ where: {id: req.user.id} });
    res.render("student",{ 
		usertype:"student", 
		dataValues:student.dataValues,
		//totalAnnouncementsCount
	});
}));

router.get("/applicationForm", [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const student = await Student_model.findOne({ where: {id: req.user.id} });
    res.render("applicationForm",{ 
		usertype:"student", 
		dataValues:student.dataValues,
		//totalAnnouncementsCount
	});

	/*there will be only a upload button at this page so we should handle it according to this.
	Student will be able to download the file after admin sends it back*/
	// adding a page to side bar would be absurd
}));

// router for student to see application forms that is sent back by admin and download them
router.get("/applicationForms", [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const student = await Student_model.findOne({ where: {id: req.user.id} });
	const applicationForms = await Document_model.findAll({ where: {fileType: "Updated Manual Application Form"}});

	res.send(applicationForms); // to test it at postman

    /*res.render("applicationForm",{ 
		usertype:"student", 
		dataValues:student.dataValues,
		//totalAnnouncementsCount
	});*/

	/*there will be only a upload and download button at this page so we should handle it according to this.
	Student will be able to download the file after admin sends it back*/
	// adding a page to side bar would be absurd just for this
}));

router.post("/applicationForm", upload.single('ApplicationForm'), [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const student = await Student_model.findOne({ where: {id: req.user.id} });

	const applicationId = uuidv4();

	const file = req.file;
	if (!file) {
		return res.status(400).json({ error: "No file uploaded" });
	}

  	const binaryData = file.buffer;

	await Document_model.create({
		applicationId,
		name:`${student.username}_ApplicationForm`,  
		data: binaryData,
		fileType:'Manual Application Form',
		username: student.username
  	});  

	res.status(201).json({ message: "Application form uploaded successfully" });
}));

router.get("/opportunities", [auth, checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {

    const student = await Student_model.findOne({ where: { id: req.user.id }});
    const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
    const announcements = await Announcement_model.findAll({
        where: {
            status: "approved",
            startDate: {
                [Sequelize.Op.lte]: now // Ensure the announcement has started
            },
            id: {
                [Op.notIn]: Sequelize.literal(`(
                    SELECT announcementId
                    FROM application
                    WHERE studentId = ${student.id}
                )`)
            }
        },
        include: [
            {
                model: Company_model,
                attributes: ['name'] ['username']
            }
        ]
    });
    const formattedAnnouncements = announcements.map(announcement => ({
        ...announcement.dataValues,
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
    }));
    res.render("opportunities", {
        usertype: "student",
        dataValues: student.dataValues,
        announcements: formattedAnnouncements
    });
}));

router.get("/opportunities/:opportunityId",[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const student = await Student_model.findOne({ where: { id: req.user.id }});
	const opportunityId = req.params.opportunityId.slice(1);
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
    const announcement = await Announcement_model.findOne({ 
		where: {
			id: opportunityId,
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
	const formattedAnnouncement = {
		...announcement.dataValues,
		formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD MM YYYY'),
		image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
	};
    res.render("apply", {
        usertype: "student",
        dataValues: student.dataValues,
        announcement: formattedAnnouncement
    });
}));

router.post("/opportunities/:opportunityId",upload.single('CV'),[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {

	const student = await Student_model.findOne( { where: { id: req.user.id }} );
  	const announcementId=req.params.opportunityId.slice(1);
  	const file = req.file;
  	const binaryData = file.buffer;
  	const fileType="CV";
  	const name = file.originalname;
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
    const application = await Application_model.create({
      	studentId: student.id,
      	announcementId,
      	status: 0,
    });
    await Document_model.create({
      	name:`${student.username}_ApplicationForm`,
      	applicationId: application.id,
      	data: bufferedApplicationForm,
      	fileType:'Application Form',
      	username: student.username
    });
  	await Document_model.create({
  	  	name,
  	  	applicationId: application.id,
  	  	data: binaryData,
  	  	fileType,
  	  	username: student.username
  	});

	res.redirect("/student/opportunities");
}));

router.get("/applications",[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
	const student = await Student_model.findOne({ where: { id: req.user.id }});
    const applications = await Application_model.findAll({
		where: {
		  studentId: student.id  // Filter applications by the provided student ID
		},
		include: [
		  	{
				model: Student_model,
				attributes: ['username'] // Fetching only the student name
		  	},
		  	{
				model: Announcement_model,
				attributes: ['announcementName'],
				include: [
				  {
					model: Company_model,
					attributes: ['name'] // Fetching the company name
				  }
				]
		  	}
		]
	});
	res.render("applications", {
		usertype: "student",
		dataValues: student.dataValues,
		applications,
		//totalAnnouncementsCount
	});
}));

router.get("/internship",[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
	const student = await Student_model.findOne({ where: { id: req.user.id }});

	const internship = await Application_model.findOne({
		where: {
		  studentId: student.id,  // Filter applications by the provided student ID
		  status:3
		},
		include: [
			// we dont need this since we have const student = await Student_model.findOne({ where: { id: req.user.id }});
		  	/*{
				model: Student_model,
				attributes: ['username'] // Fetching only the student name
		  	},*/
		  	{
				model: Announcement_model,
				attributes: ['announcementName'],
				include: [
				  {
					model: Company_model,
					attributes: ['name'] // Fetching the company name
				  }
				]
		  	}
		]
	});

	res.send(internship); // to test it on postman

	/*res.render("internship",{ 
		usertype:"student", 
		dataValues:student.dataValues,
		internship
	});*/

	// I dont know how this process will be handled at the frontend so I am just writing it like this for now.
	// There shold be the options to upload summer practise report and fill Practice Evaluation Survey at this page.
	// Should we check if the internship is over before the student do these processes.
}));

router.post("/summerPracticeReport/:applicationId", upload.single('SummerPracticeReport'), [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
	const applicationId = req.params.applicationId;
	/* We need to use a script as await fetch(/summerPracticeReport/:applicationId"). So we need to send applicationId
	to backend from frontend */
	const student = await Student_model.findOne({ where: { id: req.user.id }});

	const file = req.file;

	if (!file) {
		return res.status(400).json({ error: "No file uploaded" });
	}

  	const binaryData = file.buffer;

	const summerPracticeReport = await Document_model.findOne({where: {applicationId, fileType: "Summer Practice Report"}});

	if (summerPracticeReport === null) {
		await Document_model.create({
			applicationId,
			name: file.originalname,
			fileType:'Summer Practice Report',
			username: student.username,
			data: binaryData
		});
	}
	else {
		await Document_model.update({ data: binaryData, name: file.originalname }, { where: { applicationId, fileType: "Summer Practice Report" } });   
    }

	/* when the student uploads the file again, it would be good to ask "are you sure you want to upload 
	the summer practice report again". Also users should be able to see the files they uploaded to check if everything okay.*/

	res.status(201).json({ message: "Summer Practice Report is uploaded" });
    
}));

// what is this for?
router.get("/opportunities/download/:studentId/:fileType",[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
  const fileType = req.params.fileType;
  const studentId=req.params.studentId;
  const takenDocument = await Document_model.findOne({where:{studentId:studentId, fileType:fileType}});
  let filename= takenDocument.dataValues.name;
  let binaryData= takenDocument.dataValues.data;
  const fileExtension = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream'; // Default content type
  contentType = 'image/jpeg';
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', contentType);
  res.send(binaryData);
}));

module.exports= router;