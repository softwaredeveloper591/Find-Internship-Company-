const db = require("../data/db");

const getProfile = async (studentId) => {
    const profile = await db.StudentProfile.findOne({
		where: { studentId },
		include: [
			{ model: db.Experience, as: 'Experiences', required: false },
			{ model: db.Certificate, as: 'Certificates', required: false },
			{ model: db.Skill, as: 'skillId_Skill_StudentSkills', through: { attributes: [] }, required: false }
		]
	});	

	console.log(profile);

	return profile;
};

const createProfile = async (studentId, { bio, photo, experiences = [], certificates = [], skills = [] }) => {
    const transaction = await db.sequelize.transaction();

    try {
        // Create or update student profile
        let profile = await db.StudentProfile.create(
            { studentId, bio, photo },
            { transaction }
        );

        // Add experiences
        if (experiences.length > 0) {
            await db.Experience.bulkCreate(
                experiences.map(exp => ({ ...exp, studentId })),
                { transaction }
            );
        }

        // Add certificates
        if (certificates.length > 0) {
            await db.Certificate.bulkCreate(
                certificates.map(cert => ({ ...cert, studentId })),
                { transaction }
            );
        }

        // Add skills
        if (skills.length > 0) {
            await db.StudentSkill.bulkCreate(
                skills.map(skillId => ({ studentId, skillId })),
                { transaction }
            );
        }

        await transaction.commit();
        return profile;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const updateBio = async (studentId, bio) => {
    return await db.StudentProfile.update({ bio }, { where: { studentId } });
};

const updatePhoto = async (studentId, photo) => {
    return await db.StudentProfile.update({ photo }, { where: { studentId } });
};

// Experience
const addExperience = async (studentId, experienceData) => {
    return await db.Experience.create({ ...experienceData, studentId });
};

const editExperience = async (experienceId, experienceData) => {
    return await db.Experience.update(experienceData, { where: { id: experienceId } });
};

const deleteExperience = async (experienceId) => {
    return await db.Experience.destroy({ where: { id: experienceId } });
};

// Certificate
const addCertificate = async (studentId, certificateData) => {
    return await db.Certificate.create({ ...certificateData, studentId });
};

const editCertificate = async (certificateId, certificateData) => {
    return await db.Certificate.update(certificateData, { where: { id: certificateId } });
};

const deleteCertificate = async (certificateId) => {
    return await db.Certificate.destroy({ where: { id: certificateId } });
};

// Skill
const addSkill = async (studentId, skillId) => {
    return await db.StudentSkill.create({ studentId, skillId });
};

const deleteSkill = async (skillId) => {
    return await db.StudentSkill.destroy({ where: { skillId } });
};

module.exports = {
    getProfile,
	createProfile,
    updateBio,
    updatePhoto,
    addExperience,
    editExperience,
    deleteExperience,
    addCertificate,
    editCertificate,
    deleteCertificate,
    addSkill,
    deleteSkill
};
