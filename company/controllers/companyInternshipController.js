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

    const result = await internshipService.uploadFiles(token, files);

    return res.status(result.status).json({ message: result.message });
};

const getInternships = async (req, res) => {
	const result = await internshipService.getInternships(req.user.id);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json( result );
};

const getInternship = async (req, res) => {
	const { result, documentId } = await internshipService.getInternship(req.params.id);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json( {result, documentId} );
};

const uploadInternshipFile = async (req, res) => {
	const result = await internshipService.uploadInternshipFile(req.file, req.params.id, req.body.fileType);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(201).json({ message: "File uploaded successfully" });
};

const evaluateInternship = async (req, res) => {
	const { status, feedbackToStudent, feedbackContextStudent } = req.body;

	const validStatuses = ['Approved', 'FeedbackToStudent'];

	if (!validStatuses.includes(status)) {
		return res.status(400).json({ message: "Invalid status" });
	}

	const validStudentContexts = ['Report', null];

	if (!validStudentContexts.includes(feedbackContextStudent)) {
		return res.status(400).json({ message: "Invalid context" });
	}

	const result = await internshipService.evaluateInternship(req.params.id, status, feedbackToStudent, feedbackContextStudent);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json( result );
};

module.exports = {
	getUploadPage,
	uploadFiles,
	getInternships,
	getInternship,
	uploadInternshipFile,
	evaluateInternship
}