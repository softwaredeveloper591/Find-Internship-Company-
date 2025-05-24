const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const internshipController = require("../controllers/companyInternshipController"); 
const upload = require('../middleware/fileUploader'); 

router.get("/internships", asyncErrorHandler(internshipController.getInternships));
router.get("/internships/:id", asyncErrorHandler(internshipController.getInternship));

router.post("/companyForm/:id", upload.single('CompanyForm'), asyncErrorHandler(internshipController.uploadCompanyForm));
router.put("/internships/:id", asyncErrorHandler(internshipController.evaluateInternship));

module.exports = router;