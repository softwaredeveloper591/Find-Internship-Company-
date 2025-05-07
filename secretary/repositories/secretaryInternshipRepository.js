const db = require("../data/db");

const getManualApplications = async (secretaryId) => {

	const secretary = await db.Secretary.findOne({
		where: { id: secretaryId },
		attributes: { exclude: ['password'] }
	});

	if (!secretary) {
		return { status: 400, message: 'Secretary not found' } ;
	}

	const manualApplications = await db.ManualApplication.findAll({
		where: {
			isApprovedByDIC: true,
			isSentBySecretary: null
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

const approveManualApplications = async (manualApplicationId, isApproved, documentData) => {
	const isAlreadyChecked = await db.ManualApplication.findOne({
		where: {
			id: manualApplicationId, 
			isApprovedByDIC: true,
			isSentBySecretary: {
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
			const manualApplication = await db.ManualApplication.findOne({
				where: { id: manualApplicationId },
				transaction
			});

			if (!manualApplication) {
				await transaction.rollback();
				return { status: 404, message: "Manual application not found." };
			}

			const studentId = manualApplication.studentId;

			// Mark other applications (both Application and ManualApplication) as '5' (not available)
			await db.Application.update(
				{ status: 5 },
				{ where: { studentId, status: { [db.Sequelize.Op.ne]: 5 } }, transaction }
			);

			await db.ManualApplication.update(
				{ status: 5 },
				{ where: { studentId, id: { [db.Sequelize.Op.ne]: manualApplicationId }, status: { [db.Sequelize.Op.ne]: 5 } }, transaction }
			);

		    await db.Document.create(documentData, { transaction });
				
		    await db.Internship.create({ manualApplicationId, studentId }, { transaction });
				
		    await db.ManualApplication.update(
		        { isSentBySecretary: true, status: 2 },
		        { where: { id: manualApplicationId }, transaction }
		    );
		
		    await transaction.commit();
		} catch (error) {
		    await transaction.rollback();
		    throw error;
		}
	}
}

module.exports = {
	getManualApplications,
	approveManualApplications
};