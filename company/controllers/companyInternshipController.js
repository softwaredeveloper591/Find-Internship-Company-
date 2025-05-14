const internshipService = require("../services/companyInternshipService");

const getUploadPage = async (req, res) => {	
	const token = req.query.token;

	if (!token) {
		return res.status(400).send("Missing token.");
	}

	const result = await internshipService.getUploadPage(token);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json( result );
};

const uploadFiles = async (req, res) => {
	const token = req.query.token;
    const files = req.files;

	if (!token || !files || !files.manualReport || !files.manualForm) {
        return res.status(400).json({ message: "Both token and files should be provided"});
    }

    const result = await internshipService.uploadFiles(token, files);

    return res.status(result.status).json({ message: result.message });
}

module.exports = {
	getUploadPage,
	uploadFiles
}