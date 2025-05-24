const db = require("../data/db");
const { Op } = require("sequelize");

const getUploadPage = async (token) => {
	return await db.CompanyUploadLinkRequest.findOne({
		where: { token, status: "Approved" }
	});
}

const saveFiles = async (token, files) => {
	const request = await db.CompanyUploadLinkRequest.findOne({
		where: { token, status: "Approved" },
		include: [
			{ model: db.Student, attributes: ['email', 'username'] }
		]
	});

    if (!request || new Date() > request.expiresAt) {
        return { status: 403, message: "Invalid or expired token." };
    }

	const internship = await db.Internship.findOne( { where: { id: request.internshipId }});

	if (!internship) {
		return { status: 404, message: "Internship not found." };
	}

    const manualReport = files.manualReport[0].buffer;
    const manualForm = files.manualForm[0].buffer;

	const companyName = request.companyName;

    const transaction = await db.sequelize.transaction();
		try {
			const existingReport = await db.Document.findOne({
				where: { manualApplicationId, fileType: "Report" },
				transaction
			});

			if (existingReport) {
				await existingReport.update({
					name: files.manualReport[0].originalname,
					data: manualReport
				}, { transaction });
			} else {
				await db.Document.create({
					manualApplicationId,
					fileType: "Report",
					name: files.manualReport[0].originalname,
					data: manualReport
				}, { transaction });
			}
			
			const existingForm = await db.Document.findOne({
				where: { manualApplicationId, fileType: "CompanyForm" },
				transaction
			});

			if (existingForm) {
				await existingForm.update({
					name: files.manualForm[0].originalname,
					data: manualForm
				}, { transaction });
			} else {
				await db.Document.create({
					manualApplicationId,
					fileType: "CompanyForm",
					name: files.manualForm[0].originalname,
					data: manualForm
				}, { transaction });
			}

			await db.CompanyUploadLinkRequest.update (
			  	{ status: "Completed" },
			  	{ where: { id: request.id }, transaction }
			);

			await db.Internship.update (
				{ isApprovedByCompany: true, companyStatus: 3 },
				{ where: { id: internship.id }, transaction }
			);

			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
			throw error;
		}

    return { status: 200, data: { student: request.Student, companyName}};
}

const getInternships = async (companyId) => {
	const internships = await db.Internship.findAll({
		where: {
			studentStatus: {
				[Op.in]: [1, 3, 4, 5, 6, 7]
			},
			status: 1
		},
		include: [
			{ 
				model: db.Student, 
				attributes: ['id', 'username', 'email', 'year'] 
			},
			{
				model: db.Application,
				include: {
					model: db.Announcement,
					where: {
						companyId
					},
					attributes: ['announcementName']
				}
			}
		]
	});

	if (internships.length === 0) {
		return { status: 400, message: "No internship found" };
	}

	return internships;
};

const getInternship = async (id) => {
	const internship = await db.Internship.findOne({
		where: {
			id,
			studentStatus: {
				[Op.in]: [1, 3, 4, 5, 6, 7]
			},
			status: 1
		},
		include: [
			{ model: db.Student, attributes: ['id', 'username', 'email'] },
			{
				model: db.Application,
				include: {
					model: db.Announcement,
					attributes: ['announcementName'],
				}
			}
		]
	});

	if (!internship) {
		return {
			status: 400,
			data: null,
			message: "This internship can't be found"
		};
	}

	const applicationId = internship.Application?.id;

	const document = await db.Document.findOne({
		where: { applicationId, fileType: "Report" },
		attributes: ['id']
	});

	return {
		status: 200,
		data: {
			internship,
			documentId: document?.id || null
		}
	};
};

