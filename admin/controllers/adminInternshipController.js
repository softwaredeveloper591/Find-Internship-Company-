const internshipService = require("../services/adminInternshipService");

const getManualApplications = async (req, res) => {	
	const adminId = req.user.id;
	const manualApplications = await internshipService.getManualApplications(adminId);
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

module.exports = {
    getManualApplications,
	approveManualApplications,
	downloadFile
};