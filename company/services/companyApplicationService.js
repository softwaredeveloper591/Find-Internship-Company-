const applicationRepository = require("../repositories/companyApplicationRepository");
const moment = require('moment-timezone');
const { sendEmail } = require('../utils/emailSender');

const getAllSkills = async () => {
	return await applicationRepository.getAllSkills();
};

const postAnnouncement = async (companyId, skillIds, announcementData, image) => {
	if (image) announcementData.image = image.path;

	announcementData.startDate = moment.tz(announcementData.startDate, 'Europe/Istanbul').startOf('day').toDate();
	announcementData.endDate = moment.tz(announcementData.endDate, 'Europe/Istanbul').endOf('day').toDate();
	announcementData.companyId = companyId;

	return await applicationRepository.postAnnouncement(skillIds, announcementData);
};

const getAnnouncements = async (companyId) => {
	return await applicationRepository.getAnnouncements(companyId);
};

const getAnnouncement = async (companyId, announcementId) => {
	return await applicationRepository.getAnnouncement(companyId, announcementId);
};

const updateAnnouncement = async (companyId, announcementId, skillIds, updateData, image) => {
	if (image) updateData.image = image.path;

	if (updateData.startDate) {
  	  	updateData.startDate = moment.tz(updateData.startDate, 'Europe/Istanbul').startOf('day').toDate();
  	}
  	if (updateData.endDate) {
  	  	updateData.endDate = moment.tz(updateData.endDate, 'Europe/Istanbul').endOf('day').toDate();
  	}

	updateData.status = "Edited";

  	return await applicationRepository.updateAnnouncement(companyId, announcementId, skillIds, updateData);
};

const getApplications = async (companyId) => {
	return await applicationRepository.getApplications(companyId);
};

const getApplication = async (companyId, applicationId) => {
	return await applicationRepository.getApplication(companyId, applicationId);
};

const fillApplicationForm = async (companyId, applicationId, body) => {
	return await applicationRepository.fillApplicationForm(companyId, applicationId, body);
};

const uploadApplicationForm = async (companyId, applicationId, file, body) => {
	const { isApproved } = body.isApproved;

	let document = null;

	if ( isApproved === "true") {
		if(!file) return { status: 400, message: "No file uploaded"};

		document = {
			applicationId,
			fileType: "UpdatedApplicationForm",
			data: file.buffer,
			name: file.originalname
		}
	}

	const result = await applicationRepository.uploadApplicationForm(companyId, applicationId, document, body);

	if (result.status !== "200") return result;

	const { application } = result.data;

	const emailSubject = isApproved === "true" ? 'Application Approved' : 'Application Rejected';
	const emailBody = `Hello ${application.Student.username},<br><br>
		Your application titled "${application.Announcement.announcementName}" has been ${isApproved === "true" ? "approved by company" : "rejected by company and will be removed from our system"}.<br><br>
		Best Regards,<br>Admin Team`;

	sendEmail(application.Student.email, emailSubject, emailBody);

	return result;
};

const getFile = async (applicationId, fileType) => {
	const whereClause = { fileType, applicationId };

	const document = await applicationRepository.getFile(whereClause);

	if(!document) return { status: 400, message: "Document can't be found"};

	return document;
};

module.exports = {
	getAllSkills,
	postAnnouncement,
	getAnnouncements,
	getAnnouncement,
	updateAnnouncement,
	getApplications,
	getApplication,
	fillApplicationForm,
	uploadApplicationForm,
	getFile
}