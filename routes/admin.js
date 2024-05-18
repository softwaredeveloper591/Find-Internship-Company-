const express = require("express");
const router= express.Router();
const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole")
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Student_model = require("../models/student-model");
const nodeMailer = require("nodemailer");
const cron = require('node-cron');
const { Sequelize } = require('sequelize');
const moment = require('moment-timezone');

async function deactivateExpiredAnnouncements() {
    try {
        const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
        const result = await Announcement_model.update(
            { isActive: false }, // Set isActive to false
            {
                where: {
                    endDate: {
                        [Sequelize.Op.lte]: now // Check if the current time is greater than or equal to endDate
                    },
                    isActive: true // Only update active announcements
                }
            }
        );
        console.log(`Deactivated ${result[0]} expired announcements.`);
    } catch (error) {
        console.error('Failed to deactivate expired announcements:', error);
    }
}

cron.schedule('0 0 * * *', deactivateExpiredAnnouncements);

router.get("/admin", [auth, checkUserRole("admin")], async function (req, res) {
    try {
        const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});

        res.render("Admin/admin", {
            usertype: "admin",
            dataValues: admin.dataValues
        });
    } catch (err) {
        console.error("Error loading admin dashboard:", err);
        res.status(500).send("Error loading admin dashboard.");
    }

});

router.get("/admin/announcementRequests", [auth, checkUserRole("admin")], async (req, res) => {

    try {
		const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
		const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
		
		const announcements = await Announcement_model.findAll({
			where: {
				isActive: false,
				endDate: {
					[Sequelize.Op.gt]: now // Check if the current time is less than the endDate
				}
			},
			include: [
				{
					model: Company_model,
					attributes: ['name'] 
				}
			]
		})

		res.render("Admin/announcementRequests", {
			usertype: "admin",
			dataValues: admin.dataValues,
			announcements
		});
    } catch (err) {
        console.error("Error fetching announcement requests:", err);
        res.status(500).send("Error fetching announcement requests.");
    }
});

router.put("/admin/announcement/:announcementId", [auth, checkUserRole("admin")], async function (req, res) {
    const announcementId = req.params.announcementId;
    const isApproved = req.body.isApproved; 

    try {
        const announcement = await Announcement_model.findOne({
			where: {
				id: announcementId
			},
			include: [
				{
					model: Company_model,
					attributes: ['username', 'email'] 
				}
			]
		})

        if (!announcement) {
            return res.status(404).json({ errors: "Announcement not found." });
        }

        const emailSubject = isApproved ? 'Announcement Approved' : 'Announcement Rejected';
        const emailBody = `Hello ${announcement.Company.username},<br><br>
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
            to: announcement.Company.email,
            subject: emailSubject,
            html: emailBody
        });

        if (!isApproved) {
			await Announcement_model.destroy({ where: { id: announcement.id } });
			return res.status(200).json({ message: "Announcement rejected and removed from the system." });
        }

		announcement.isActive = true;
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
    const isApproved = req.body.isApproved;

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

router.get("/admin/applicationRequests", [auth, checkUserRole("admin")], async (req, res) => {
    try {
        const admin = await Admin_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
        const applications = await Application_model.findAll({
			where: {
				isApprovedByCompany: true,
				isApprovedByDIC: null			
			},
            include: [
				{
                	model: Announcement_model,
					attributes: ['announcementName']
				},
				{
					model: Student_model,
					attributes: ['username']
				}
			]
        });

		res.render("Admin/applicationRequests", {
            usertype: "admin",
            dataValues: admin.dataValues,
            applications
        });
    } catch (err) {
        console.error("Error fetching company registration requests:", err);
        res.status(500).send("Error fetching company registration requests.");
    }
});

router.put("/admin/applications/:applicationId",[auth,checkUserRole("admin")],async function(req,res){
    try {
		const applicationId = req.params.applicationId;
		const isApproved = req.body.isApproved; 

		const application = await Application_model.findOne({
			where: {
				id: applicationId
			},
            include: [
				{
                	model: Student_model,
					attributes: ['username', 'email']
				},
				{
                	model: Announcement_model,
					attributes: ['announcementName']
				}
			]
        });

		const emailSubject = isApproved ? 'Application Approved' : 'Application Rejected';
        const emailBody = `Hello ${application.Student.username},<br><br>
            Your application titled "${application.Announcement.announcementName}" has been ${isApproved ? "approved by admin" : "rejected by company and will be removed from our system"}.<br><br>
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
            to: application.Student.email,
            subject: emailSubject,
            html: emailBody
        });

		if (isApproved) {
            application.isApprovedByDIC = true;
			application.status = 2;
            await application.save();
            return res.status(200).json({ message: "Application approved." });
        } else {
            application.isApprovedByDIC = false;
			application.status = 4;
			await application.save();
            return res.status(200).json({ message: "Application rejected." });
        }
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
});

module.exports= router;