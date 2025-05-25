const db = require("../data/db");
const moment = require('moment-timezone');
const { Sequelize } = require('sequelize');

const getAnnouncements = async () => {
	const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone

	const announcements = await db.Announcement.findAll({
		where: {
			status: {
				[Sequelize.Op.in]: ["pending", "edited"] 
			},
			endDate: {
				[Sequelize.Op.gt]: now // Check if the current time is less than the endDate
			}
		},
		include: [
			{
				model: db.Company,
				attributes: ['name']
			}
		]
	})

	const announcementsWithDates = announcements.map(announcement => {
		return {
			...announcement.dataValues,
			formattedStartDate: moment(announcement.startDate).tz('Europe/Istanbul').format('DD/MM/YYYY'),
			formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD/MM/YYYY')
		};
	});

	return announcementsWithDates;
};

const getAnnouncement = async (id) => {

	const announcement = await db.Announcement.findOne({
		where: { id },
		include: [
			{ 
				model: db.Company, 
				attributes: ['name'] 
			},
			{
				model: db.Skill,
				as: 'skillId_Skills', // Make sure this matches your association alias
				through: { attributes: [] }, // hide join table columns
				attributes: ['id', 'name'], // customize skill fields if needed
			}
		]
	});

	if (!announcement) {
		throw new Error('Announcement not found');
	}

	const formattedAnnouncement = {
		...announcement.dataValues,
		formattedStartDate: moment(announcement.startDate).tz('Europe/Istanbul').format('DD/MM/YYYY'),
		formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD/MM/YYYY')
	};

	return formattedAnnouncement;
};

const approveAnnouncement = async (id, isApproved) => {
	const announcement = await db.Announcement.findOne({
		where: {
			id
		},
		include: [
			{
				model: db.Company,
				attributes: ['name', 'email']
			}
		]
	})

	if (!announcement) {
		return res.status(404).json({ message: "Announcement not found." });
	}

	if (!isApproved) {
		await db.Announcement.destroy({ where: { id } });
		return { 
			status: 200,
			data: {
				companyEmail: announcement.Company.email,
				companyName: announcement.Company.name,
				announcementName: announcement.announcementName
			},
			message: "Announcement rejected and removed from the system."
		}
	}

	announcement.status = "approved";
	await announcement.save();

	return { 
		status: 200, 
		data: {
			companyEmail: announcement.Company.email,
			companyName: announcement.Company.name,
			announcementName: announcement.announcementName
		},
		message: "Announcement approved"
	}
};

module.exports = {
	getAnnouncements,
	getAnnouncement,
	approveAnnouncement
}