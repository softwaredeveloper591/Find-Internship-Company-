const applicationService = require("../services/companyApplicationService");

const postAnnouncement = async (req, res) => {
	let image = null;

	if (req.file) image = req.file;
	
	const { skillIds = [], ...announcementData } = req.body;

	await applicationService.postAnnouncement(req.user.id ,skillIds, announcementData, image);

	return res.status(201).json({ message: "Announcement created succesfully"});
};

const getAnnouncements = async (req, res) => {
	return await applicationService.getAnnouncements(req.user.id);
};

module.exports = {
	postAnnouncement,
	getAnnouncements
}