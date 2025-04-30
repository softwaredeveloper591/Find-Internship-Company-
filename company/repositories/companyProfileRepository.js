const db = require('../data/db');  

const create = async (companyId, profileData) => {
    try {
        const companyProfile = await db.CompanyProfile.create({ 
            companyId, 
            ...profileData // spread profileData properties
        });
        return companyProfile;
    } catch (error) {
        throw error;
    }
};

const getProfile = async (companyId) => {
    try {
        const profile = await db.CompanyProfile.findOne({
			where: { companyId },
			include: [
				{
					model: db.Company,
					include: [
						{ model: db.Review }
					]
				}
			]
		});		
        return profile;
    } catch (error) {
        throw error;
    }
};

const update = async (companyId, profileData) => {
    try {
        const [updated] = await db.CompanyProfile.update(profileData, {
            where: { companyId }
        });
        if (updated) {
            return await db.CompanyProfile.findOne({ where: { companyId } });
        }
        throw new Error('Company profile not found');
    } catch (error) {
        throw error;
    }
};

const updateBannerImage = async (companyId, bannerImage) => {
	return await db.CompanyProfile.update({ bannerImage }, { where: { companyId } });
}

const updateLogo = async (companyId, companyLogo) => {
	return await db.CompanyProfile.update({ companyLogo }, { where: { companyId } });
}

module.exports = {
    create,
    getProfile,
    update,
	updateBannerImage,
	updateLogo
};
