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

const getInternships = async () => {
	return await internshipRepository.getInternships();
};

const getInternship = async (id) => {
	return await internshipRepository.getInternship(id);
};

const evaluateInternship = async (id, status, feedbackToStudent, feedbackToCompany, feedbackContextStudent, feedbackContextCompany) => {
	const result = await internshipRepository.evaluateInternship(id, status, feedbackToStudent, feedbackToCompany, feedbackContextStudent, feedbackContextCompany);

	if (result.status !== 200) return result;

	const { student, company, linkRequest } = result.data;

	if (status === "Approved") {
		const subject = "Internship Approved – Congratulations!";
		const body = `
			Dear ${student.username},<br><br>
			Congratulations! Your internship has been <strong>approved</strong> by the Department Internship Committee (DIC).<br><br>
			Your internship score is <strong>100</strong>, and it will be reflected in your academic records shortly.<br><br>
			Best regards,<br>AIS Team
		`;
		sendEmail(student.email, subject, body);
	} else if (status === "Rejected") {
		const subject = "Internship Rejected – Action Required";
		const body = `
			Dear ${student.username},<br><br>
			We regret to inform you that your internship has been <strong>rejected</strong> by the Department Internship Committee (DIC).<br><br>
			Reason: <em>${feedbackToStudent}</em><br><br>
			Please contact your advisor or the DIC for more information or guidance on your next steps.<br><br>
			Best regards,<br>AIS Team
		`;
		sendEmail(student.email, subject, body);
	} else if (status === "FeedbackToStudent") {
		const subject = "Internship Feedback – Action Required";
		const body = `
			Dear ${student.username},<br><br>
			The Department Internship Committee (DIC) has reviewed your internship and requires some revisions.<br><br>
			Feedback: <em>${feedbackToStudent}</em><br><br>
			Please review the feedback carefully and update your documents or submission accordingly.<br><br>
			Best regards,<br>AIS Team
		`;
		sendEmail(student.email, subject, body);
	} else if (status === "FeedbackToCompany") {
		if (linkRequest) {
			const request = await internshipRepository.createLinkRequest(linkRequest);
			const { token, expiresAt } = request.data;

			const uploadLink = `https://localhost:5173/company/internship/upload?token=${token}`;
			const expirationDate = moment(expiresAt).format('YYYY-MM-DD HH:mm');

			const subject = "Internship Document Feedback – Action Required";
			const body = `
				Dear ${company.companyName},<br><br>
				The documents submitted for intern <strong>${student.username}</strong> require changes.<br><br>
				Feedback: <em>${feedbackToCompany}</em><br><br>
				Please re-upload the corrected documents using the new secure link below:<br>
				<a href="${uploadLink}">${uploadLink}</a><br><br>
				This link will expire on <strong>${expirationDate}</strong>. Kindly avoid uploading the same files again.<br><br>
				Best regards,<br>AIS Team
			`;
			sendEmail(company.companyEmail, subject, body);
		} else {
			const subject = "Internship Document Feedback – Action Required";
			const body = `
				Dear ${company.companyName},<br><br>
				The internship documents submitted for <strong>${student.username}</strong> require updates based on university standards.<br><br>
				Feedback: <em>${feedbackToCompany}</em><br><br>
				Please re-upload the corrected documents via the AIS company portal.<br><br>
				If you need assistance, feel free to contact our support team.<br><br>
				Best regards,<br>AIS Team
			`;
			sendEmail(company.companyEmail, subject, body);
		}
	}

	return { status: 200, message: "" };
}

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile,
	getLinkRequests,
	approveLinkRequest,
	getInternships,
	getInternship,
	evaluateInternship
};