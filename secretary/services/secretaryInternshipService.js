const internshipRepository = require("../repositories/secretaryInternshipRepository");

const getManualApplications = async (secretaryId) => {
	return await internshipRepository.getManualApplications(secretaryId);
};

const approveManualApplications = async (manualApplicationId, studentId, isApproved, file) => {
	if (!file) throw new Error("No file uploaded");
	const data = file.buffer;
	const documentData = { manualApplicationId, name: file.originalname, fileType: "EmploymentCertificate", data};
	return await internshipRepository.approveManualApplications(manualApplicationId, studentId, isApproved, documentData);
};

const downloadFile = async (whereClause) => {
	return await internshipRepository.downloadFile(whereClause);
}

module.exports = {
	getManualApplications,
	approveManualApplications,
	downloadFile
};