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

const requestLink = async (studentId, companyData) => {
	return await internshipRepository.requestLink(studentId, companyData);
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

  	const data = file.buffer;
	const name = file.originalname;

	const document = {
		fileType,
		data,
		name
	}

  	return await internshipRepository.uploadFile(studentId, document, studentStatus);
}

module.exports = {
	getInternship,
    getFiles,
	uploadApplicationForm,
	finishInternship,
	requestLink,
	uploadInternshipFile
};