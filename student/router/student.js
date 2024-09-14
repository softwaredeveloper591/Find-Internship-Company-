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
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const { uploadFile } = require('../utils/fileUploader');

const Student_model= require("../models/student-model");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Document_model = require("../models/document-model");
const Application_model = require("../models/application-model");
const Internship_model = require("../models/internship-model");

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

// The page where all file operations are performed
router.get("/files", [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const student = await Student_model.findOne({ where: {id: req.user.id} });
	const applicationForms = await Document_model.findAll({ where: {userId: student.id}});

	res.send(applicationForms); // to test it at postman

    /*res.render("applicationForm",{ 
		usertype:"student", 
		dataValues:student.dataValues,
		//totalAnnouncementsCount
	});*/

}));

router.post("/applicationForm", upload.single('ApplicationForm'), [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    const student = await Student_model.findOne({ where: {id: req.user.id} });

	const applicationId = uuidv4();
	const file = req.file;
	const fileType = 'Manual Application Form';
	const name = `${student.username}_ApplicationForm`;
	const status = null;

	await uploadFile(file, applicationId, student, name, fileType, status, Document_model);

	res.status(201).json({ message: "Application Form uploaded successfully" });
}));

router.post("/file", upload.single('file'), [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
    /* since students send only one file for each file after internship starts and admin doesn't send back any of them, 
	there is no need to use an applicationId for this files. */
	const student = await Student_model.findOne({ where: {id: req.user.id} });

	let name = "";
	let fileType = "";

	const { filetype } = req.body; // this value will change according to file type. (i.e. application form, company form ...)

	if (filetype === "companyForm") {
		name = `${student.username}_CompanyForm`;
		fileType = 'Manual Company Form';
	} else if(filetype === "summerPracticeReport") {
		name = `${student.username}_SummerPracticeReport`;
		fileType = 'Manual Summer Practice Report';
	} else {
		name = `${student.username}_SummerPracticeEvaluationSurvey`;
		fileType = 'Manual Summer Practice Evaluation Survey';
	}

	const file = req.file;
	const applicationId = null;
	const status = "resent";

	await uploadFile(file, applicationId, student, name, fileType, status, Document_model);

	res.status(201).json({ message: "File uploaded successfully" });
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
  	const announcementId = req.params.opportunityId;
  	
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

	const file = req.file;
  	const fileType = "CV";
  	const name = file.originalname;
	const status = null;
	const applicationId = application.id;

	await uploadFile(file, applicationId, student, name, fileType, status, Document_model);

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

	/* I don't know how we will determine the end of the internship. There are two options. 
	First, we can ask the student if it is over, then the student can upload the necessary files. 
	Second, we can determine it by the internship end date that a company set when announcing an opportunity. 
	If we choose the first option there should be a button for it and after the student clicks the button the necessary files 
	should be uploadable. We also need to show different pages to the student for when the internship is over and when it is not.
	We also need to check if admin enter the internship score. */
	/* if company rejects the internship definitly or rejects the summer practice report and gives a feedback, 
	the page should be different too for these options. For the first one there should be a line like "company rejected the internship",
	for the second one there should be a line like "company sent a feedback via your email. Please check your email" */

	const student = await Student_model.findOne({ where: { id: req.user.id }});

	const internship = await Internship_model.findOne({
		where: {
		  studentId: student.id,  // Filter applications by the provided student ID
		},
		include: [
			// we dont need this since we have const student = await Student_model.findOne({ where: { id: req.user.id }});
		  	/*{
				model: Student_model,
				attributes: ['username'] // Fetching only the student name
		  	},*/
		  	{
				model: Application_model,
				include: [
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
	// There shold be the options to upload summer practise report and upload Practice Evaluation Survey at this page.
	// Should we check if the internship is over before the student do these processes?
}));

router.put("/internship",[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
	// when students click the button to end the internship, this router will work

	const { finished, applicationId } = req.body;
	// both are hidden objects at frontend

	if (finished === "finished") {
		await Internship_model.update(
			{
				status: 'finished'
			},
			{
				where: {
					id: applicationId
				}
			}
		);
	}

	res.status(201).json( { message: "Internship is over. Score will be entered later"});

}));

router.post("/internshipFiles/:applicationId", upload.single('file'), [auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
	
	const student = await Student_model.findOne({ where: { id: req.user.id }});

	const applicationId = req.params.applicationId;
	/* We need to use a script as await fetch(/summerPracticeReport/:applicationId"). So we need to send applicationId
	to backend from frontend */
	const { fileType } = req.body;  // either "Summer Practice Evaluation Survey" or "Summer Practice Report"

	const file = req.file;
	const name = file.originalname;
	const status = null;

	await uploadFile(file, applicationId, student, name, fileType, status, Document_model);

	/* when the student uploads the file again, it would be good to ask "are you sure you want to upload 
	the summer practice report again". Also users should be able to see the files they uploaded to check if everything okay.*/

	res.status(201).json({ message: "File is uploaded" });
}));  

// what is this for?
router.get("/download/:studentId/:fileType",[auth,checkUserRole("student")], asyncErrorHandler( async (req, res, next) => {
	const userId = req.params.studentId;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{userId, fileType}});
    if(!takenDocument){
        return res.status(404).json({ error: "Error downloading file" });
    }
    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';
    res.setHeader('Content-Disposition', 'attachment; filename='+encodeURI(filename));
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
}));

module.exports= router;