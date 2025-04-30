const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const profileController = require("../controllers/studentProfileController");

// Get profile
router.get("/", asyncErrorHandler(profileController.getProfile));
router.post("/", asyncErrorHandler(profileController.createProfile))

// Update bio
router.put("/bio", asyncErrorHandler(profileController.updateBio));

// Update photo and banner image
router.put("/photo", [auth, checkUserRole("student")], asyncErrorHandler(profileController.updatePhoto));
router.put("/bannerImage", [auth, checkUserRole("student")], asyncErrorHandler(profileController.updateBannerImage));

// Add, edit, delete experiences
router.post("/experience", asyncErrorHandler(profileController.addExperience));
router.put("/experience/:id", asyncErrorHandler(profileController.editExperience));
router.delete("/experience/:id", asyncErrorHandler(profileController.deleteExperience));

// Add, edit, delete certificates
router.post("/certificate", asyncErrorHandler(profileController.addCertificate));
router.put("/certificate/:id", asyncErrorHandler(profileController.editCertificate));
router.delete("/certificate/:id", asyncErrorHandler(profileController.deleteCertificate));

// Add, delete skills
router.post("/skill", asyncErrorHandler(profileController.addSkill));
router.delete("/skill/:id", asyncErrorHandler(profileController.deleteSkill));

module.exports = router;
