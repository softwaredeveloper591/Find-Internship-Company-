const applicationRepository = require("../repositories/companyApplicationRepository");

const postAnnouncement = async (companyId, skillIds, announcementData, image) => {
	return await applicationRepository.postAnnouncement(companyId, skillIds, announcementData,image);
};

const getAnnouncements = async (companyId) => {
	return await applicationRepository.getAnnouncements(companyId);
};

module.exports = {
	postAnnouncement,
	getAnnouncements
}