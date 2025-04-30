const profileService = require("../services/studentProfileService");

const getProfile = async (req, res) => {
    const profile = await profileService.getProfile(req.user.id);
    return res.status(200).json(profile);
};

const createProfile = async (req, res) => {
    const studentId = req.user.id;
    const profileData = req.body;
    
    const profile = await profileService.createProfile(studentId, profileData);
    return res.status(201).json({ message: "Profile created successfully", profile });
};

const updateBio = async (req, res) => {
    await profileService.updateBio(req.user.id, req.body.bio);
    return res.status(200).json({ message: "Bio updated successfully." });
};

const updatePhoto = async (req, res) => {
    await profileService.updatePhoto(req.user.id, req.body.photo);
    return res.status(200).json({ message: "Photo updated successfully." });
};

const updateBannerImage = async (req, res) => {
    await profileService.updateBannerImage(req.user.id, req.body.bannerImage);
    return res.status(200).json({ message: "Banner image updated successfully." });
};

// Experience
const addExperience = async (req, res) => {
    await profileService.addExperience(req.user.id, req.body);
    return res.status(201).json({ message: "Experience added successfully." });
};

const editExperience = async (req, res) => {
    await profileService.editExperience(req.params.id, req.body);
    return res.status(200).json({ message: "Experience updated successfully." });
};

const deleteExperience = async (req, res) => {
    await profileService.deleteExperience(req.params.id);
    return res.status(200).json({ message: "Experience deleted successfully." });
};

// Certificate
const addCertificate = async (req, res) => {
    await profileService.addCertificate(req.user.id, req.body);
    return res.status(201).json({ message: "Certificate added successfully." });
};

const editCertificate = async (req, res) => {
    await profileService.editCertificate(req.params.id, req.body);
    return res.status(200).json({ message: "Certificate updated successfully." });
};

const deleteCertificate = async (req, res) => {
    await profileService.deleteCertificate(req.params.id);
    return res.status(200).json({ message: "Certificate deleted successfully." });
};

// Skill
const addSkill = async (req, res) => {
    await profileService.addSkill(req.user.id, req.body.skillId);
    return res.status(201).json({ message: "Skill added successfully." });
};

const deleteSkill = async (req, res) => {
    await profileService.deleteSkill(req.params.id);
    return res.status(200).json({ message: "Skill deleted successfully." });
};

module.exports = {
    getProfile,
	createProfile,
    updateBio,
    updatePhoto,
	updateBannerImage,
    addExperience,
    editExperience,
    deleteExperience,
    addCertificate,
    editCertificate,
    deleteCertificate,
    addSkill,
    deleteSkill
};
