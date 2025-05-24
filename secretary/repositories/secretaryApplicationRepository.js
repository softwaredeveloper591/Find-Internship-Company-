const db = require("../data/db");
const { Op } = require('sequelize');

const getApplications = async (id) => {
	const secretary = await db.Secretary.findOne({ where: { id }, attributes: { exclude: ['password'] } });
	const applications = await db.Application.findAll({
		where: {
			isApprovedByCompany: true,
			isApprovedByDIC: true,
			isSentBySecretary: null,
			status: 2
		},
		include: [
			{
				model: db.Announcement,
				include: {
					model: db.Company,
					attributes: ['name'],
					include: {
						model: db.CompanyProfile,
						attributes: ['companyLogo']
					}
				}
			},
			{
				model: db.Student,
				attributes: ['username']['id']
			}
		]
	});

	const manualApplications = await db.ManualApplication.findAll({
		where: {
			isApprovedByDIC: true,
			isSentBySecretary: null,
			status: 2 
		},
		include: [
			{
				model: db.Student,
				attributes: ['username']['id']
			}
		]
	})

	return { dataValues: secretary.dataValues, applications, manualApplications };
};

const getFile = async (whereClause) => {
	return await db.Document.findOne( { where: whereClause });
};

const evaluateApplication = async (id, document) => {
	const transaction = await db.sequelize.transaction();

	try {
		const internship = await db.Internship.findOne({
			where: { applicationId: id },
			transaction
		});

		if (internship) {
			await transaction.rollback();
			return { status: 403, message: "This student already has an internship" };
		}

		const application = await db.Application.findOne({
			where: { id, status: 2 },
			include: [
				{
					model: db.Student,
					attributes: ['email', 'username']
				},
				{
					model: db.Announcement,
					attributes: ['announcementName'],
					include: [
						{
							model: db.Company,
							attributes: ['email', 'name']
						}
					]
				}
			],
			transaction
		});

		if (!application) {
			await transaction.rollback();
			return { status: 404, message: "Application not found" };
		}

		await db.Document.create( document, { transaction });

		application.status = 3;
		application.isSentBySecretary = true;
		await application.save({ transaction });

		const studentId = application.studentId;

		await db.Internship.create({
			applicationId: id,
			studentId
		}, { transaction });

		await db.Application.update(
			{ status: 5 },
			{
				where: {
					studentId,
					id: { [db.Sequelize.Op.ne]: id } // exclude the accepted one
				},
				transaction
			}
		);
		
		await db.ManualApplication.update(
			{ status: 5 },
			{ 
				where: 
				{ 
					studentId 
				}, 
				transaction 
			}
		);

		await transaction.commit();

		return {
			status: 200,
			data: {
				studentEmail: application.Student.email,
				studentName: application.Student.username,
				companyEmail: application.Announcement.Company.email,
				companyName: application.Announcement.Company.name,
				announcementName: application.Announcement.announcementName
			},
			message: "Application approved"
		};
	} catch (error) {
		await transaction.rollback();
		return { status: 500, message: "An error occurred during evaluation" };
	}
};

const evaluateManualApplications = async (id, document) => {
	const transaction = await db.sequelize.transaction();

	try {
		const internship = await db.Internship.findOne({ where: { manualApplicationId: id }, transaction });

		if (internship) {
			await transaction.rollback();
			return { status: 400, message: "This student already has an internship" };
		}

		const manualApplication = await db.ManualApplication.findOne({
			where: { id, status: 2 },
			include: [{ model: db.Student, attributes: ['email', 'username'] }],
			transaction
		});

		if (!manualApplication) {
			await transaction.rollback();
			return { status: 404, message: "Manual application not found." };
		}

		manualApplication.status = 3;
		manualApplication.isSentBySecretary = true;
		await manualApplication.save({ transaction });

		const studentId = manualApplication.studentId;

		// Mark other applications as unavailable (status = 5)
		await db.Application.update(
			{ status: 5 },
			{ where: { studentId }, transaction }
		);

		await db.ManualApplication.update(
			{ status: 5 },
			{
				where: {
					studentId,
					id: { [db.Sequelize.Op.ne]: id }
				},
				transaction
			}
		);

		await db.Document.create(document, { transaction });
		await db.Internship.create({ manualApplicationId: id, studentId }, { transaction });

		await transaction.commit();

		return {
			status: 200,
			data: {
				studentEmail: manualApplication.Student.email,
				studentName: manualApplication.Student.username,
				companyEmail: manualApplication.companyEmail,
				companyName: manualApplication.companyName
			},
			message: "Application approved"
		};
	} catch (error) {
		await transaction.rollback();
		return { status: 500, message: "An error occurred during evaluation" };
	}
};

module.exports = {
	getApplications,
	getFile,
	evaluateApplication,
	evaluateManualApplications
}