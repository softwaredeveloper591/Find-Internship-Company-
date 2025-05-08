const internshipRepository = require("../repositories/studentInternshipRepository");

const getInternship = async (studentId) => {
	return await internshipRepository.getInternship(studentId);
};

const getFiles = async (studentId) => {
	return await internshipRepository.getFiles(studentId);
};

const uploadApplicationForm = async (file, studentId) => {
	if (!file) throw new Error("No file uploaded");

  	const fileType = "ManualApplicationForm";
  	const data = file.buffer;
	const name = file.originalname;

	const document = {
		fileType,
		data,
		name
	}

  	return await internshipRepository.uploadApplicationForm(studentId, document);
};

const finishInternship = async (studentId) => {
	return await internshipRepository.finishInternship(studentId);
}

const requestLink = async (studentId, companyEmail) => {
	return await internshipRepository.requestLink(studentId, companyEmail);
}

const uploadReport = async (file, studentId) => {
	if (!file) return { status: 400, message: "No file uploaded" };

  	const fileType = "Report";
  	const data = file.buffer;
	const name = file.originalname;

	const document = {
		fileType,
		data,
		name
	}

  	return await internshipRepository.uploadFile(studentId, document);
}

const uploadSurvey = async (file, studentId) => {
	if (!file) return { status: 400, message: "No file uploaded" };

  	const fileType = "Survey";
  	const data = file.buffer;
	const name = file.originalname;

	const document = {
		fileType,
		data,
		name
	}

  	return await internshipRepository.uploadFile(studentId, document);
}

module.exports = {
	getInternship,
    getFiles,
	uploadApplicationForm,
	finishInternship,
	requestLink,
	uploadReport,
	uploadSurvey
};