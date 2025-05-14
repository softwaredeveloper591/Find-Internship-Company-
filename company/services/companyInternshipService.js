const internshipRepository = require("../repositories/companyInternshipRepository")

const getUploadPage = async (token) => {
	const request = await internshipRepository.getUploadPage(token);

	if (!request) {
		return { status: 404, message: "Invalid or expired token." };
	}

	// Check if expired
	if (new Date() > request.expiresAt) {
		return { status: 410, message: "Token has expired." };
	}

	// Optional: check if already uploaded
	if (request.status !== "Approved") {
		return { status: 400, message: "This request is not valid anymore." };
	}

	return { status: 200 };
}

const uploadFiles = async (token, files) => {
    return await internshipRepository.saveFiles(token, files);
}

module.exports = {
	getUploadPage,
	uploadFiles
}