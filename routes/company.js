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
const { error } = require("console");
const upload = multer();
const AdmZip = require("adm-zip");


const auth = require("../middleware/auth");  
const checkUserRole= require("../middleware/checkUserRole");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Document_model = require("../models/document-model");
const Student_model = require("../models/student-model");

let totalApplicationsCount = 0;
let totalInternshipsCount = 0;


async function updateTotalApplicationsCount() {
    try {
        totalApplicationsCount = await Application_model.count( 
			{ 
				where: {
					isApprovedByCompany: null	
				} 
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total applications count:', error);
    }
}

router.use(async (req, res, next) => {
    await updateTotalApplicationsCount();
    next();
});

async function updateTotalInternshipsCount() {
    try {
        totalInternshipsCount = await Application_model.count( 
			{ 
				where: {
					isSentBySecretary: true	
				} 
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total applications count:', error);
    }
}

router.use(async (req, res, next) => {
    await updateTotalInternshipsCount();
    next();
});

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
    res.render("Company/companyShareOpportunity",{ 
		usertype:"company", 
		dataValues:company.dataValues,
		totalInternshipsCount
	});
});

router.post('/company/announcement',upload.single('image'), [auth, checkUserRole('company')],async function(req,res){
    const { companyId, announcementName, description, startDate, endDate } = req.body;
	let image = null;
	const file = req.file;
	if (file) {
		image = file.buffer;
	}
  	
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
					attributes: ['username', 'id', 'year']
				}
			]
        });

        res.render("Company/applications", {
            usertype: "company",
            dataValues: company.dataValues,
            applications,
			totalInternshipsCount
        });
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
});

router.get("/company/internships",[auth,checkUserRole("company")],async function(req,res){
    try {
        const company = await Company_model.findOne({ where: { id: req.user.id } });
        const applications = await Application_model.findAll({
			where: {
				isSentBySecretary: true,
			},
            include: [
				{
                	model: Announcement_model,
                	where: { companyId: company.id },
					attributes: ['announcementName']
				},
				{
					model: Student_model,
					attributes: ['username', 'id']
				}
			]
        });

        res.render("Company/internships", {
            usertype: "company",
            dataValues: company.dataValues,
            applications,
			totalApplicationsCount
        });
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
});

router.get("/company/applications/:applicationId",[auth,checkUserRole("company")],async function(req,res){
    try {
        const company = await Company_model.findOne({ where: { id: req.user.id } });
		const applicationId = req.params.applicationId.slice(1);
        const application = await Application_model.findOne({
			where: {
				id: applicationId
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
        const document = await Document_model.findOne({
			where: { applicationId, fileType: "CV" }
		});

        res.render("Company/innerInternshipApplication", {
            usertype: "company",
            dataValues: company.dataValues,
            application,
            document,
			totalInternshipsCount
        });
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
});

router.get('/serveFile/:id', [auth, checkUserRole("company")], async (req, res) => {
    try {
      const file = await Document_model.findByPk(req.params.id);
      if (file) {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(file.data);
      } else {
        res.status(404).send('File not found');
      }
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).send('Error serving file.');
    }
});
  

router.post("/company/applications/:applicationId/fillApplicationForm",[auth,checkUserRole("company")],async function(req,res){
    try {

		let { internStartDate, internEndDate, internDuration, dutyAndTitle, workOnSaturday, workOnHoliday, day, sgk } = req.body;
		let y1,n1,y2,n2,y3,n3;

		const applicationId = req.params.applicationId;

		const document = await Document_model.findOne({
			where: { applicationId, fileType: "Application Form" },
			include: {
				model: Application_model,
				include: [
					{
						model: Announcement_model,
						include: {
							model: Company_model
						}
					},
					{
						model: Student_model
					}
				]
			}
		});

		const binaryData = document.data;
		const zip = new AdmZip(binaryData);
		let docxTemplate = zip.readAsText("word/document.xml");

		if (workOnSaturday === "yes") {
			y1 = "X", n1 = "";
		}
		else {
			y1 = "", n1 = "X";
		}

		if (workOnHoliday === "yes") {
			y2 = "X", n2 = "";
		}
		else {
			y2 = "", n2 = "X", day = "";
		}

		if (sgk === "yes") {
			y3 = "X", n3 = "";
		}
		else {
			y3 = "", n3 = "X";
		}

		docxTemplate = docxTemplate
            .replace(/«companyName»/g, document.Application.Announcement.Company.name)
            .replace(/«address»/g, document.Application.Announcement.Company.address)
			.replace(/«internStartDate»/g, internStartDate)
			.replace(/«internEndDate»/g, internEndDate)
			.replace(/«internDuration»/g, internDuration)
			.replace(/«representativeName»/g, document.Application.Announcement.Company.username)
			.replace(/«dutyAndTitle»/g, dutyAndTitle)
			.replace(/«y1»/g, y1)
			.replace(/«n1»/g, n1)
			.replace(/«y2»/g, y2)
			.replace(/«n2»/g, n2)
			.replace(/«y3»/g, y3)
			.replace(/«n3»/g, n3)
			.replace(/«day»/g, day);

		zip.updateFile("word/document.xml", Buffer.from(docxTemplate, "utf-8"));
		const updatedDocxBuffer = zip.toBuffer();
		const updatedApplicationForm = await Document_model.findOne({where: {applicationId, fileType: "Updated Application Form"}});

		if (updatedApplicationForm === null) {
			await Document_model.create({
				name:`${document.Application.Student.username}_ApplicationForm.docx`,
				applicationId,
				data: updatedDocxBuffer,
				fileType:'Updated Application Form',
				username: document.Application.Student.username
			});
		}
		else {
			await Document_model.update({ data: updatedDocxBuffer }, { where: { applicationId, fileType: "Updated Application Form" } });
            
        }
		res.send("you are okay");
		
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
});

router.put("/company/applications/:applicationId",upload.single('upload-file'),[auth,checkUserRole("company")],async function(req,res){
    try {
		const applicationId = req.params.applicationId;
		const { isApproved } = req.body; 
		const file = req.file;
		let binaryData = null;
		if(file) {
			binaryData = file.buffer;
			await Document_model.update({ name: file.originalname, data: binaryData }, { where: { applicationId, fileType: "Updated Application Form" } });
		}

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

		const emailSubject = isApproved === "true" ? 'Application Approved' : 'Application Rejected';
        const emailBody = `Hello ${application.Student.username},<br><br>
            Your application titled "${application.Announcement.announcementName}" has been ${isApproved === "true" ? "approved by company" : "rejected by company and will be removed from our system"}.<br><br>
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

		if (isApproved === "true") {
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

router.get("/company/applications/download/:applicationId/:fileType",[auth,checkUserRole("company")],async function(req,res){
    const applicationId = req.params.applicationId;
    const fileType = req.params.fileType;
    const takenDocument = await Document_model.findOne({where:{applicationId:applicationId, fileType:fileType}});

    if(!takenDocument){
        return res.status(400).json({ error: "You need to fill the form before downloading the application form." });
    }
    let filename= takenDocument.dataValues.name;
    let binaryData= takenDocument.dataValues.data;
    let contentType = 'application/octet-stream'; // Default content type
    contentType = 'image/jpeg';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(binaryData);
  });

router.get("/company",[auth,checkUserRole("company")],async function(req,res){
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
					attributes: ['username', 'id', 'year']
				}
			]
        });

        res.render("Company/applications", {
            usertype: "company",
            dataValues: company.dataValues,
            applications,
			totalInternshipsCount
        });
    } catch (err) {
        console.error("Error fetching applications:", err);
        res.status(500).send("Error fetching applications.");
    }
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