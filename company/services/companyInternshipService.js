const { sendEmail } = require('../utils/emailSender');
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

	if (!token || !files || !files.manualReport || !files.manualForm) {
		return { status: 400, message: "Both token and files should be provided" };
    }

    const result = await internshipRepository.saveFiles(token, files);

	if (result.status !== 200) return result;

	const { student, companyName } = result.data;

	const subject = `Your Internship Documents Have Been Uploaded`;
	const body = `
		Dear ${student.username},<br><br>
		We are pleased to inform you that your internship documents have been successfully uploaded by the ${companyName}.
		<br><br> You can now log in to your AIS account to track your internship status.<br><br>
		If you have any questions or concerns, feel free to contact the AIS support team.<br><br>
		Best regards,<br>AIS Team
	`;
	sendEmail(student.email, subject, body);

	return { status: 201, message: "Files uploaded successfully." };
}

const getInternships = async (companyId) => {
	return await internshipRepository.getInternships(companyId);
};

const getInternship = async (id) => {
	return await internshipRepository.getInternship(id);
};

const uploadCompanyForm = async (file, internshipId) => {
	if (!file) return { status: 400, message: "No file uploaded" };
	
	const data = file.buffer;
	const name = file.originalname;

	const document = {
		fileType: "CompanyForm",
		data,
		name
	}

	return await internshipRepository.uploadCompanyForm(internshipId, document);
}

const evaluateInternship = async (id, status, feedbackToStudent, feedbackContextStudent) => {
	const result = await internshipRepository.evaluateInternship(id, status, feedbackToStudent, feedbackContextStudent);

	if (result.status !== 200) return result;

	const { student } = result.data;

	if (status === "Approved") {
		const subject = "Internship Report Approved by Company";
		const body = `
			Dear ${student.username},<br><br>
			Congratulations! Your internship report has been approved by the company.<br>
			The report has now been sent to the Department Internship Committee (DIC) for final review.<br><br>
			Thank you for your hard work and dedication.<br><br>
			Best regards,<br>AIS Team
		`;
		sendEmail(student.email, subject, body);
	} else if (status === "FeedbackToStudent") {
		const subject = "Feedback on Your Internship Report";
		const body = `
			Dear ${student.username},<br><br>
			The company has reviewed your internship report and found some issues that need your attention.<br>
			Please review the feedback below and update your report accordingly:<br><br>
			<em>${feedbackToStudent}</em><br><br>
			Once revised, please resubmit your report as soon as possible.<br><br>
			If you have any questions, feel free to contact your internship coordinator.<br><br>
			Best regards,<br>AIS Team
		`;
		sendEmail(student.email, subject, body);
	} 

	return { status: 200, message: "" };
}

module.exports = {
	getUploadPage,
	uploadFiles,
	getInternships,
	getInternship,
	uploadCompanyForm,
	evaluateInternship
}