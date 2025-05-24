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
	const { isApproved, feedback } = body;

	if( isApproved === "true") {
		if (!file) return { status: 400, message: "No file uploaded"};
	}
	
	const data = file.buffer;
	const name = file.originalname;

	const fileData = { data, name };

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
	const { isApproved, feedback } = body;

	if (isApproved) {
		if (!file) return { status: 400, message: "No file uploaded"};
	}

	const data = { data: file.buffer, name: file.originalname };

	const result = await applicationRepository.evaluateManualApplications(manualApplicationId, isApproved, data);

	if (result.status !== 200) return result;

	const { studentEmail, studentName } = result.data;

	const emailSubject = isApproved ? 'Application Approved' : 'Application Rejected';
	const emailBody = `Hello ${studentName},<br><br>
		Your application has been ${isApproved ? "approved" : `rejected and will be removed from our system. <br><br> ${feedback ? `Feedback: <br> ${feedback}.` : ""}`} <br><br>
		Best Regards,<br>Admin Team`;

	sendEmail(studentEmail, emailSubject, emailBody);

	return { status: 200, message: isApproved ? "Approved and email sent." : "Rejected and student notified." };
};

module.exports = {
	getApplications,
	getApplication,
	getManualApplication,
	getFile,
	evaluateApplication,
	evaluateManualApplications
}