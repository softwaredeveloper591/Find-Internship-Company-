const internshipService = require("../services/adminInternshipService");

const getManualApplications = async (req, res) => {	
	const manualApplications = await internshipService.getManualApplications(req.user.id);
	return res.status(200).json( manualApplications );
};

const approveManualApplications = async (req, res) => {
	const result = await internshipService.approveManualApplications(req.params.id, req.params.studentId, req.body.isApproved, req.file);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json({ message: "Application approved successfully." });
};

const downloadFile = async (req, res) => {
	const { applicationId, fileType } = req.params;

	const whereClause = {
		fileType
	};

	// Determine whether to use manualApplicationId or applicationId
	if (fileType.startsWith("Manual")) {
		whereClause.manualApplicationId = applicationId;
	} else {
		whereClause.applicationId = applicationId;
	}

  	const document = await internshipService.downloadFile( whereClause );

  	if (!document) {
  	  throw new Error("There is no such document.");
  	}

  	const { name, data } = document;
  	const contentType = 'image/jpeg'; // You can make this dynamic if needed

  	res.header('Access-Control-Expose-Headers', 'Content-Disposition');
  	res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(name));
  	res.setHeader('Content-Type', contentType);
  	res.send(data);
}

const getLinkRequests = async (req, res) => {
	const linkRequests = await internshipService.getLinkRequests();
	return res.status(200).json( linkRequests );
}

const approveLinkRequest = async (req, res) => {
	const result = await internshipService.approveLinkRequest(req.params.id, req.body.isApproved);

	if (result?.status && result?.message) {
		return res.status(result.status).json({ message: result.message });
	}

	return res.status(200).json({ message: "Link request approved successfully." });
}

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile,
	getLinkRequests,
	approveLinkRequest
};