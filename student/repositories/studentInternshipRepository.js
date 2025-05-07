const db = require("../data/db");

const getFiles = async (studentId) => {
	return await db.Document.findAll({
		where: { userId: studentId },
		attributes: ['name', 'fileType']
	});
};

const uploadApplicationForm = async(studentId, document) => {
	const transaction = await db.sequelize.transaction(); // Start transaction
	try {
		const student = await db.Student.findByPk(studentId, { transaction });

		await db.ManualApplication.create(
			{ id: document.manualApplicationId, studentId },
			{ transaction }
		);

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

const finishInternship = async(studentId) => {
	const internship = await db.Internship.findOne({ where: { studentId } });

	if (!internship) {
		return { status: 403, message: "You are not authorized to finish this internship or it doesn't exist." };
	}

	// Proceed with updating the status to 'Finished'
	await db.Internship.update(
		{ status: "Finished" },
		{ where: { studentId } }
	);
}

module.exports = {
    getFiles,
	uploadApplicationForm,
	finishInternship
};