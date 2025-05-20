const applicationService = require("../services/companyApplicationService");

const postAnnouncement = async (req, res) => {
	let image = null;

	if (req.file) image = req.file;
	
	const { skillIds = [], ...announcementData } = req.body;

	await applicationService.postAnnouncement(req.user.id ,skillIds, announcementData, image);

	return res.status(201).json({ message: "Announcement created succesfully"});
};

const getAnnouncements = async (req, res) => {
	const announcements = await applicationService.getAnnouncements(req.user.id);

	return res.status(200).json({ announcements });
};

const getAnnouncement = async (req, res) => {
	const announcement = await applicationService.getAnnouncement(req.user.id, req.params.id);

	return res.status(200).json({ announcement });
};

const updateAnnouncement = async (req, res) => {
  	let image = null;
  	if (req.file) image = req.file;

  	const { skillIds = [], ...announcementData } = req.body;

  	await applicationService.updateAnnouncement(req.user.id, req.params.id, skillIds, announcementData, image);

  	return res.status(200).json({ message: "Announcement updated successfully" });
};

const getApplications = async (req, res) => {
	const applications = await applicationService.getApplications(req.user.id);

	return res.status(200).json({ applications });
};

const getApplication = async (req, res) => {
	const application = await applicationService.getApplication(req.user.id, req.params.id);

	return res.status(200).json({ application });
};

const fillApplicationForm = async (req, res) => {
	const result = await applicationService.fillApplicationForm(req.user.id, req.params.id, req.body);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json( {result} );
};

const uploadApplicationForm = async (req, res) => {
	const result = await applicationService.uploadApplicationForm(req.user.id, req.params.id, req.file, req.body);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json( {result} );
};

const downloadFile = async (req, res) => {
	const { applicationId, fileType } = req.params;

	const whereClause = { fileType, applicationId };

	const document = await applicationService.downloadFile( whereClause );

	if (!document || !document.data) {
		throw new Error("No such document or file data is missing.");
	}

	const { name, data } = document;

	const contentType = mime.lookup(name) || 'application/octet-stream';

	res.header('Access-Control-Expose-Headers', 'Content-Disposition');
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(name));
	res.setHeader('Content-Type', contentType);
	res.send(data);
};

module.exports = {
	postAnnouncement,
	getAnnouncements,
	getAnnouncement,
	updateAnnouncement,
	getApplications,
	getApplication,
	fillApplicationForm,
	uploadApplicationForm,
	downloadFile
}