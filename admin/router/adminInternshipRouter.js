const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const internshipController = require("../controllers/adminInternshipController"); 
const upload = require('../middleware/fileUploader'); 

router.get("/manualApplications", asyncErrorHandler(internshipController.getManualApplications));

router.put("/manualApplications/:id", upload.single('ApplicationForm'), asyncErrorHandler(internshipController.approveManualApplications));

router.get("/download/:applicationId/:fileType", asyncErrorHandler(internshipController.downloadFile));

module.exports = router;
