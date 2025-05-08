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
	const request = await db.CompanyUploadLinkRequest.findByPk(requestId);

	if (!request) {
		return { status: 404, message: "Request not found." };
	}

	const existingRequest = await db.CompanyUploadLinkRequest.findOne({
		where: {
			id: requestId, 
			status: 'Approved'
		}
	});
	
	if (existingRequest) {
		return { status: 400, message: "Request is already approved." };
	}

	if (isApproved) {
		const token = generateSecureToken(); // from crypto

    	await db.CompanyUploadLinkRequest.update(
			{
    	    	status: "Approved",
    	    	token,
    	    	expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    		}, 
			{ where: { id: requestId }}
		);
	}
	else {
		await db.CompanyUploadLinkRequest.update(
			{
    	    	status: "Rejected",
    		}, 
			{ where: { id: requestId }}
		);
	}
}

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile,
	getLinkRequests,
	approveLinkRequest
};