const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const internshipController = require("../controllers/adminInternshipController"); 

router.get("/download/:id/:applicationType/:fileType", asyncErrorHandler(internshipController.downloadFile));

router.get("/linkRequests", asyncErrorHandler(internshipController.getLinkRequests));
router.put("/approveLinkRequest/:id", asyncErrorHandler(internshipController.approveLinkRequest));

router.get("/internships", asyncErrorHandler(internshipController.getInternships));
router.get("/internships/:id", asyncErrorHandler(internshipController.getInternship));
router.put("/internships/:id", asyncErrorHandler(internshipController.evaluateInternship));

module.exports = router;
