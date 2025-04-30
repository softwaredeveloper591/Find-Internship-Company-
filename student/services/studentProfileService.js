const profileRepository = require("../repositories/studentProfileRepository");

const getProfile = async (studentId) => {
    return await profileRepository.getProfile(studentId);
};

const createProfile = async (studentId, profileData) => {
    return await profileRepository.createProfile(studentId, profileData);
};

const updateBio = async (studentId, bio) => {
    return await profileRepository.updateBio(studentId, bio);
};

const updatePhoto = async (studentId, photo) => {
    return await profileRepository.updatePhoto(studentId, photo);
};

const updateBannerImage = async (studentId, bannerImage) => {
    return await profileRepository.updateBannerImage(studentId, bannerImage);
};

// Experience
const addExperience = async (studentId, experienceData) => {
    return await profileRepository.addExperience(studentId, experienceData);
};

const editExperience = async (experienceId, experienceData) => {
    return await profileRepository.editExperience(experienceId, experienceData);
};

const deleteExperience = async (experienceId) => {
    return await profileRepository.deleteExperience(experienceId);
};

// Certificate
const addCertificate = async (studentId, certificateData) => {
    return await profileRepository.addCertificate(studentId, certificateData);
};

const editCertificate = async (certificateId, certificateData) => {
    return await profileRepository.editCertificate(certificateId, certificateData);
};

const deleteCertificate = async (certificateId) => {
    return await profileRepository.deleteCertificate(certificateId);
};

// Skill
const addSkill = async (studentId, skillId) => {
    return await profileRepository.addSkill(studentId, skillId);
};

const deleteSkill = async (skillId) => {
    return await profileRepository.deleteSkill(skillId);
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
