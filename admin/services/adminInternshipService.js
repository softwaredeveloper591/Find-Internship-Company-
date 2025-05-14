const { sendEmail } = require('../utils/emailSender');
const moment = require('moment');
const internshipRepository = require("../repositories/adminInternshipRepository");

const getManualApplications = async (adminId) => {
	return await internshipRepository.getManualApplications(adminId);
};

const approveManualApplications = async (manualApplicationId, studentId, isApproved, file) => {
	if (!file) throw new Error("No file uploaded");
	const data = file.buffer;
	return await internshipRepository.approveManualApplications(manualApplicationId, studentId, isApproved, data);
};

const downloadFile = async (whereClause) => {
	return await internshipRepository.downloadFile(whereClause);
}

const getLinkRequests = async () => {
	return await internshipRepository.getLinkRequests();
}

const approveLinkRequest = async (requestId, isApproved) => {
	const result = await internshipRepository.approveLinkRequest(requestId, isApproved);

	if (result.status !== 200) return result;

	const { student, company, token, expiresAt, approved } = result.data;

	console.log(result);

	if (approved) {
		// Company Email
		const uploadLink = `https://localhost:5173/company/internship/upload?token=${token}`;
		const expirationDate = moment(expiresAt).format('YYYY-MM-DD HH:mm');

		const companySubject = `Upload Internship Document for ${student.username}`;
		const companyBody = `
			Dear ${company.companyName},<br><br>
			Please upload the necessary internship documents for student ${student.username}.<br><br>
			Upload link: <a href="${uploadLink}">${uploadLink}</a><br>
			This link will expire on <strong>${expirationDate}</strong>.<br><br>
			Best regards,<br>AIS Team
		`;

		sendEmail(company.companyEmail, companySubject, companyBody);

		// Student Email
		const studentSubject = "Your internship document link has been sent";
		const studentBody = `
			Dear ${student.username},<br><br>
			The upload link has been sent to ${company.companyName} to complete your internship document submission.<br>
			We'll notify you once the upload is complete.<br><br>
			Best,<br>AIS Team
		`;

		sendEmail(student.email, studentSubject, studentBody);
	} else {
		// Rejection Email to Student
		const studentSubject = "Your internship upload request was rejected";
		const studentBody = `
			Dear ${student.username},<br><br>
			Unfortunately, your internship document request was rejected.<br>
			Please contact your company or submit another request if needed.<br><br>
			Best regards,<br>AIS Team
		`;

		sendEmail(student.email, studentSubject, studentBody);
	}

	return { status: 200, message: approved ? "Approved and emails sent." : "Rejected and student notified." };
};

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile,
	getLinkRequests,
	approveLinkRequest
};