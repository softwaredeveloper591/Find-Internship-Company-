const announcementRepository = require("../repositories/adminAnnouncementRepository");
const { sendEmail } = require("../utils/emailSender");

const getAnnouncements = async () => {
	return await announcementRepository.getAnnouncements();
};

const getAnnouncement = async (id) => {
	return await announcementRepository.getAnnouncement(id);
};

const approveAnnouncement = async (id, body) => {
	const { isApproved, feedback } = body;

	const result = await announcementRepository.approveAnnouncement(id, isApproved);

	if (result.data) {
		const { companyEmail, companyName, announcementName } = result.data;

		const emailSubject = isApproved ? 'Announcement Approved' : 'Announcement Rejected';
		const emailBody = `Hello ${companyName},<br><br>
			Your announcement titled "${announcementName}" has been 
			${isApproved ? "approved" : `rejected and will be removed from our system. <br><br> ${feedback ? `Feedback: <br> ${feedback}.` : ""}`} <br><br>
			Best Regards,<br>AIS Team`;
		sendEmail(companyEmail, emailSubject, emailBody);
	}

	return result;
};

module.exports = {
	getAnnouncements,
	getAnnouncement,
	approveAnnouncement
}