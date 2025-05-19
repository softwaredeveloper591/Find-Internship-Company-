const db = require("../data/db");

const postAnnouncement = async (companyId, skillIds, announcementData, image) => {
	const transaction = await db.sequelize.transaction();
	try {
		// Handle image separately
		if (image) {
			announcementData.image = image.buffer;
		}

		// Parse dates
		announcementData.startDate = moment.tz(announcementData.startDate, 'Europe/Istanbul').startOf('day').toDate();
		announcementData.endDate = moment.tz(announcementData.endDate, 'Europe/Istanbul').endOf('day').toDate();

		// Set companyId from token
		announcementData.companyId = companyId;

		// Step 1: Create Announcement
		const announcement = await db.Announcement.create(announcementData, { transaction });

		// Step 2: Add AnnouncementSkill entries
		if (skillIds.length > 0) {
			const announcementSkills = skillIds.map(skillId => ({
				announcementId: announcement.id,
				skillId,
			}));

			await db.AnnouncementSkill.bulkCreate(announcementSkills, { transaction });
		}

		// Step 3: Commit
		await transaction.commit();

		return res.status(201).json({ message: "Announcement published successfully" });
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

const getAnnouncements = async (companyId) => {
	const announcements = await db.Announcement.findAll({
		where:{companyId: companyId},
		attributes: {exclude:['companyId', 'status']}
	});
	
	return res.status(200).json({ announcements });
};

module.exports = {
	postAnnouncement,
	getAnnouncements
}