const applicationRepository = require("../repositories/studentApplicationRepository");

const createStudentInfo = async (body) => {
	return await applicationRepository.createStudentInfo(body);
};

const updateStudentInfo = async (studentId, updates) => {
	const cleanedUpdates = Object.fromEntries(
		Object.entries(updates).filter(([_, value]) => value !== undefined && value !== null)
	);

	return await applicationRepository.updateStudentInfo(studentId, cleanedUpdates);
};

const getOpportunities = async (studentId) => {
	return await applicationRepository.getOpportunities(studentId);
};

const getOpportunitiesSkills = async (studentId) => {
	return await applicationRepository.getOpportunitiesSkills(studentId);
};

const getOneOpportunity = async (studentId, announcementId) => {
	return await applicationRepository.getOneOpportunity(studentId, announcementId);
};

const applyToAnnouncement = async (studentId, announcementId, file) => {
	if (!file) throw new Error("No file uploaded");

	const fileType = "CV";
  	const data = file.buffer;
	const name = file.originalname;

	const document = {
		fileType,
		data,
		name
	}

	return await applicationRepository.applyToAnnouncement(studentId, announcementId, document);
};

const getApplications = async (studentId) => {
	return await applicationRepository.getApplications(studentId);
};

module.exports = {
	createStudentInfo,
	updateStudentInfo,
	getOpportunities,
	getOpportunitiesSkills,
	getOneOpportunity,
	applyToAnnouncement,
	getApplications
};