const db = require("../data/db");
const { Op } = require('sequelize');

const getApplications = async () => {
	const applications = await db.Application.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: null,
			status: 1
		},
		include: [
			{
				model: db.Announcement,
				include: {
					model: db.Company,
					attributes: ['name']
				}
			},
			{
				model: db.Student,
				attributes: ['username', 'id'] 
			}
		]
	});

	const manualApplications = await db.ManualApplication.findAll({
		where: {
			isApprovedByDIC: null,
			status: 1
		},
		include: [
			{
				model: db.Student,
				attributes: ['username', 'id'] 
			}
		]
	})

	return { applications, manualApplications };
};

const getApplication = async (id) => {
	const application = await db.Application.findOne({
		where: {
			id,
			status: 1
		},
		include: [
			{
				model: db.Announcement,
				include: {
					model: db.Company,
					attributes: ['name']
				}
			},
			{
				model: db.Student,
				attributes: ['username', 'id']
			}
		]
	});

	return application;
};

const getManualApplication = async (id) => {
	const application = await db.ManualApplication.findOne({ 
		where: { 
			id,
			status: 1
		},
		include: [
			{
				model: db.Student,
				attributes: ['username', 'id']
			}
		]
	});

	return application;
};

const getFile = async (whereClause) => {
	return await db.Document.findOne( { where: whereClause });
};

const evaluateApplication = async (applicationId, isApproved, data) => {
	const transaction = await db.sequelize.transaction();

	const application = await db.Application.findOne({
		where: { 
			id: applicationId,
			status: 1
		},
		include: [
			{
				model: db.Student,
				attributes: ['username', 'email', 'studentId']
			},
			{
				model: db.Announcement,
				include: [{ model: db.Company }],
				attributes: ['announcementName']
			}
		],
		transaction
	});

	if (!application) {
		await transaction.rollback();
		return { status: 404, message: "Application not found" };
	}

	const internship = await db.Internship.findOne( { where: { studentId: application.studentId }});
	
	if (internship) {
		return { status: 400, message: "This student already has an internship"}
	}
	
	const isAlreadyChecked = await db.Application.findOne({
		where: {
			id: applicationId, // replace with the actual application ID
			isApprovedByDIC: {
				[db.Sequelize.Op.not]: null
			},
			status: { [Op.ne]: 1 }
		}
	});
	  
	if (isAlreadyChecked) {
		return { status: 403, message: "You already checked this application" };
	}

	try {
		if (isApproved === "true") {
			application.isApprovedByDIC = true;
			application.status = 2;

			await db.Document.update(
				data,
				{
					where: {
						applicationId,
						fileType: "UpdatedApplicationForm"
					},
					transaction
				}
			);
		} else {
			application.isApprovedByDIC = false;
			application.status = 4;
		}

		await application.save({ transaction });

		await transaction.commit();

		return {
			status: 200,
			data: {
				studentEmail: application.Student.email,
				studentName: application.Student.username,
				announcementName: application.Announcement.announcementName
			},
			message: isApproved === "true" ? "Application approved" : "Application rejected"
		};
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

const evaluateManualApplications = async (manualApplicationId, isApproved, data) => {
	const transaction = await db.sequelize.transaction();

	const application = await db.ManualApplication.findOne({
		where: { 
			id: manualApplicationId,
			status: 1
		},
		include: [
			{
				model: db.Student,
				attributes: ['username', 'email']
			}
		],
		transaction
	});

	if (!application) {
		await transaction.rollback();
		return { status: 404, message: "Application not found" };
	}

	const internship = await db.Internship.findOne({ where: { studentId: application.studentId } });

	if (internship) {
		return { status: 400, message: "This student already has an internship" };
	}

	const isAlreadyChecked = await db.ManualApplication.findOne({
		where: {
			id: manualApplicationId,
			isApprovedByDIC: { [db.Sequelize.Op.not]: null },
			status: 3
		}
	});

	if (isAlreadyChecked) {
		return { status: 403, message: "You already checked this application" };
	}
	
	try {
		if (isApproved) {
			application.isApprovedByDIC = true;
			application.status = 2;

			await db.Document.update(
				data,
				{
					where: {
						manualApplicationId,
						fileType: "ManualApplicationForm"
					},
					transaction
				}
			);
		} else {
			application.isApprovedByDIC = false;
			application.status = 4;
		}

		await application.save({ transaction });

		await transaction.commit();

		return {
			status: 200,
			data: {
				studentEmail: application.Student.email,
				studentName: application.Student.username,
			},
			message: isApproved ? "Application approved" : "Application rejected"
		};
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

module.exports = {
	getApplications,
	getApplication,
	getManualApplication,
	getFile,
	evaluateApplication,
	evaluateManualApplications
}