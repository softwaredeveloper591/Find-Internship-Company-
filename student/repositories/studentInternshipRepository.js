const db = require("../data/db");

const getInternship = async (studentId) => {
	return await db.Internship.findOne({
		where: { studentId },
		include: {
		  	model: db.Application,
		  	include: {
				model: db.Announcement,
				include: {
				  model: db.Company,
				  attributes: ['name'], // only fetch company name
				},
				attributes: ['announcementName'], // only fetch announcement name
		  	}
		}
	});
};

const getFiles = async (studentId) => {
	return await db.Document.findAll({
		where: { userId: studentId },
		attributes: ['name', 'fileType']
	});
};

const uploadApplicationForm = async(studentId, document) => {
	const existingInternship = await db.Internship.findOne({ where: { studentId }});

	if (existingInternship) {
		return { status: 403, message: "You already have an internship" };
	}

	const transaction = await db.sequelize.transaction(); 
	try {
		const student = await db.Student.findByPk(studentId, { transaction });

		const manualApplication = await db.ManualApplication.create(
			{ studentId },
			{ transaction }
		);

		document.manualApplicationId = manualApplication.id;
		document.username = student.username;
		document.userId = studentId;

		const createdDoc = await db.Document.create(document, { transaction });

		await transaction.commit(); // ✅ Commit if all succeeds
		return createdDoc;

	} catch (error) {
		await transaction.rollback(); // ❌ Rollback on error
		throw error;
	}
};

const finishInternship = async (studentId) => {
	const isAlreadyFinished = await db.Internship.findOne( { where: { studentId, status: 1 }});

	if (isAlreadyFinished) {
		return { status: 403, message: "You already marked the internship as finished" };
	}

	const internship = await db.Internship.findOne({ where: { studentId } });

	if (!internship) {
		return { status: 403, message: "You are not authorized to finish this internship or it doesn't exist." };
	}

	// Proceed with updating the status to 'Finished'
	await db.Internship.update(
		{ status: 1 },
		{ where: { studentId } }
	);
}

const requestLink = async (studentId, companyEmail) => {
	const internship = await db.Internship.findOne({ where: { studentId }});

	if (!internship) {
		return { status: 403, message: "You are not authorized to request a link or the internship doesn't exist." };
	}

	const existing = await db.CompanyUploadLinkRequest.findOne({ 
		where: { internshipId: internship.id, studentId }
	});
	
	if (existing) {
		return { status: 400, message: "You already requested a link." };
	}

	await db.CompanyUploadLinkRequest.create( { internshipId: internship.id, studentId, companyEmail });
}

const uploadFile = async(studentId, document, internshipStatus) => {
	const existingInternship = await db.Internship.findOne({ where: { studentId, status: 1 }});

	if (!existingInternship) {
		return { status: 403, message: "Your internship hasen't finished yet" };
	}

	// Check if a document of the same fileType already exists
	const existingDoc = await db.Document.findOne({
		where: {
			userId: studentId,
			fileType: document.fileType
		}
	});

	if (existingDoc) {
		return { status: 400, message: `You have already uploaded a ${document.fileType}.` };
	}

	const transaction = await db.sequelize.transaction(); 
	try {
		const student = await db.Student.findByPk(studentId, { transaction });

		document.applicationId = existingInternship.applicationId;;
		document.username = student.username;
		document.userId = studentId;

		const createdDoc = await db.Document.create(document, { transaction });

		// After current document is uploaded, check if both Report and Survey exist
		const fileTypesToCheck = ['Report', 'Survey'];
		const docs = await db.Document.findAll({
			where: {
				userId: studentId,
				fileType: fileTypesToCheck
			},
			transaction
		});

		const uploadedTypes = docs.map(d => d.fileType);
		const hasReport = uploadedTypes.includes('Report');
		const hasSurvey = uploadedTypes.includes('Survey');

		const newStatus = hasReport && hasSurvey ? 4 : internshipStatus;

		await db.Internship.update(
			{ status: newStatus },
			{ where: { id: existingInternship.id }, transaction }
		);

		await transaction.commit(); // ✅ Commit if all succeeds
		return createdDoc;

	} catch (error) {
		await transaction.rollback(); // ❌ Rollback on error
		throw error;
	}
};

module.exports = {
	getInternship,
    getFiles,
	uploadApplicationForm,
	finishInternship,
	requestLink,
	uploadFile
};