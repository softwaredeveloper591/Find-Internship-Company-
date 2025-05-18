const profileService = require('../services/companyProfileService');

const getProfile = async (req, res) => {
    const profile = await profileService.getProfile(req.user.id);
    return res.status(200).json(profile);
};

const getProfileById = async (req, res) => {
	const profile = await profileService.getProfile(req.params.companyId);
    return res.status(200).json(profile);
}

const createProfile = async (req, res) => {
	const companyId = req.user.id;
    const companyLogo = req.files?.['companyLogo']?.[0]?.path || null;
	const bannerImage = req.files?.['bannerImage']?.[0]?.path || null;

    const profileData = {
		about: req.body.about,
        industry: req.body.industry,
		companyLogo,
		bannerImage,
		contactPhone: req.body.contactPhone,
		contactEmail: req.body.contactEmail,
		website: req.body.website,
		address: req.body.address,
        socialMediaLinks: req.body.socialMediaLinks
	};

    const profile = await profileService.createProfile(companyId, profileData);
	return res.status(201).json({ message: "Profile created successfully", profile });
};

const updateProfile = async (req, res) => {
    const updatedProfile = await profileService.updateProfile(req.user.id, req.body);
    return res.status(200).json({ message: "Profile updated succesfully", updatedProfile });
};

const updateBannerImage = async (req, res) => {
	const bannerImage = req.file ? req.file.path : null;

    if (!bannerImage) {
        throw new BaseError("No logo uploaded.", 400);
    }

    await profileService.updateBannerImage(req.user.id, bannerImage);

    return res.status(200).json({ message: "Banner image updated successfully." });
}

const updateLogo = async (req, res) => {
	const companyLogo = req.file ? req.file.path : null;

    if (!companyLogo) {
        throw new BaseError("No logo uploaded.", 400);
    }

    await profileService.updateLogo(req.user.id, companyLogo);

    return res.status(200).json({ message: "Logo updated successfully." });
}

module.exports = {
    createProfile,
	getProfileById,
    getProfile,
    updateProfile,
	updateBannerImage,
	updateLogo
};
