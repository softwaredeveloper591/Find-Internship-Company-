const db = require("../data/db");
const { generateSecureToken } = require('../utils/tokenUtil');
const { Op } = require("sequelize");

const getFile = async (whereClause) => {
	return await db.Document.findOne({ where: whereClause });
}

const getLinkRequests = async () => {
	return await db.CompanyUploadLinkRequest.findAll({ where: { status: "Pending" }});
}

const approveLinkRequest = async (requestId, isApproved) => {
	const request = await db.CompanyUploadLinkRequest.findByPk(requestId, {
		include: [
			{ model: db.Student, attributes: ['email', 'username'] }
		]
	});

	if (!request) return { status: 404, error: "Request not found." };

	if (request.status !== 'Pending') {
		return { status: 400, message: "Request is already approved." };
	}

	const companyEmail = request.companyEmail;
	const companyName = request.companyName;

	if (isApproved) {
		const token = generateSecureToken();
		const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

		await request.update({
			status: "Approved",
			token,
			expiresAt
		});

		return {
			status: 200,
			data: {
				student: request.Student,
				company: { companyEmail, companyName },
				token,
				expiresAt,
				approved: true
			}
		};
	} else {
		await request.update({ status: "Rejected" });

		return {
			status: 200,
			data: {
				student: request.Student,
				approved: false
			}
		};
	}
};

const createLinkRequest = async (request) => {
	const token = generateSecureToken();
	const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

	const requestData = {
		internshipId: request.internshipId,
		studentId: request.studentId,
		status: "Approved",
		token,
		expiresAt,
		companyEmail: request.companyEmail,
		companyName: request.companyName
	}

	await db.CompanyUploadLinkRequest.create(requestData);

	return {
		status: 200,
		data: {
			token,
			expiresAt
		}
	}
}

const getInternships = async () => {
	const internships = await db.Internship.findAll({
		where: {
			studentStatus: {
				[Op.in]: [3, 4, 6, 7]
			},
			companyStatus: {
				[Op.in]: [3, 4, 5]
			},
			isApprovedByDIC: null
		},
		include: [
			{ model: db.Student, attributes: ['id', 'username', 'email', 'year'] },
			{
				model: db.Application,
				include: {
					model: db.Announcement,
					include: {
						model: db.Company,
						attributes: ['name'], 
					},
					attributes: ['announcementName'],
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
				[Op.in]: [3, 4, 6, 7]
			},
			companyStatus: {
				[Op.in]: [3, 4, 5]
			},
			isApprovedByDIC: null
		},
		include: [
			{ model: db.Student, attributes: ['id', 'username', 'email'] },
			{
				model: db.Application,
				include: {
					model: db.Announcement,
					include: {
						model: db.Company,
						attributes: ['name'], 
					},
					attributes: ['announcementName'],
				}
			}
		]
	});

	if (!internship) {
		return { status: 400, data: null, message: "This internship can't be found"};
	}

	const latestStudentFeedbacks = await db.InternshipFeedback.findAll({
	  where: {
		internshipId: id,
		target: 'student',
		cycleId: db.Sequelize.literal(`(
		  SELECT MAX(cycleId) FROM InternshipFeedback 
		  WHERE internshipId = ${id} AND target = 'student'
		)`)
	  },
	  order: [['createdAt', 'ASC']]
	});

	const latestCompanyFeedbacks = await db.InternshipFeedback.findAll({
	  where: {
		internshipId: id,
		target: 'company',
		cycleId: db.Sequelize.literal(`(
		  SELECT MAX(cycleId) FROM InternshipFeedback 
		  WHERE internshipId = ${id} AND target = 'company'
		)`)
	  },
	  order: [['createdAt', 'ASC']]
	});

	return {
		status: 200,
		data: {
			internship,
			latestStudentFeedbacks,
			latestCompanyFeedbacks
		}
	};
}

const evaluateInternship = async (id, status, feedbackToStudent, feedbackToCompany, feedbackContextStudent, feedbackContextCompany) => {
	const internship = await db.Internship.findOne({
		where: {
			id,
			studentStatus: {
				[Op.in]: [3, 4, 6, 7]
			},
			companyStatus: {
				[Op.in]: [3, 4, 5]
			},
			isApprovedByCompany: 1,
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
					include: {
						model: db.Company,
						attributes: ['name', 'email'], 
					},
					attributes: ['announcementName'],
				}
			}
		]
	});

	if (!internship) {
		return { status: 400, message: "This internship can't be found"};
	}

	const linkRequest = await db.CompanyUploadLinkRequest.findOne({
		where: { internshipId: id },
		order: [['createdAt', 'DESC']],
	});

	let companyEmail = null;
	let companyName = null;

	if (internship?.Application?.Announcement?.Company) {
		companyEmail = internship.Application.Announcement.Company.email;
		companyName = internship.Application.Announcement.Company.name;
	} else if (linkRequest) {
		companyEmail = linkRequest.companyEmail;
		companyName = linkRequest.companyName;
	}

	const studentStatus = internship.studentStatus;
	const currentfeedbackContextStudent = internship.feedbackContextStudent;
	const companyStatus = internship.companyStatus;

	let cycleIdStudent = (await db.InternshipFeedback.max('cycleId', {
		where: { internshipId: id, target: 'student', },
		transaction
	})) ?? 0;

	let cycleIdCompany = (await db.InternshipFeedback.max('cycleId', {
		where: { internshipId: id, target: 'company', },
		transaction
	})) ?? 0;

	switch (status) {
		case "Approved":
			await internship.update({ score: 100, isApprovedByDIC: true, status: 2 });
			break;

		case "Rejected":
			await internship.update({ score: 0, isApprovedByDIC: false, feedbackToStudent, status: 3 });
			break;

		case "FeedbackToStudent":
			if (studentStatus === 4 || (studentStatus === 6 && currentfeedbackContextStudent !== "Survey")) {
				return { status: 403, message: "You already gave a feedback to the student" };
			}

			cycleIdStudent += 1;
			await internship.update({ studentStatus: 4, feedbackToStudent, feedbackContextStudent });
			break;

		case "FeedbackToCompany":
			if (companyStatus === 4) {
				return { status: 403, message: "You already gave a feedback to the company" };
			}

			cycleIdCompany += 1;
			await internship.update({ companyStatus: 4, feedbackToCompany, feedbackContextCompany });
			break;

		default:
			return { status: 400, message: "Invalid status" };
	}

	if (typeof feedbackToStudent === "string" && feedbackToStudent.trim().length !== 0) {
		const feedback = { 
			internshipId: id, 
			author: 'admin', 
			target: 'student', 
			context: feedbackContextStudent, 
			content: feedbackToStudent,
			cycleId
		};
		await db.InternshipFeedback.create( feedback, { transaction } );
	}

	if (typeof feedbackToCompany === "string" && feedbackToCompany.trim().length !== 0) {
		const feedback = { 
			internshipId: id, 
			author: 'admin', 
			target: 'company', 
			context: feedbackContextCompany, 
			content: feedbackToCompany,
			cycleId
		};
		await db.InternshipFeedback.create( feedback, { transaction } );
	}

	return {
		status: 200,
		data: {
			student: internship.Student,
			company: { companyName, companyEmail},
			linkRequest	
		}
	};
};

module.exports = {
	getFile,
	getLinkRequests,
	approveLinkRequest,
	createLinkRequest,
	getInternships,
	getInternship,
	evaluateInternship
};