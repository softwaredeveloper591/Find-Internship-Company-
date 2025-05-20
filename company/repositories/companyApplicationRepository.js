const db = require("../data/db");
const moment = require('moment-timezone');

const postAnnouncement = async (skillIds, announcementData) => {
	const transaction = await db.sequelize.transaction();
	try {
		if (!moment(announcementData.startDate).isBefore(announcementData.endDate)) {
  			throw new Error("Start date must be before end date");
		}

		const announcement = await db.Announcement.create(announcementData, { transaction });

		if (skillIds.length > 0) {
			const announcementSkills = skillIds.map(skillId => ({
				announcementId: announcement.id,
				skillId,
			}));

			await db.AnnouncementSkill.bulkCreate(announcementSkills, { transaction });
		}

		await transaction.commit();

		return { status: 201, message: "Announcement published successfully"};
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

const getAnnouncements = async (companyId) => {
	const announcements = await db.Announcement.findAll({
		where:{ companyId },
		attributes: {exclude:['companyId', 'status']}
	});
	
	return announcements;
};

const getAnnouncement = async (companyId, announcementId) => {
	const announcement = await db.Announcement.findOne({
		where: { id: announcementId, companyId },
		include: [
			{
				model: db.Skill,
				as: 'skillId_Skills', // Make sure this matches your association alias
				through: { attributes: [] }, // hide join table columns
				attributes: ['id', 'name'], // customize skill fields if needed
			}
		]
	});

	if (!announcement) return { status: 403, message: "You are not allowed to see this announcement or it doesn't exist"}

	const formattedAnnouncement = {
		...announcement.dataValues,
		formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD MM YYYY')
	};
	
	return formattedAnnouncement;
};

const updateAnnouncement = async (companyId, announcementId, skillIds, announcementData) => {
	const transaction = await db.sequelize.transaction();
  	try {
  	  	// Step 1: Update Announcement only if it belongs to company
  	  	const [updatedCount] = await db.Announcement.update(announcementData, {
  	  	  	where: {
  	  	  	  	id: announcementId,
  	  	  	  	companyId
  	  	  	},
  	  	  	transaction
  	  	});
	  
  	  	if (updatedCount === 0) {
  	  	  	await transaction.rollback();
  	  	  	return { status: 404, message: "Announcement not found or not authorized" };
  	  	}
	  
  	  	// Step 2: Update AnnouncementSkill relations if skillIds provided
  	  	if (Array.isArray(skillIds)) {
  	  	  	// Fetch current skills of this announcement
  	  	  	const existingSkills = await db.AnnouncementSkill.findAll({
  	  	  	  	where: { announcementId },
  	  	  	  	attributes: ['skillId'],
  	  	  	  	transaction
  	  	  	});
  	  	  	const existingSkillIds = existingSkills.map(s => s.skillId);
		  
  	  	  	// Skills to add: skillIds that are not in existingSkillIds
  	  	  	const skillsToAdd = skillIds.filter(id => !existingSkillIds.includes(id));
		  
  	  	  	// Skills to remove: existingSkillIds that are not in skillIds
  	  	  	const skillsToRemove = existingSkillIds.filter(id => !skillIds.includes(id));
		  
  	  	  	// Delete removed skills
  	  	  	if (skillsToRemove.length > 0) {
  	  	  	  	await db.AnnouncementSkill.destroy({
  	  	  	  	  	where: {
  	  	  	  	  	  	announcementId,
  	  	  	  	  	  	skillId: skillsToRemove
  	  	  	  	  	},
  	  	  	  	  	transaction
  	  	  	  	});
  	  	  	}
		  
  	  	  	// Add new skills
  	  	  	if (skillsToAdd.length > 0) {
  	  	  	  	const newAnnouncementSkills = skillsToAdd.map(skillId => ({
  	  	  	  	  	announcementId,
  	  	  	  	  	skillId
  	  	  	  	}));
  	  	  	  	await db.AnnouncementSkill.bulkCreate(newAnnouncementSkills, { transaction });
  	  	  	}
  	  	}
	  
  	  	await transaction.commit();	  
  	  	return { status: 200, message: "Announcement updated successfully" };
  	} catch (error) {
  	  	await transaction.rollback();
  	  	throw error;
  	}
};

const getApplications = async (companyId) => {
	const applications = await db.Application.findAll({
		where: {
			isApprovedByCompany: null,
		},
		include: [
			{
				model: db.Announcement,
				where: { companyId },
				attributes: ['announcementName']
			},
			{
				model: db.Student,
				attributes: ['username', 'id', 'year']
			}
		]
	});

	return applications;
};

const getApplication = async (companyId, applicationId) => {
	const application = await db.Application.findOne({
		where: {
			id: applicationId
		},
		include: [
			{
				model: db.Announcement,
				where: { companyId },
				attributes: ['announcementName']
			},
			{
				model: db.Student,
				attributes: ['username']
			}
		]
	});

	return application;
};

const fillApplicationForm = async (companyId, applicationId, body) => {
	let { internStartDate, internEndDate, internDuration, dutyAndTitle, workOnSaturday, workOnHoliday, day, sgk } = body;
	let y1,n1,y2,n2,y3,n3;

	const document = await db.Document.findOne({
		where: { applicationId, fileType: "ApplicationForm" },
		include: {
			model: db.Application,
			include: [
				{
					model: db.Announcement,
					where: {
						companyId
					},
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

	if (!document) return { status: 403, message: "You are not allowed to fill this form or form doesn't exist."}

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
	const updatedApplicationForm = await db.Document.findOne({where: {applicationId, fileType: "UpdatedApplicationForm"}});

	if (updatedApplicationForm === null) {
		await db.Document.create({
			name:`${document.Application.Student.username}_ApplicationForm.docx`,
			applicationId,
			data: updatedDocxBuffer,
			fileType: "UpdatedApplicationForm"
		});
	}
	else {
		await db.Document.update({ data: updatedDocxBuffer }, { where: { applicationId, fileType: "UpdatedApplicationForm" } });   
	}
	
	return { status: 201, message: "Application form filled successfully"};
};

const uploadApplicationForm = async (companyId, applicationId, document, body) => {
	const { isApproved } = body;

	const transaction = await db.sequelize.transaction();
	try {
		const application = await db.Application.findOne({
			where: { id: applicationId },
			include: [
				{
					model: db.Student,
					attributes: ['username', 'email']
				},
				{
					model: db.Announcement,
					where: { companyId },
					attributes: ['announcementName', 'companyId']
				}
			],
			transaction
		});

		if (!application) {
			await transaction.rollback();
			return { status: 403, message: "You are not allowed to upload form or application doesn't exist" };
		}

		await db.Document.update({
			data: document.data,
			name: document.name
		}, {
			where: {
				applicationId,
				fileType: "UpdatedApplicationForm"
			},
			transaction
		});

		if (isApproved === "true") {
			application.isApprovedByCompany = true;
			application.status = 1; // Consider replacing this with a named constant
		} else {
			application.isApprovedByCompany = false;
			application.status = 4;
		}

		await application.save({ transaction });
		await transaction.commit();

		return {
			status: 200,
			data: {
				application,
				message: isApproved === "true" ? "Application approved" : "Application rejected"
			}
		};

	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

const downloadFile = async (whereClause) => {
	return await db.Document.findOne( { where: whereClause });
};

module.exports = {
	postAnnouncement,
	getAnnouncements,
	getAnnouncement,
	updateAnnouncement,
	getApplications,
	getApplication,
	fillApplicationForm,
	uploadApplicationForm,
	downloadFile
}