const db = require("../data/db");

const getProfile = async (studentId) => {
    const [profile] = await db.sequelize.query(
		`
		SELECT 
		  sp.id AS studentProfileId, 
		  sp.studentId, 
		  sp.bio, 
		  sp.profilePicture,
	  
		  -- Fetch Experiences separately
		  (
			  SELECT COALESCE(JSON_ARRAYAGG(
				JSON_OBJECT(
				  'id', e.id, 
				  'company', e.company, 
				  'pos', e.pos, 
				  'startDate', e.startDate, 
				  'endDate', e.endDate, 
				  'description', e.description,
				  'skills', (
					  SELECT COALESCE(JSON_ARRAYAGG(
						JSON_OBJECT(
						  'id', s.id, 
						  'name', s.name
						)
					  ), '[]')
					  FROM ExperienceSkill es
					  JOIN Skill s ON es.skillId = s.id
					  WHERE es.experienceId = e.id
				  )
				)
			  ), '[]')
			  FROM Experience e
			  WHERE e.studentId = sp.studentId
		  ) AS experiences,
	  
		  -- Fetch Certificates separately
		  (
			  SELECT COALESCE(JSON_ARRAYAGG(
				JSON_OBJECT(
				  'id', c.id, 
				  'title', c.title, 
				  'issuingOrganization', c.issuingOrganization, 
				  'issueDate', c.issueDate, 
				  'expirationDate', c.expirationDate, 
				  'credentialID', c.credentialID, 
				  'credentialURL', c.credentialURL
				)
			  ), '[]')
			  FROM Certificate c
			  WHERE c.studentId = sp.studentId
		  ) AS certificates,
	  
		  -- Fetch General Skills separately (Student Skills)
		  (
			  SELECT COALESCE(JSON_ARRAYAGG(
				JSON_OBJECT(
				  'id', s.id, 
				  'name', s.name
				)
			  ), '[]')
			  FROM StudentSkill ss
			  JOIN Skill s ON ss.skillId = s.id
			  WHERE ss.studentId = sp.studentId
		  ) AS skills
	  
		FROM StudentProfile sp
		WHERE sp.studentId = :studentId
		`,
		{
		  replacements: { studentId },
		  type: db.Sequelize.QueryTypes.SELECT,
		}
	  );
	  
	  // ✅ **Fix: Parse JSON manually**
	  profile.experiences = JSON.parse(profile.experiences);
	  profile.certificates = JSON.parse(profile.certificates);
	  profile.skills = JSON.parse(profile.skills);
	  
	  // If experience skills are still coming as stringified JSON, you can manually parse them like this:
	  profile.experiences.forEach(experience => {
		experience.skills = JSON.parse(experience.skills);
	  });	  
	
	console.log(profile);	  

	return profile;
};

const createProfile = async (studentId, { bio, photo, experiences = [], certificates = [], skills = [] }) => {
    const transaction = await db.sequelize.transaction();

	try {
	    // Create student profile
	    let profile = await db.StudentProfile.create(
	        { studentId, bio, photo },
	        { transaction }
	    );

	    // Create experiences and collect their IDs
	    let createdExperiences = [];
	    if (experiences.length > 0) {
	        createdExperiences = await db.Experience.bulkCreate(
	            experiences.map(exp => ({ ...exp, studentId })),
	            { transaction }
	        );
	    }

	    // Create certificates
	    if (certificates.length > 0) {
	        await db.Certificate.bulkCreate(
	            certificates.map(cert => ({ ...cert, studentId })),
	            { transaction }
	        );
	    }

	    // Insert skills
	    let skillMap = new Map();
	    if (skills.length > 0) {
	        for (const skill of skills) {
	            if (skill.id) {
	                skillMap.set(skill.name, skill.id); // Store existing skill ID
	            } else {
	                // Create new skill if it doesn't exist
	                const [newSkill] = await db.Skill.findOrCreate({
	                    where: { name: skill.name },
	                    defaults: { name: skill.name },
	                    transaction
	                });
	                skillMap.set(newSkill.name, newSkill.id);
	            }
	        }
	    }

	    // Insert student skills
	    await db.StudentSkill.bulkCreate(
	        Array.from(skillMap.values()).map(skillId => ({ studentId, skillId })),
	        { transaction }
	    );

	    // Process Experience Skills
	    let experienceSkills = [];
	    for (const experience of experiences) {
	        const createdExperience = createdExperiences.find(
	            exp => exp.pos === experience.pos && exp.company === experience.company
	        );

	        if (createdExperience && experience.skills) {
	            for (const skill of experience.skills) {
	                let skillId;

	                // If skill ID exists in request, use it
	                if (skill.id) {
	                    skillId = skill.id;
	                } else {
	                    // Otherwise, find or create skill
	                    if (!skillMap.has(skill.name)) {
	                        const [newSkill] = await db.Skill.findOrCreate({
	                            where: { name: skill.name },
	                            defaults: { name: skill.name },
	                            transaction
	                        });
	                        skillId = newSkill.id;
	                        skillMap.set(skill.name, skillId);
	                    } else {
	                        skillId = skillMap.get(skill.name);
	                    }
	                }

	                // Push ExperienceSkill record
	                experienceSkills.push({
	                    experienceId: createdExperience.id,
	                    skillId
	                });
	            }
	        }
	    }

	    // Insert Experience Skills
	    if (experienceSkills.length > 0) {
	        await db.ExperienceSkill.bulkCreate(experienceSkills, { transaction });
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
    return await db.StudentProfile.update({ profilePicture: photo }, { where: { studentId } });
};

// Experience
const addExperience = async (studentId, experienceData) => {
    const { skills = [], ...expData } = experienceData;

    const transaction = await db.sequelize.transaction();
    try {
        // Step 1: Create the experience
        const experience = await db.Experience.create(
            { ...expData, studentId },
            { transaction }
        );

        // Step 2: Add ExperienceSkill entries
        if (skills.length > 0) {
            const experienceSkills = skills.map(skillId => ({
                experienceId: experience.id,
                skillId,
            }));

            await db.ExperienceSkill.bulkCreate(experienceSkills, { transaction });
        }

        await transaction.commit();
        return experience;
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const editExperience = async (experienceId, experienceData) => {
    const { skills = [], ...expFields } = experienceData;

    const transaction = await db.sequelize.transaction();
    try {
        // Step 1: Update experience fields
        await db.Experience.update(expFields, {
            where: { id: experienceId },
            transaction,
        });

        // Step 2: Delete old ExperienceSkills
        await db.ExperienceSkill.destroy({
            where: { experienceId },
            transaction,
        });

        // Step 3: Add new ExperienceSkills
        if (skills.length > 0) {
            const experienceSkills = skills.map(skillId => ({
                experienceId,
                skillId,
            }));

            await db.ExperienceSkill.bulkCreate(experienceSkills, { transaction });
        }

        await transaction.commit();
        return { message: "Experience updated successfully" };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
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
    return await db.StudentSkill.findOrCreate({
        where: {
            studentId,
            skillId
        }
    });
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
