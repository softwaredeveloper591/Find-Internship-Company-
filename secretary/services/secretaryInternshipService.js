const internshipRepository = require("../repositories/secretaryInternshipRepository");

const getManualApplications = async (secretaryId) => {
	return await internshipRepository.getManualApplications(secretaryId);
};

const approveManualApplications = async (manualApplicationId, isApproved, file) => {
	if (!file) throw new Error("No file uploaded");
	const data = file.buffer;
	const documentData = { manualApplicationId, name: file.originalname, fileType: "EmploymentCertificate", data};
	return await internshipRepository.approveManualApplications(manualApplicationId, isApproved, documentData);
};

module.exports = {
	getManualApplications,
	approveManualApplications
};