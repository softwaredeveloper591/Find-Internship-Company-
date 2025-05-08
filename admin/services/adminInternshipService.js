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

const getLinkRequests = async () => {
	return await internshipRepository.getLinkRequests();
}

const approveLinkRequest = async (requestId, isApproved) => {
	return await internshipRepository.approveLinkRequest(requestId, isApproved);
}

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile,
	getLinkRequests,
	approveLinkRequest
};