const profileService = require("../services/studentProfileService");

const getProfile = async (req, res) => {
    const profile = await profileService.getProfile(req.user.id);
    return res.status(200).json(profile);
};

const getProfileById = async (req, res) => {
    const profile = await profileService.getProfile(req.params.studentId);
    return res.status(200).json(profile);
};

const createProfile = async (req, res) => {
    const studentId = req.user.id;
    const profilePicture = req.files?.['profilePicture']?.[0]?.path || null;
	const bannerImage = req.files?.['bannerImage']?.[0]?.path || null;

    // Parse stringified JSON fields
    const experiences = req.body.experiences ? JSON.parse(req.body.experiences) : [];
    const certificates = req.body.certificates ? JSON.parse(req.body.certificates) : [];
	const skills = req.body.skills ? JSON.parse(req.body.skills) : [];
    const languages = req.body.languages ? JSON.parse(req.body.languages) : [];

	const profileData = {
		bio: req.body.bio,
		profilePicture,
		bannerImage,
		phoneNumber: req.body.phoneNumber,
		email: req.body.email,
		webSite: req.body.webSite,
		address: req.body.address,
		experiences,
		certificates,
		skills,
		languages
	};

    const profile = await profileService.createProfile(studentId, profileData);
    return res.status(201).json({ message: "Profile created successfully", profile });
};

const updateBio = async (req, res) => {
    await profileService.updateBio(req.user.id, req.body.bio);
    return res.status(200).json({ message: "Bio updated successfully." });
};

const updatePhoneNumber = async (req, res) => {
    await profileService.updatePhoneNumber(req.user.id, req.body.phoneNumber);
    return res.status(200).json({ message: "Phone Number updated successfully." });
};

const updateEmail = async (req, res) => {
    await profileService.updateEmail(req.user.id, req.body.email);
    return res.status(200).json({ message: "Email updated successfully." });
};

const updateWebSite = async (req, res) => {
    await profileService.updateWebSite(req.user.id, req.body.webSite);
    return res.status(200).json({ message: "Web site updated successfully." });
};

const updateAddress = async (req, res) => {
    await profileService.updateAddress(req.user.id, req.body.address);
    return res.status(200).json({ message: "Address updated successfully." });
};

const updatePhoto = async (req, res) => {
	const photo = req.file ? req.file.path : null;
	
	if (!photo) {
		throw new BaseError("No picture uploaded.", 400);
	}

	await profileService.updatePhoto(req.user.id, photo);

	return res.status(200).json({ message: "Profile picture updated successfully." });
};

const deletePhoto = async (req, res) => {
	await profileService.deletePhoto(req.user.id);
};

const updateBannerImage = async (req, res) => {
    const bannerImage = req.file ? req.file.path : null;
	
	if (!bannerImage) {
		throw new BaseError("No image uploaded.", 400);
	}

	await profileService.updateBannerImage(req.user.id, bannerImage);

	return res.status(200).json({ message: "Banner iamge updated successfully." });
};

const deleteBannerImage = async (req, res) => {
	await profileService.deleteBannerImage(req.user.id);
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

// Language
const addLanguage = async (req, res) => {
	await profileService.addLanguage(req.user.id, req.body);
	return res.status(201).json({ message: "Language added succesfully."});
};

const updateLanguageLevel = async (req, res) => {
	await profileService.updateLanguageLevel(req.user.id, req.params.id, req.body.newLevel);
	return res.status(201).json({ message: "Language updated succesfully."});
};

const deleteLanguage = async (req, res) => {
    await profileService.deleteLanguage(req.params.id);
    return res.status(200).json({ message: "Language deleted successfully." });
};

const getAllSkills = async (req, res) => {
    skills = await profileService.getAllSkills();
    return res.status(200).json( skills );
};

const getAllLanguages = async (req, res) => {
    languages = await profileService.getAllLanguages();
    return res.status(200).json( languages );
};

module.exports = {
    getProfile,
	getProfileById,
	createProfile,
    updateBio,
	updatePhoneNumber,
	updateEmail,
	updateWebSite,
	updateAddress,
    updatePhoto,
	deletePhoto,
	updateBannerImage,
	deleteBannerImage,
    addExperience,
    editExperience,
    deleteExperience,
    addCertificate,
    editCertificate,
    deleteCertificate,
    addSkill,
    deleteSkill,
	addLanguage,
	updateLanguageLevel,
	deleteLanguage,
	getAllSkills,
	getAllLanguages
};
