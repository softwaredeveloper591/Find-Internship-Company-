const announcementService = require("../services/adminAnnouncementService");

const getAnnouncements = async (req, res) => {
	const announcements = await announcementService.getAnnouncements();

	return res.status(200).json( { announcements });
};

const getAnnouncement = async (req, res) => {
	const announcement = await announcementService.getAnnouncement(req.params.id);

	return res.status(200).json( { announcement });
};

const approveAnnouncement = async (req, res) => {
	const result = await announcementService.approveAnnouncement(req.params.id, req.body);
	
	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	} 

	return res.status(200).json({ message: "Announcement approved successfully." });
};

module.exports = {
	getAnnouncements,
	getAnnouncement,
	approveAnnouncement
}