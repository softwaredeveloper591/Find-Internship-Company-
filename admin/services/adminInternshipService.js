const internshipRepository = require("../repositories/adminInternshipRepository");

const getManualApplications = async (adminId) => {
	return await internshipRepository.getManualApplications(adminId);
};

const approveManualApplications = async (manualApplicationId, studentId, isApproved, file) => {
	if (!file) throw new Error("No file uploaded");
	const data = file.buffer;
	return await internshipRepository.approveManualApplications(manualApplicationId, studentId, isApproved, data);
};

const downloadFile = async (whereClause) => {
	return await internshipRepository.downloadFile(whereClause);
}

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile
};