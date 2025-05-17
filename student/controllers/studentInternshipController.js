const internshipService = require("../services/studentInternshipService");

const getInternship = async (req, res) => {
	const result = await internshipService.getInternship(req.user.id);
	
	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json(result);
}

const getFiles = async (req, res) => {
	const files = await internshipService.getFiles(req.user.id);
	return res.status(200).json(files);
};

const uploadApplicationForm = async (req, res) => {
	const file = req.file;
	const studentId = req.user.id;
  
	const result = await internshipService.uploadApplicationForm(file, studentId);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(201).json({ message: "Application Form uploaded successfully" });
};

const finishInternship = async (req, res) => {
	const result = await internshipService.finishInternship(req.user.id);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
	
	return res.status(200).json({ message: "Internship marked as finished" });
}

const requestLink = async (req, res) => {
	const result = await internshipService.requestLink(req.user.id, req.body);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
	
	return res.status(200).json({ message: "Link is requested" });
}

const uploadInternshipFile = async (req, res) => {
	const result = await internshipService.uploadInternshipFile(req.file, req.user.id, req.body.fileType);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(201).json({ message: "File uploaded successfully" });
}

module.exports = {
	getInternship,
    getFiles,
	uploadApplicationForm,
	finishInternship,
	requestLink,
	uploadInternshipFile
};
