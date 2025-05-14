const express = require('express');
const profileController = require('../controllers/companyProfileController');
const auth = require("../middleware/auth");
const checkUserRole = require("../middleware/checkUserRole");
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const upload = require('../middleware/imageUploader'); 
const router = express.Router();

// Get, create, update company profile
router.get("/", [auth, checkUserRole("company")], asyncErrorHandler(profileController.getProfile));
router.post("/", [auth, checkUserRole("company")], asyncErrorHandler(profileController.createProfile));
router.put("/", [auth, checkUserRole("company")], asyncErrorHandler(profileController.updateProfile));

// Get company profile by companyId
router.get("/:companyId", [auth, checkUserRole("company")], asyncErrorHandler(profileController.getProfileById));

// Update logo
router.put("/logo", upload.single('companyLogo'), [auth, checkUserRole("company")], asyncErrorHandler(profileController.updateLogo));

// Update banner image
router.put("/bannerImage", upload.single('bannerImage'), [auth, checkUserRole("company")], asyncErrorHandler(profileController.updateBannerImage));

module.exports = router;
