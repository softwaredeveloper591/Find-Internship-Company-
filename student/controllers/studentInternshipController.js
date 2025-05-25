const internshipService = require("../services/studentInternshipService");
const path = require('path');
const fs = require('fs');

const getInternship = async (req, res) => {
	const result = await internshipService.getInternship(req.user.id);
	
	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json( result.data );
}

const getFiles = async (req, res) => {
	const files = await internshipService.getFiles(req.user.id);
	return res.status(200).json(files);
};

const uploadApplicationForm = async (req, res) => {
	const result = await internshipService.uploadApplicationForm(req.file, req.user.id, req.body);

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
};

const requestLink = async (req, res) => {
	const result = await internshipService.requestLink(req.user.id);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
	
	return res.status(200).json({ message: "Link is requested" });
};

const uploadInternshipFile = async (req, res) => {
	const result = await internshipService.uploadInternshipFile(req.file, req.user.id, req.body.fileType);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(201).json({ message: "File uploaded successfully" });
};

const review = async (req, res) => {
	const result = await internshipService.review(req.user.id, req.params.id, req.body);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(201).json({ message: "Review published successfully" });
};

const downloadFileFromServer = (req, res, next) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, '../files', fileName);

  if (!fs.existsSync(filePath)) {
	return res.status(404).json({ message: 'File not found' });
  }

  res.header('Access-Control-Expose-Headers', 'Content-Disposition');
  res.download(filePath, fileName, (error) => {
	if (error) {
	  // Pass error to Express error handler instead of throwing
	  return next(error);
	}
  });
};

module.exports = {
	getInternship,
    getFiles,
	uploadApplicationForm,
	finishInternship,
	requestLink,
	uploadInternshipFile,
	review,
	downloadFileFromServer
};
