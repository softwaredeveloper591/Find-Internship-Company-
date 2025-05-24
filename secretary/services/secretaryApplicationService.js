const applicationRepository = require("../repositories/secretaryApplicationRepository");
const { sendEmail } = require("../utils/emailSender");

const getApplications = async (id) => {
	return await applicationRepository.getApplications(id);
};

const getFile = async (id, fileType) => {
	const whereClause = { fileType };

	if (fileType.startsWith("Manual")) {
		whereClause.manualApplicationId = id;
	} else {
		whereClause.applicationId = id;
	}

	return await applicationRepository.getFile(whereClause);
};

const evaluateApplication = async (id, file) => {
	if (!file) return { status: 400, message: "No file uploaded"};

	const document = {
		applicationId: id,
		fileType: "EmploymentCertificate",
		data: file.buffer,
		name: file.originalname
	}

	const result = await applicationRepository.evaluateApplication(id, document);

	if (result.status !== 200) return result; 

	const { studentEmail, studentName, companyEmail, companyName, announcementName } = result.data;

	const companySubject = `Internship Document Sent: ${studentName}`;
	const companyBody = `
		Dear ${companyName},<br><br>
		We would like to inform you that the <strong>Employment Certificate</strong> for student <strong>${studentName}</strong>, related to the internship titled <strong>${announcementName}</strong>, has been sent to you.<br><br>
		You can access this document on the <strong>Internship page</strong> of the AIS platform.<br><br>
		Best regards,<br>AIS Team
	`;
	sendEmail(companyEmail, companySubject, companyBody, {
	    filename: file.originalname,
	    content: file.buffer
	});

	const studentSubject = `Your Employment Certificate Has Been Sent`;
	const studentBody = `
		Dear ${studentName},<br><br>
		We’re pleased to inform you that your <strong>Employment Certificate</strong> for the internship titled <strong>${announcementName}</strong> has been successfully submitted and forwarded to <strong>${companyName}</strong>.<br><br>
		You can track your internship status from the <strong>Internship page</strong> in the AIS system.<br><br>
		Best regards,<br>AIS Team
	`;
	sendEmail(studentEmail, studentSubject, studentBody);

	return { status: 200, message: "Approved and emails sent." };
};

const evaluateManualApplications = async (manualApplicationId, file) => {
	if (!file) return { status: 400, message: "No file uploaded"};

	const document = { 
		manualApplicationId, 
		fileType: "EmploymentCertificate", 
		data: file.buffer,
		name: file.originalname
	};

	const result = await applicationRepository.evaluateManualApplications(id, document);

	if (result.status !== 200) return result; 

	const { studentEmail, studentName, companyEmail, companyName } = result.data;

	const companySubject = `Internship Document Sent: ${studentName}`;
	const companyBody = `
		Dear ${companyName},<br><br>
		We would like to inform you that the <strong>Employment Certificate</strong> for student <strong>${studentName}</strong> has been sent to you.<br><br>
		You can access this document on the <strong>Internship page</strong> of the AIS platform.<br><br>
		Best regards,<br>AIS Team
	`;
	sendEmail(companyEmail, companySubject, companyBody, {
		filename: file.originalname,
		content: file.buffer
	});

	const studentSubject = `Your Employment Certificate Has Been Sent`;
	const studentBody = `
		Dear ${studentName},<br><br>
		We’re pleased to inform you that your <strong>Employment Certificate</strong> has been successfully submitted and forwarded to <strong>${companyName}</strong>.<br><br>
		You can track your internship status from the <strong>Internship page</strong> in the AIS system.<br><br>
		Best regards,<br>AIS Team
	`;
	sendEmail(studentEmail, studentSubject, studentBody);
	
	return { status: 200, message: "Approved and emails sent." };
};

module.exports = {
	getApplications,
	getFile,
	evaluateApplication,
	evaluateManualApplications
}