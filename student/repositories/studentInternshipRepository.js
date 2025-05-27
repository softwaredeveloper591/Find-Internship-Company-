const db = require("../data/db");
const { Op } = require('sequelize');

const getInternship = async (studentId) => {
	const internship = await db.Internship.findOne({
		where: { studentId },
		include: [
			{
				model: db.Application,
				include: [
					{
						model: db.Announcement,
						include: [
							{
								model: db.Company,
								attributes: ['name']
							}
						],
						attributes: ['announcementName']
					}
				]
			},
			{
				model: db.ManualApplication,
				attributes: ['companyName', 'companyEmail']
			}
		]
	});

	if (!internship) {
		return { status: 404, data: null, message: "You don't have an internship" };
	}

	const latestStudentCycle = await db.InternshipFeedback.max('cycleId', {
		where: { internshipId: internship.id, target: 'student' }
	});
	
	// Step 2: Fetch feedbacks for the latest cycleId
	const latestStudentFeedbacks = latestStudentCycle !== null
		? await db.InternshipFeedback.findAll({
			where: {
				internshipId: internship.id,
				target: 'student',
				cycleId: latestStudentCycle
			},
			order: [['createdAt', 'DESC']],
		})
		: [];

	return {
		status: 200,
		data: {
			internship,
			latestStudentFeedbacks
		}
	};
};

const getFiles = async (studentId) => {
	return await db.Document.findAll({
		where: { userId: studentId },
		attributes: ['name', 'fileType']
	});
};

