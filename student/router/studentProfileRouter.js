const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const profileController = require("../controllers/studentProfileController");

// Get profile
router.get("/", [auth, checkUserRole("student")], asyncErrorHandler(profileController.getProfile));
router.post("/", [auth, checkUserRole("student")], asyncErrorHandler(profileController.createProfile))

// Update bio
router.put("/bio", [auth, checkUserRole("student")], asyncErrorHandler(profileController.updateBio));

// Update photo
router.put("/photo", [auth, checkUserRole("student")], asyncErrorHandler(profileController.updatePhoto));

// Add, edit, delete experiences
router.post("/experience", [auth, checkUserRole("student")], asyncErrorHandler(profileController.addExperience));
router.put("/experience/:id", [auth, checkUserRole("student")], asyncErrorHandler(profileController.editExperience));
router.delete("/experience/:id", [auth, checkUserRole("student")], asyncErrorHandler(profileController.deleteExperience));

// Add, edit, delete certificates
router.post("/certificate", [auth, checkUserRole("student")], asyncErrorHandler(profileController.addCertificate));
router.put("/certificate/:id", [auth, checkUserRole("student")], asyncErrorHandler(profileController.editCertificate));
router.delete("/certificate/:id", [auth, checkUserRole("student")], asyncErrorHandler(profileController.deleteCertificate));

// Add, delete skills
router.post("/skill", [auth, checkUserRole("student")], asyncErrorHandler(profileController.addSkill));
router.delete("/skill/:id", [auth, checkUserRole("student")], asyncErrorHandler(profileController.deleteSkill));

module.exports = router;
