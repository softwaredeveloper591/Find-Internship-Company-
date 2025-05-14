const db = require("../data/db");

const getUploadPage = async (token) => {
	return await db.CompanyUploadLinkRequest.findOne({
		where: { token, status: "Approved" }
	});
}

const saveFiles = async (token, files) => {
	const request = await db.CompanyUploadLinkRequest.findOne({ where: { token, status: "Approved" } });

    if (!request || new Date() > request.expiresAt) {
        return { status: 403, message: "Invalid or expired token." };
    }

	const internship = await db.Internship.findOne( { where: { id: request.internshipId }});

	if (!internship) {
		return { status: 404, message: "Internship not found." };
	}

    const manualReport = files.manualReport[0].buffer;
    const manualForm = files.manualForm[0].buffer;

    const transaction = await db.sequelize.transaction();
		try {
			await db.Document.create( 
				{
					manualApplicationId: internship.manualApplicationId, 
					fileType: "ManualReport", 
					name: files.manualReport[0].originalname,
					data: manualReport 
				},
				{ transaction }
			);
			await db.Document.create( 
				{
					manualApplicationId: internship.manualApplicationId, 
					fileType: "ManualForm", 
					name: files.manualForm[0].originalname,
					data: manualForm 
				},
				{ transaction }
			);

			await db.CompanyUploadLinkRequest.update(
			  	{ status: "Completed" },
			  	{ where: { id: request.id }, transaction }
			);

			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
			throw error;
		}

    return { status: 200, message: "Files uploaded successfully." };
}

module.exports = {
	getUploadPage,
	saveFiles
}