const db = require("../data/db");
const { generateSecureToken } = require('../utils/tokenUtil');

const getManualApplications = async (adminId) => {

	const admin = await db.Admin.findOne({
		where: { id: adminId },
		attributes: { exclude: ['password'] }
	});

	if (!admin) {
		return { status: 400, message: 'Admin not found' } ;
	}

	const manualApplications = await db.ManualApplication.findAll({
		where: {
			isApprovedByDIC: null
		},
		include: [
			{
				model: db.Student,
				attributes: ['username', 'id']
			}
		]
	});

	return manualApplications;
};

const approveManualApplications = async (manualApplicationId, studentId, isApproved, data) => {
	const hasInternship = await db.Internship.findOne( { where: { studentId }});

	if (hasInternship) {
		return { status: 400, message: "This student already has an internship"}
	}
	
	const isAlreadyChecked = await db.ManualApplication.findOne({
		where: {
		  	id: manualApplicationId, // replace with the actual application ID
		  	isApprovedByDIC: {
				[db.Sequelize.Op.not]: null
		  	}
		}
	});
	  
	if (isAlreadyChecked) {
		return { status: 400, message: "You already checked this application" };
	}

	if (isApproved) {
		const transaction = await db.sequelize.transaction();
		try {
			await db.Document.update(
				{ data, status:"UpdatedByAdmin" }, 
				{ where: {manualApplicationId, fileType: "ManualApplicationForm"}, transaction }
			);
			await db.ManualApplication.update(
				{ isApprovedByDIC: true, status: 1 }, 
				{ where: {id: manualApplicationId }, transaction }
			);

			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
		    throw error;
		}
	}
}

const downloadFile = async (whereClause) => {
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
				company: request.Company,
				approved: false
			}
		};
	}
};

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile,
	getLinkRequests,
	approveLinkRequest
};