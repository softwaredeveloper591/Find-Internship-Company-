const profileRepository = require('../repositories/companyProfileRepository');

const createProfile = async (companyId, profileData) => {
    return await profileRepository.create(companyId, profileData);
};

const getReviews = async (companyId) => {
	return await profileRepository.getReviews(companyId);
};

const getProfile = async (companyId) => {
    return await profileRepository.getProfile(companyId);
};

const updateProfile = async (companyId, profileData) => {
    return await profileRepository.update(companyId, profileData);
};

const updateBannerImage = async (companyId, bannerImage) => {
    return await profileRepository.updateBannerImage(companyId, bannerImage);
};

const updateLogo = async (companyId, companyLogo) => {
    return await profileRepository.updateLogo(companyId, companyLogo);
};

module.exports = {
    createProfile,
    getProfile,
    updateProfile,
	updateBannerImage,
	updateLogo,
	getReviews
};
