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
const profileRouter = require("./studentProfileRouter"); 
const internshipRouter = require("./studentInternshipRouter");
const applicationRouter = require("./studentApplicationRouter");
const internshipController = require("../controllers/studentInternshipController");

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

router.get("/internship/download/:fileName", internshipController.downloadFileFromServer);

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

router.get("/studentInfo", asyncErrorHandler(async (req, res, next) => {
	const studentId = req.user.id;

	const studentInfo = await db.StudentInfo.findOne( { where: { studentId }});

	return res.status(200).json({ studentInfo });
}));

router.post("/studentInfo", asyncErrorHandler(async (req, res, next) => {
	const id = req.user.id;
    const body = { studentId: id, ...req.body }; // Merge user ID with request body

    await db.StudentInfo.create(body);

    return res.status(200).json({ message: "Student info created successfully." });
}));

router.put("/studentInfo", asyncErrorHandler(async (req, res, next) => {
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

/*router.get("/opportunities", asyncErrorHandler(async (req, res, next) => {

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
}));*/

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