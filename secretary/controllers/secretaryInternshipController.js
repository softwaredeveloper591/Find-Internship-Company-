const internshipService = require("../services/secretaryInternshipService");

const getManualApplications = async (req, res) => {	
	const secretaryId = req.user.id;
	const manualApplications = await internshipService.getManualApplications(secretaryId);
	
	if (manualApplications?.status && manualApplications?.message) {
		return res.status(manualApplications.status).json({ message: manualApplications.message });
	}

	return res.status(200).json(manualApplications);
};

const approveManualApplications = async (req, res) => {
	const file = req.file;
	const result = await internshipService.approveManualApplications(req.params.id, req.body.isApproved, file);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json({ message: "Application approved successfully." });
};

module.exports = {
	getManualApplications,
	approveManualApplications
};