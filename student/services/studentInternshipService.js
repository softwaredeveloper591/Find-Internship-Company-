const internshipRepository = require("../repositories/studentInternshipRepository");

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

module.exports = {
    getFiles,
	uploadApplicationForm,
	finishInternship
};