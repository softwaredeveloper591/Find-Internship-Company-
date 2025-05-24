const internshipRepository = require("../repositories/studentInternshipRepository");

const getInternship = async (studentId) => {
	return await internshipRepository.getInternship(studentId);
};

const getFiles = async (studentId) => {
	return await internshipRepository.getFiles(studentId);
};

const uploadApplicationForm = async (file, studentId, body) => {
	if (!file) return { status: 400, message: "No file uploaded"};

	const document = {
		fileType: "ManualApplicationForm",
		data: file.buffer,
		name: file.originalname
	}

  	return await internshipRepository.uploadApplicationForm(studentId, document, body);
};

const finishInternship = async (studentId) => {
	return await internshipRepository.finishInternship(studentId);
}

const requestLink = async (studentId) => {
	return await internshipRepository.requestLink(studentId);
}

const uploadInternshipFile = async (file, studentId, uploadedFileType) => {
	if (!file) return { status: 400, message: "No file uploaded" };

	let studentStatus;

	let fileType = uploadedFileType;

  	if (fileType === "Report") {
		studentStatus = 1;
	}
	else if (fileType === "Survey") {
		studentStatus = 2;
	}
	else {
		studentStatus = 3;
		fileType = "Survey"
	}

	const document = {
		fileType,
		data: file.buffer,
		name: file.originalname
	}

  	return await internshipRepository.uploadFile(studentId, document, studentStatus);
};

const review = async (studentId, companyId, body) => {
	return await internshipRepository.review(studentId, companyId, body);
};

module.exports = {
	getInternship,
    getFiles,
	uploadApplicationForm,
	finishInternship,
	requestLink,
	uploadInternshipFile,
	review
};