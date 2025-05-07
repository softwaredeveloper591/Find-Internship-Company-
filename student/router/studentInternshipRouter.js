const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const internshipController = require("../controllers/studentInternshipController");
const upload = require('../middleware/fileUploader'); 

// The page where all file operations are performed
router.get("/files", asyncErrorHandler(internshipController.getFiles));

// Upload application form
router.post("/applicationForm", upload.single('ApplicationForm'), asyncErrorHandler(internshipController.uploadApplicationForm));

router.put("/finishInternship", asyncErrorHandler(internshipController.finishInternship));

router.post("/requestLink", asyncErrorHandler(internshipController.requestLink));

module.exports = router;
