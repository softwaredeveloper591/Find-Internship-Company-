const applicationRepository = require("../repositories/adminApplicationRepository");
const { sendEmail } = require("../utils/emailSender");

const getApplications = async () => {
	return await applicationRepository.getApplications();
};

const getApplication = async (id) => {
	return await applicationRepository.getApplication(id);
};

const getManualApplication = async (id) => {
	return await applicationRepository.getManualApplication(id);
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

const evaluateApplication = async (applicationId, body, file) => {
	if (!file) return { status: 400, message: "No file uploaded"};

	const data = file.buffer;
	const name = file.originalname;

	const fileData = { data, name };

	const { isApproved, feedback } = body;

	const result = applicationRepository.evaluateApplication(applicationId, isApproved, fileData);

	if (result.status !== 200) return result;

	const { studentEmail, studentName, announcementName } = result.data;

	const emailSubject = isApproved === "true" ? 'Application Approved' : 'Application Rejected';
	const emailBody = `Hello ${studentName},<br><br>
		Your application titled "${announcementName}" has been ${isApproved === "true" ? "approved" : `rejected and will be removed from our system. <br><br> ${feedback ? `Feedback: <br> ${feedback}.` : ""}`} <br><br>
		Best Regards,<br>Admin Team`;

	sendEmail(studentEmail, emailSubject, emailBody);

	return { status: 200, message: isApproved === "true" ? "Approved and email sent." : "Rejected and student notified." };
};

const evaluateManualApplications = async (manualApplicationId, body, file) => {
	if (!file) return { status: 400, message: "No file uploaded"};

	const { isApproved, feedback } = body;

	const data = file.buffer;

	return await applicationRepository.evaluateManualApplications(manualApplicationId, isApproved, data);
};

module.exports = {
	getApplications,
	getApplication,
	getManualApplication,
	getFile,
	evaluateApplication,
	evaluateManualApplications
}