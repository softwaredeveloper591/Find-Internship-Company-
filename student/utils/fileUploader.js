const uploadFile = async (file, applicationId, student, name, fileType, status, Document_model) => {
    
	if (!file) {
        throw new Error("No file uploaded");
    }

    const binaryData = file.buffer;

    const existingDocument = await Document_model.findOne({
        where: { applicationId, fileType }
    });

    if (existingDocument === null || fileType === "Manual Application Form" ) {
        await Document_model.create({
            applicationId,
            name,
            fileType,
            username: student.username,
			userId: student.id,
            data: binaryData
        });
    } else {
        await Document_model.update(
            { data: binaryData, name, status },
            { where: { applicationId, userId: student.id, fileType } }
        );
    }
};

module.exports = { uploadFile };