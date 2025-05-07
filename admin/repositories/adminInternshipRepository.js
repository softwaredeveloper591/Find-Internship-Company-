const db = require("../data/db");

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

const approveManualApplications = async (manualApplicationId, isApproved, data) => {
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

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile
};