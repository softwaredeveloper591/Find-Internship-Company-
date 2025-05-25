const applicationService = require("../services/adminApplicationService");

const getApplications = async (req, res) => {
	const { applications, manualApplications}  = await applicationService.getApplications();

	return res.status(200).json( { applications, manualApplications });
};

const getApplication = async (req, res) => {
	const application = await applicationService.getApplication(req.params.id);

	return res.status(200).json( { application });
};

const getManualApplication = async (req, res) => {
	const application = await applicationService.getManualApplication(req.params.id);

	return res.status(200).json( { application });
};

const downloadFile = async (req, res) => {
	const document = await applicationService.getFile(req.params.id, req.params.fileType);
	
	if (!document) {
		throw new Error("There is no such document.")
	}

	const { name, data } = document;

	const contentType = 'image/jpeg'; // You can make this dynamic if needed

	res.header('Access-Control-Expose-Headers', 'Content-Disposition'); // In order to enable obtaining it in axios request headers, otherwise it is not added into header. 
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(name));
	res.setHeader('Content-Type', contentType);
	res.send(data);
};

const evaluateApplication = async (req, res) => {
	const result = await applicationService.evaluateApplication(req.params.id, req.body, req.file);
	
	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json({ message: "Application approved successfully." });
};

const evaluateManualApplications = async (req, res) => {
	const result = await applicationService.evaluateManualApplications(req.params.id, req.body, req.file);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json({ message: "Application approved successfully." });
};

module.exports = {
	getApplications,
	getApplication,
	getManualApplication,
	downloadFile,
	evaluateApplication,
	evaluateManualApplications
}