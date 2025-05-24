const applicationService = require("../services/secretaryApplicationService");

const getApplications = async (req, res) => {
	const { dataValues, applications, manualApplications } = await applicationService.getApplications(req.user.id);

	return res.status(200).json( { dataValues, applications, manualApplications });
};

const downloadFile = async (req, res) => {
	const document = await applicationService.getFile(req.params.id, req.params.fileType);
	
	if (!document) {
		throw new Error("There is no such document.")
	}

	const { name, data } = document;

	const contentType = 'image/jpeg'; // You can make this dynamic if needed

	res.header('Access-Control-Expose-Headers', 'Content-Disposition'); 
	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(name));
	res.setHeader('Content-Type', contentType);
	res.send(data);
};

const evaluateApplication = async (req, res) => {
	const result = await applicationService.evaluateApplication(req.params.id, req.file);
	
	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json({ message: "Application approved successfully." });
};

const evaluateManualApplications = async (req, res) => {
	const result = await applicationService.evaluateManualApplications(req.params.id, req.file);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json({ message: "Application approved successfully." });
};

module.exports = {
	getApplications,
	downloadFile,
	evaluateApplication,
	evaluateManualApplications
}