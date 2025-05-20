const express = require("express");
const router = express.Router();
const asyncErrorHandler = require("../utils/errors/asyncErrorHandler");
const applicationController = require("../controllers/companyApplicationController"); 
const uploadFile = require('../middleware/fileUploader'); 
const uploadImage = require('../middleware/imageUploader'); 

router.post("/announcement", uploadImage.single('image'), asyncErrorHandler(applicationController.postAnnouncement));

router.get("/announcements", asyncErrorHandler(applicationController.getAnnouncements));
router.get("/announcements/:id", asyncErrorHandler(applicationController.getAnnouncement));

router.put("/announcements/:id", uploadImage.single('image'), asyncErrorHandler(applicationController.updateAnnouncement));

router.get("/applications", asyncErrorHandler(applicationController.getApplications));
router.get("/applications/:id", asyncErrorHandler(applicationController.getApplication));

router.post("/applications/:id/fillApplicationForm", asyncErrorHandler(applicationController.fillApplicationForm));

router.put("/applications/:id", uploadFile.single('upload-file'), asyncErrorHandler(applicationController.uploadApplicationForm));

router.get("/applications/download/:id/:fileType", asyncErrorHandler(applicationController.downloadFile));

module.exports = router;