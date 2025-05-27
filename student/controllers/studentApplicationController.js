const applicationService = require("../services/studentApplicationService");

const createStudentInfo = async (req, res) => {
	const id = req.user.id;
	const body = { studentId: id, ...req.body }; // Merge user ID with request body

	const result = await applicationService.createStudentInfo(body);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(200).json({ message: "Student info created successfully" });
}

const updateStudentInfo = async (req, res) => {
	const result = await applicationService.updateStudentInfo(req.user.id, req.body);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(200).json({ message: "Student info updated successfully" });
}

const getOpportunities = async (req, res) => {
	const opportunities = await applicationService.getOpportunities(req.user.id);

	return res.status(200).json( { opportunities });
}

const getCompanyOpportunities = async (req, res) => {
	const opportunities = await applicationService.getCompanyOpportunities(req.user.id, req.params.companyId);

	return res.status(200).json( { opportunities });
}

const getOpportunitiesSkills = async (req, res) => {
	const opportunities = await applicationService.getOpportunitiesSkills(req.user.id);

	return res.status(200).json( { opportunities });
}

const getOneOpportunity = async (req, res) => {
	const opportunity = await applicationService.getOneOpportunity(req.user.id, req.params.opportunityId);

	return res.status(200).json( { opportunity });
}

const applyToAnnouncement = async (req, res) => {
	const result = await applicationService.applyToAnnouncement(req.user.id, req.params.opportunityId, req.file);
	
	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}
  
	return res.status(200).json({ message: "Applied successfully" });
}

const getApplications = async (req, res) => {
	const { applications, manualApplications } = await applicationService.getApplications(req.user.id);

	return res.status(200).json( { applications, manualApplications });
}

module.exports = {
	getCompanyOpportunities,
	createStudentInfo,
	updateStudentInfo,
	getOpportunities,
	getOpportunitiesSkills,
	getOneOpportunity,
	applyToAnnouncement,
	getApplications
};
