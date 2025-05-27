const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const applicationController = require("../controllers/studentApplicationController");
const upload = require('../middleware/fileUploader'); 

router.post("/createStudentInfo", asyncErrorHandler(applicationController.createStudentInfo));
router.put("/updateStudentInfo", asyncErrorHandler(applicationController.updateStudentInfo));

router.get("/opportunities", asyncErrorHandler(applicationController.getOpportunities));
router.get("/opportunities/matchingSkills", asyncErrorHandler(applicationController.getOpportunitiesSkills));
router.get("/opportunities/:opportunityId", asyncErrorHandler(applicationController.getOneOpportunity));

router.get("/opportunities/company/:companyId", asyncErrorHandler(applicationController.getCompanyOpportunities));

router.post("/opportunities/:opportunityId", upload.single('CV'), asyncErrorHandler(applicationController.applyToAnnouncement));

router.get("/applications", asyncErrorHandler(applicationController.getApplications));

module.exports = router;