const uploadApplicationForm = async(studentId, document, body) => {
	const internship = await db.Internship.findOne({ where: { studentId }});

	if (internship) {
		return { status: 403, message: "You already have an internship" };
	}

	const transaction = await db.sequelize.transaction(); 
	try {
		const { companyName, companyEmail } = body;

		const manualApplication = await db.ManualApplication.create(
			{ studentId, companyEmail, companyName },
			{ transaction }
		);

		document.manualApplicationId = manualApplication.id;

		const createdDoc = await db.Document.create( document, { transaction });

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

	return { status: 200, message: "Internship marked as finished"};
}

const requestLink = async (studentId) => {
	const internship = await db.Internship.findOne({ 
		where: { studentId, status: 1 } 
	});

	if (!internship) {
		return { status: 403, message: "You are not authorized to request a link or the internship doesn't exist." };
	}

	const existing = await db.CompanyUploadLinkRequest.findOne({ 
		where: {
			internshipId: internship.id,
			studentId,
			status: { [Op.not]: 'Rejected' } // Exclude rejected ones
		}
	});

	if (existing) {
		return { status: 400, message: "You already requested a link." };
	}

	const { companyEmail, companyName } = await db.ManualApplication.findOne({
		where: { id: internship.manualApplicationId },
		attributes: ['companyEmail', 'companyName']
	});

	await db.CompanyUploadLinkRequest.create({
		internshipId: internship.id,
		studentId,
		companyEmail,
		companyName
	});

	// ✅ Add this return for consistency and clarity
	return { status: 200, message: "Link request created successfully." };
};

const uploadFile = async (studentId, document, studentStatus) => {
  	const transaction = await db.sequelize.transaction();

  	try {
  	  	const existingInternship = await db.Internship.findOne({
  	  	  	where: {
  	  	  	  	studentId,
  	  	  	  	status: 1
  	  	  	},
  	  	  	lock: transaction.LOCK.UPDATE, // 🔒 prevent race condition
  	  	  	transaction
  	  	});
	  
  	  	if (!existingInternship) {
  	  	  	await transaction.rollback();
  	  	  	return { status: 403, message: "Your internship hasn't finished yet or you don't have an internship" };
  	  	}
	  
  	  	let existingDoc = null;
	  
  	  	if (existingInternship.manualApplicationId) {
  	  	  	existingDoc = await db.Document.findOne({
  	  	  	  	where: {
  	  	  	  	  	manualApplicationId: existingInternship.manualApplicationId,
  	  	  	  	  	fileType: document.fileType
  	  	  	  	},
  	  	  	  	transaction
  	  	  	});
  	  	} else {
  	  	  	existingDoc = await db.Document.findOne({
  	  	  	  	where: {
  	  	  	  	  	applicationId: existingInternship.applicationId,
  	  	  	  	  	fileType: document.fileType
  	  	  	  	},
  	  	  	  	transaction
  	  	  	});
  	  	}

    	if (existingDoc) {
    	  	await existingDoc.update(
    	  	  	{ data: document.data, name: document.name },
    	  	  	{ transaction }
    	  	);

    	  	let currentStatus = existingInternship.studentStatus;
    	  	let context = existingInternship.feedbackContextStudent;
    	  	const fileType = document.fileType;

    	  	const updateStatusOnFileUpload = (studentStatus, feedbackContextStudent, fileType) => {
    	  	  	switch (feedbackContextStudent) {
    	  	  	  	case "Report":
    	  	  	  	  	if (fileType === "Report") {
    	  	  	  	  	  return studentStatus === 4 ? [6, "Report"] : studentStatus === 5 ? [7, "Report"] : [studentStatus, feedbackContextStudent];
    	  	  	  	  	}
    	  	  	  	  	break;

					case "ReportAfterAdmin":
    					if (fileType === "Report") {
    					  return [7, "ReportAfterAdmin"];
    					}
    					break;

    	  	  	  	case "Survey":
    	  	  	  	  	if (fileType === "Survey") {
    	  	  	  	  	  return [6, "Survey"];
    	  	  	  	  	}
    	  	  	  	  	break;

    	  	  	  	case "Both":
    	  	  	  	  	if (fileType === "Report") {
							if (studentStatus === 5) return [7, "Both"]
							return [studentStatus, "SurveyMissing"];
						}
							
    	  	  	  	  	if (fileType === "Survey") return [studentStatus, "ReportMissing"];
    	  	  	  	  	break;

    	  	  	  	case "SurveyMissing":
    	  	  	  	  	if (fileType === "Survey") {
							if (studentStatus === 5) return [5, "ReportMissing"];
							if (studentStatus === 6) return [3, "Both"];
							return [6, "Both"];
						}	
						if (fileType === "Report") {
							if (studentStatus === 5) return [7, "SurveyMissing"];
						}
    	  	  	  	  	break;

    	  	  	  	case "ReportMissing":
    	  	  	  	  	if (fileType === "Report") {
							if (studentStatus === 5) return [7, "Both"];
							return [6, "Both"];
						}
						
    	  	  	  	  	break;
    	  	  	}

    	  	  	return [studentStatus, feedbackContextStudent];
    	  	};

    	  	[currentStatus, context] = updateStatusOnFileUpload(currentStatus, context, fileType);

			console.log(currentStatus, context);
    	  	await existingInternship.update(
    	  	  	{ studentStatus: currentStatus, feedbackContextStudent: context },
    	  	  	{ transaction }
    	  	);

    	  	await transaction.commit();
    	  	return { status: 200, message: `${document.fileType} has been updated.` };
    	}

    	// Create new doc
    	let docs = [];
    	let createdDoc = null;

    	if (existingInternship.manualApplicationId) {
    	  	document.manualApplicationId = existingInternship.manualApplicationId;
    	  	createdDoc = await db.Document.create(document, { transaction });
    	} else {
    	  	document.applicationId = existingInternship.applicationId;
    	  	createdDoc = await db.Document.create(document, { transaction });

    	  	docs = await db.Document.findAll({
    	  	  	where: {
    	  	  	  	applicationId: existingInternship.applicationId,
    	  	  	  	fileType: {
					  	[Op.in]: ['Report', 'Survey']
					}
    	  	  	},
    	  	  	transaction
    	  	});
    	}

    	const uploadedTypes = docs.map(d => d.fileType);
    	const hasReport = uploadedTypes.includes('Report');
    	const hasSurvey = uploadedTypes.includes('Survey');

    	const newStudentStatus = hasReport && hasSurvey ? 3 : studentStatus;

    	await existingInternship.update(
    	  	{ studentStatus: newStudentStatus },
    	  	{ transaction }
    	);

    	await transaction.commit();
    	return createdDoc;
  	} catch (error) {
    	await transaction.rollback();
    	throw error;
  	}
};

const review = async (studentId, companyId, body) => {
	const internship = await db.Internship.findOne({
		where: { 
			studentId,
			status: 1
		},
		include: {
			model: db.Application,
			include: {
				model: db.Announcement,
				where: { companyId } 
			}
		}
	});

	if(!internship) return { status: 403, message: "You are not allowed to review this company or your internship hasn't finished yet"};

	const { rating, comment } = body;

	await db.Review.create({ studentId, companyId, rating, comment });

	return { status: 200 };
};

module.exports = {
	getInternship,
    getFiles,
	uploadApplicationForm,
	finishInternship,
	requestLink,
	uploadFile,
	review
};