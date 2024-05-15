const express = require("express");
const router= express.Router();
const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole")
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const nodeMailer = require("nodemailer");
const cron = require('node-cron');
const { Sequelize } = require('sequelize');

async function deleteExpiredAnnouncements() {
    try {
        const now = new Date();
        const result = await Announcement_model.destroy({
            where: {
                approvedAt: {
                    [Sequelize.Op.ne]: null // Ensure the announcement has been approved
                },
                [Sequelize.Op.and]: [
                    Sequelize.where(
                        Sequelize.fn('DATE_ADD', Sequelize.col('approvedAt'), Sequelize.literal('INTERVAL `duration` DAY')),
                        '<=',
                        now
                    )
                ]
            }
        });
        console.log(`Deleted ${result} expired announcements.`);
    } catch (error) {
        console.error('Failed to delete expired announcements:', error);
    }
}

cron.schedule('0 0 * * *', deleteExpiredAnnouncements);

router.get("/admin", [auth, checkUserRole("admin")], async function (req, res) {
    try {
        let admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
        const announcements = await Announcement_model.findAll({ where: { approvedAt: null } });

        res.render("Admin/announcementRequests", {
            usertype: "admin",
            dataValues: admin.dataValues,
            announcements
        });
    } catch (err) {
        console.error("Error loading admin dashboard:", err);
        res.status(500).send("Error loading admin dashboard.");
    }

});

router.get("/admin/announcementRequests", [auth, checkUserRole("admin")], async (req, res) => {
    try {
		const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
		Announcement_model.findAll({
			where: {
				approvedAt: null
			},
			include: [
				{
					model: Company_model,
					attributes: ['name'] 
				}
			],
			attributes: ['id', 'announcementName', 'description', 'duration']
		}).then(announcements => {
			const formattedAnnouncements = announcements.map(app => ({
				announcementId: app.id,
       			announcementName: app.announcementName,
       			description: app.description,
       			duration: app.duration,
				name: app.Company ? app.Company.name : 'Unknown Company'
			}));

			res.render("Admin/announcementRequests", {
				usertype: "admin",
				dataValues: admin.dataValues,
				formattedAnnouncements
			});
		})
    } catch (err) {
        console.error("Error fetching announcement requests:", err);
        res.status(500).send("Error fetching announcement requests.");
    }
});

router.put("/admin/announcement/:announcementId", [auth, checkUserRole("admin")], async function (req, res) {
    const announcementId = req.params.announcementId;
    const isApproved = req.body.isApproved === "true"; 

    try {
        const announcement = await Announcement_model.findOne({ where: { id: announcementId } });

        if (!announcement) {
            return res.status(404).json({ errors: "Announcement not found." });
        }

        const company = await Company_model.findOne({ where: { id: announcement.companyId } });

        const emailSubject = isApproved ? 'Announcement Approved' : 'Announcement Rejected';
        const emailBody = `Hello ${company.username},<br><br>
            Your announcement titled "${announcement.announcementName}" has been ${isApproved ? "approved" : "rejected and will be removed from our system"}.<br><br>
            Best Regards,<br>Admin Team`;

        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'enesbilalbabaturalpro06@gmail.com',
                pass: 'elde beun xhtc btxu'
            }
        });

        await transporter.sendMail({
            from: '"Buket Erşahin" <enesbilalbabaturalpro06@gmail.com>',
            to: company.email,
            subject: emailSubject,
            html: emailBody
        });

        if (!isApproved) {
            await announcement.destroy();
            return res.status(200).json({ message: "Announcement rejected and removed from the system." });
        }

        announcement.approvedAt = new Date();
        await announcement.save();
        res.status(200).json({ message: "Announcement approved." });

    } catch (err) {
        console.error("Error processing announcement:", err);
        res.status(400).json({ errors: "Unable to process the announcement." });
    }
});

router.get("/admin/companyRequests", [auth, checkUserRole("admin")], async (req, res) => {
    try {
        let admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
        const pendingCompanies = await Company_model.findAll({ where: { statusByDIC: false } });

        res.render("Admin/companyRequests", {
            usertype: "admin",
            dataValues: admin.dataValues,
            companies: pendingCompanies
        });
    } catch (err) {
        console.error("Error fetching company registration requests:", err);
        res.status(500).send("Error fetching company registration requests.");
    }
});

router.put("/admin/company/:companyId", [auth, checkUserRole("admin")], async function (req, res) {
    const companyId = req.params.companyId;
    const isApproved = req.body.isApproved === true;

    try {
        const company = await Company_model.findOne({ where: { id: companyId } });

        if (!company) {
            return res.status(404).json({ errors: "Company not found." });
        }

        const emailSubject = isApproved ? 'Company Registration Approved' : 'Company Registration Rejected';
        const emailBody = `Hello ${company.username},<br><br>
            Your registration request has been ${isApproved ? "approved" : "rejected and removed from our system"}.<br><br>
            Best Regards,<br>Admin Team`;

        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'enesbilalbabaturalpro06@gmail.com', 
                pass: 'elde beun xhtc btxu'
            }
        });

        await transporter.sendMail({
            from: '"Buket Erşahin" <enesbilalbabaturalpro06@gmail.com>',
            to: company.email,
            subject: emailSubject,
            html: emailBody
        });

        if (!isApproved) {
            await company.destroy();
            return res.status(200).json({ message: "Company registration request rejected and deleted." });
        }

        company.statusByDIC = true;
        await company.save();
        res.status(200).json({ message: "Company registration request approved." });

    } catch (err) {
        console.error("Error processing company registration request:", err);
        res.status(400).json({ errors: "Unable to process the request." });
    }
});

module.exports= router;