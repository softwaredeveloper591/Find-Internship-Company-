const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/asyncErrorHandler");
const internshipController = require("../controllers/secretaryInternshipController"); 
const upload = require('../middleware/fileUploader');

router.get("/manualApplications", asyncErrorHandler(internshipController.getManualApplications));

router.put("/manualApplications/:id", upload.single('EmploymentCertificate'), asyncErrorHandler(internshipController.approveManualApplications));

module.exports = router;