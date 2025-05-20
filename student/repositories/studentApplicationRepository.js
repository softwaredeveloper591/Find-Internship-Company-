const db = require("../data/db");
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const path = require('path');
const AdmZip = require("adm-zip");
const { Sequelize } = require('sequelize');

const createStudentInfo = async (body) => {
	await db.StudentInfo.create(body);

	return { status: 201, message: "Student info created successfully."};
};

const updateStudentInfo = async (studentId, updates) => {
	// Update only the changed fields
	const [updated] = await db.StudentInfo.update(updates, {
		where: { studentId }
	});

	if (updated) {
		return { status: 200, message: "Student info updated successfully."};
	} else {
		return { status: 404, message: "No record found to update."};
	}
}

const getOpportunities = async (studentId) => {
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
                    WHERE studentId = ${studentId}
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
		...announcement.dataValues
	}));
	
	return formattedAnnouncements;
};

const getOpportunitiesSkills = async (studentId) => {
	const now = moment.tz('Europe/Istanbul').toDate();

	// Get student skill IDs
	const studentSkills = await db.StudentSkill.findAll({
		where: { studentId },
		attributes: ['skillId']
	});
	const skillIds = studentSkills.map(s => s.skillId);

	if (skillIds.length === 0) {
		return []; // No skills, no matches
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
		...a.dataValues
	}));

	return formattedAnnouncements;
};

const getOneOpportunity = async (studentId, announcementId) => {

	const now = moment.tz('Europe/Istanbul').toDate(); 

	const applications = await db.Application.findAll({ where: { announcementId, studentId } })

	let announcement;
	
	const isApplied = (applications.length != 0);
	
	if (isApplied) {
		announcement = await db.Announcement.findOne({
			where: { id: announcementId },
			include: [{ model: db.Company, attributes: ['name'] }]
		});
	}
	else {
		announcement = await db.Announcement.findOne({
			where: {
				id: announcementId,
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

	if (!announcement) return { status: 400, message: "There is no available announcement you are allowed to see."};

	const timeDifference = announcement.endDate - now;
	const remainingSeconds = Math.floor(timeDifference / 1000);
	
	const formattedAnnouncement = {
		...announcement.dataValues,
		remainingSeconds,
		isApplied: !!isApplied
	};
	return formattedAnnouncement;
};

const applyToAnnouncement = async (studentId, announcementId, document) => {
	const student = await db.Student.findOne({ where: { id: studentId } });
  
	const isApplied = await db.Application.findOne({ where: { announcementId, studentId } });

	if (isApplied) return { status: 409, message: "Already applied to this announcement"};
	
	const studentInfo = await db.StudentInfo.findOne( { where: studentId });

	if (!studentInfo) return { status: 403, message: "You need to fill the student info before applying to an announcement"};

	const templatePath = path.join(__dirname, '../files', 'ApplicationForm.docx');
	const createFilledDocument = async () => {
		const zip = new AdmZip(templatePath);
		const docxTemplate = zip.readAsText("word/document.xml");
		const filledDocx = docxTemplate
			.replace(/«name»/g, student.username)
			.replace(/«studentClass»/g, studentInfo.year)
			.replace(/«studentNumber»/g, studentInfo.studentNo)
			.replace(/«tcNo»/g, studentInfo.tc)
			.replace(/«user_phone»/g, studentInfo.studentPhone)
			.replace(/«relative_phone»/g, studentInfo.relativePhone)
			.replace(/«email»/g, studentInfo.email);
		zip.updateFile("word/document.xml", Buffer.from(filledDocx, "utf-8"));
		return zip.toBuffer();
	};

	bufferedApplicationForm = await createFilledDocument();

	const application = await db.Application.create({
		studentId,
		announcementId
	});

	await db.Document.create({
		name: "ApplicationForm.docx",
		applicationId: application.id,
		data: bufferedApplicationForm,
		fileType: 'ApplicationForm',
		username: student.username
	});

	document.applicationId = application.id;

	await db.Document.create(document);

	return { status: 200, message: "Succesfully applied" };
};

const getApplications = async (studentId) => {	
	const applications = await db.Application.findAll({
		where: {
			studentId  // Filter applications by the provided student ID
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
						attributes: ['name'] // Fetching the company name
					}
				]
			}
		]
	});

	return applications;
}

module.exports = {
	createStudentInfo,
	updateStudentInfo,
	getOpportunities,
	getOpportunitiesSkills,
	getOneOpportunity,
	applyToAnnouncement,
	getApplications
};