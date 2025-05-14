const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const profileController = require("../controllers/studentProfileController");
const upload = require('../middleware/imageUploader'); 

// Get profile
router.get("/", asyncErrorHandler(profileController.getProfile));
router.post("/", upload.fields([
		{ name: 'profilePicture', maxCount: 1 },
    	{ name: 'bannerImage', maxCount: 1 }
  	]), 
  	asyncErrorHandler(profileController.createProfile));

// Update bio, phoneNumber, email, webSite, address
router.put("/bio", asyncErrorHandler(profileController.updateBio));
router.put("/phoneNumber", asyncErrorHandler(profileController.updatePhoneNumber));
router.put("/email", asyncErrorHandler(profileController.updateEmail));
router.put("/webSite", asyncErrorHandler(profileController.updateWebSite));
router.put("/address", asyncErrorHandler(profileController.updateAddress));

// Update photo and banner image
router.put("/photo", upload.single('profilePicture'), asyncErrorHandler(profileController.updatePhoto));
router.put("/bannerImage", upload.single('bannerImage'), asyncErrorHandler(profileController.updateBannerImage));

router.delete("/photo", asyncErrorHandler(profileController.deletePhoto));
router.delete("/bannerImage", asyncErrorHandler(profileController.deleteBannerImage));

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

// Add, delete languages
router.post("/language", asyncErrorHandler(profileController.addLanguage));
router.put("/language/:id", asyncErrorHandler(profileController.updateLanguageLevel));
router.delete("/language/:id", asyncErrorHandler(profileController.deleteLanguage));

router.get("/skills", asyncErrorHandler(profileController.getAllSkills));
router.get("/languages", asyncErrorHandler(profileController.getAllLanguages));

// Get student profile by studentId
router.get("/:studentId", asyncErrorHandler(profileController.getProfileById));

module.exports = router;