const uploadCompanyForm = async(internshipId, document) => {
	const transaction = await db.sequelize.transaction();

	try {
		const existingInternship = await db.Internship.findOne({
			where: {
				id: internshipId,
				status: 1
			},
			lock: transaction.LOCK.UPDATE, // 🔒 prevent race condition,
			transaction
		});

		if (!existingInternship) {
			await transaction.rollback();
			return { status: 403, message: "Student's internship hasn't finished yet or student doesn't have an internship" };
		}

		const student = await db.Student.findOne( {
			where: { id: existingInternship.studentId },
			transaction
		});

		if(!student) {
			await transaction.rollback();
			return { status: 403, message: "No student can be found that is the owner of this internship" };
		}

		// Check if a document of the same fileType already exists
		const existingDoc = await db.Document.findOne({
			where: {
				userId: student.id,
				fileType: document.fileType
			},
			transaction
		});

		if (existingDoc) { 
			await existingDoc.update(
				{ data: document.data },
				{ transaction }
			);

			let companyStatus = existingInternship.companyStatus;
			let feedbackContextCompany = existingInternship.feedbackContextCompany;
			const fileType = document.fileType;

			// Helper function
			const updateCompanyStatusOnFileUpload = (companyStatus, feedbackContextCompany, fileType) => {
			  switch (feedbackContextCompany) {
			    case "CompanyForm":
			      if (fileType === "CompanyForm") {
			        return [5, null];
			      }
			      break;
			  }
		  
			  return [companyStatus, feedbackContextCompany]; // default fallback
			};

			[companyStatus, feedbackContextCompany] = updateCompanyStatusOnFileUpload(companyStatus, feedbackContextCompany, fileType);

			await existingInternship.update(
				{ companyStatus, feedbackContextCompany },
				{ transaction }
			);

			await transaction.commit();
			return { status: 200, message: `${document.fileType} has been updated.` };
		} else {
			if (existingInternship.manualApplicationId) {
				document.manualApplicationId = existingInternship.manualApplicationId;
			} else {
				document.applicationId = existingInternship.applicationId;
			}

			document.username = student.username;
			document.userId = student.id;

			await db.Document.create(document, { transaction });

			let newCompanyStatus = existingInternship.companyStatus;

			if (existingInternship.companyStatus === 1) {
				newCompanyStatus = 3; // Report already approved, now CompanyForm uploaded
			} else {
				newCompanyStatus = 2; // Only CompanyForm uploaded
			}
		
			await existingInternship.update({ companyStatus: newCompanyStatus }, { transaction });

			await transaction.commit();
			return { status: 201, message: "Document uploaded successfully." };
		}
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

const evaluateInternship = async (id, status, feedbackToStudent, feedbackContextStudent) => {
	const internship = await db.Internship.findOne({
		where: {
			id,
			studentStatus: {
				[Op.in]: [1, 3, 4, 5, 6, 7]
			},
			isApprovedByDIC: null
		},
		include: [
			{ 
				model: db.Student, 
				attributes: ['id', 'username', 'email'] 
			},
			{
				model: db.Application,
				include: {
					model: db.Announcement,
					attributes: ['announcementName'],
				}
			}
		]
	});

	if (!internship) {
		return { status: 400, message: "This internship can't be found"};
	}

	let studentStatus = internship.studentStatus;
	let previousFeedbackContextStudent = internship.feedbackContextStudent;

	// Helper function
	const updateCompanyStatusOnFileUpload = (status, studentStatus, previousFeedbackContextStudent) => {
	  switch (previousFeedbackContextStudent) {
	    case "SurveyMissing":
	      if (status === "Approved") {
	        return [6, "SurveyMissing"];
	      }
	      break;

		case "Both":
		  if (status === "Approved") {
		    if (studentStatus === 6) return [7, "Both"];
		  }
		  break;

		case "Report":
  		  if (status === "Approved") {
  		    if (studentStatus === 7) return [3, null];
  		    if (studentStatus === 6) return [3, "Report"];
  		  }
  		  break;

	  }
	
	  return [studentStatus, previousFeedbackContextStudent]; // default fallback
	}

	[studentStatus, previousFeedbackContextStudent] = updateCompanyStatusOnFileUpload(status, studentStatus, previousFeedbackContextStudent);

	await internship.update(
		{ studentStatus, feedbackContextStudent: previousFeedbackContextStudent }
	);

	switch (status) {
		case "Approved":
			if (previousFeedbackContextStudent === null) {
				if (internship.companyStatus === 1) {
					return { status: 403, message: "You already approved this report"};
				} else if(internship.companyStatus === 2) {
					await internship.update({ companyStatus: 3 });
				} else {
					await internship.update({ companyStatus: 1 });
				}
			}
			break;

		case "FeedbackToStudent":
			if (studentStatus === 5 || studentStatus === 7) {
				return { status: 403, message: "You already gave a feedback to the student" };
			} else if (studentStatus === 4 || studentStatus === 6) {
				return { status: 403, message: "Admin gave a feedback to the student" };
			}
			await internship.update({ studentStatus: 5, feedbackToStudent, feedbackContextStudent });
			break;

		default:
			return { status: 400, message: "Invalid status" };
	}

	return {
		status: 200,
		data: {
			student: internship.Student
		}
	};
};

module.exports = {
	getUploadPage,
	saveFiles,
	getInternships,
	getInternship,
	uploadCompanyForm,
	evaluateInternship
}