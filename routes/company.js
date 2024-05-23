const express = require("express");
const router= express.Router();
const path=require("path");
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");
const { isEmail } = require('validator');
const { Op } = require("sequelize");
const nodeMailer = require("nodemailer");
const moment = require('moment-timezone');
const fs = require('fs');
const multer= require("multer");
const upload = multer();

const auth = require("../middleware/auth");  
const checkUserRole= require("../middleware/checkUserRole");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Document_model = require("../models/document-model");
const Student_model = require("../models/student-model");

/*const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure the uploads directory exists
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage }).single('myPhoto');*/

const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { duplicate: '', email: '', password: '', confirmPassword: '' };

    if (err.message === "Passwords do not match") {
      errors.confirmPassword = 'Passwords do not match';
    }
  
    if (err.message === 'Please enter a valid email') {
      errors.email = 'Please enter a valid email';
    }
  
    if (err.message === 'Minimum password length') {
      errors.password = 'Minimum password length is 6 characters';
    }
    
    if (err.message === 'Validation error') {
      errors.duplicate = 'That email or company name is already registered';
    }
  
    return errors;
};

router.get("/company/announcement",[auth,checkUserRole("company")], async function(req,res){
    let company = await Company_model.findOne({ where: {id: req.user.id} });
    res.render("Company/companyShareOpportunity",{ usertype:"company", dataValues:company.dataValues});
});

router.post('/company/announcement',upload.single('image'), [auth, checkUserRole('company')],async function(req,res){
    const { companyId, announcementName, description, startDate, endDate } = req.body;
	const file = req.file;
  	const image = file.buffer;
    //const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
    try {
        const startDateInTurkey = moment.tz(startDate, 'Europe/Istanbul').startOf('day').toDate();
        const endDateInTurkey = moment.tz(endDate, 'Europe/Istanbul').endOf('day').toDate();
        await Announcement_model.create({
            companyId,
            announcementName,
            description,
            startDate: startDateInTurkey,
            endDate: endDateInTurkey,
            image
        });
        res.redirect('/company?action=announcement-success');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('An error occurred while creating the announcement in the database.');
    }
});

router.get("/company/applications",[auth,checkUserRole("company")],async function(req,res){
    try {
        const company = await Company_model.findOne({ where: { id: req.user.id } });
        const applications = await Application_model.findAll({
			where: {
				isApprovedByCompany: null,
			},
            include: [
				{
                	model: Announcement_model,
                	where: { companyId: company.id },
					attributes: ['announcementName']
				},
				{
					model: Student_model,
					attributes: ['username']
				}
			]
        });

        res.render("Company/applications", {
            usertype: "company",
            dataValues: company.dataValues,
            applications
        });
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
});

router.put("/company/applications/:applicationId",[auth,checkUserRole("company")],async function(req,res){
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
            Your application titled "${application.Announcement.announcementName}" has been ${isApproved ? "approved by company" : "rejected by company and will be removed from our system"}.<br><br>
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
            application.isApprovedByCompany = true;
			application.status = 1;
            await application.save();
            return res.status(200).json({ message: "Application approved." });
        } else {
            application.isApprovedByCompany = false;
			application.status = 4;
			await application.save();
            return res.status(200).json({ message: "Application rejected." });
        }
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
});

router.get("/company/announcements/download/:applicationId/:fileType",[auth,checkUserRole("company")],async function(req,res){
    const applicationId = req.params.applicationId;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{applicationId:applicationId, fileType:fileType}});
    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    const fileExtension = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
  });


router.get("/company",[auth,checkUserRole("company")],async function(req,res){
    let company = await Company_model.findOne({ where: {id: req.user.id} });
    res.render("Company/company",{ usertype:"company", dataValues:company.dataValues, action: req.query.action});
});

router.post("/signup/company",async function(req,res){
    const { name, username, email, password, address, confirmPassword } = req.body;
    const hashedPassword = await bcrypt.hash(password,10);
        try {

            if (!isEmail(email)) {
                throw Error('Please enter a valid email');
            }
        
            if (password.length < 6) {
                throw Error('Minimum password length');
            }  
      
            if (password !== confirmPassword) {
                throw Error('Passwords do not match');
            }

            await Company_model.create({
                name,
                username,
                email,
                password: hashedPassword,
                address
            });
        
            res.status(200).json({ message: "Your registration request has been sent to the admin." });
        } catch (err) {
            const errors = handleErrors(err);
            res.status(400).json({ errors });   
        }
});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
    return jwt.sign({id: id, userType:userType},'privateKey');//----------------------------------------------------------------------
}


module.exports= router;