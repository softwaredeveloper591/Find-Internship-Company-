const express = require("express");
const router= express.Router();
const path=require("path");
const Company_model= require("../models/company-model");
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");
const auth = require("../middleware/auth");  
const checkUserRole= require("../middleware/checkUserRole");
const Announcement = require("../models/announcement-model");
const Application_model = require("../models/application-model");
const Document_model = require("../models/document-model");
const { isEmail } = require('validator');

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
  
    if (err.message === 'incorrect email') {
      errors.email = 'That email is not registered';
    }
    
    // duplicate email error
    if (err.message === 'Validation error') {
      errors.duplicate = 'That email or company name is already registered';
    }
  
    // validation errors
    if (err.message.includes('user validation failed')) {
      // console.log(err);
      Object.values(err.errors).forEach(({ properties }) => {
        // console.log(val);
        // console.log(properties);
        errors[properties.path] = properties.message;
      });
    }
  
    return errors;
};



router.get("/company/announcement",[auth,checkUserRole("company")], async function(req,res){
    let company = await Company_model.findOne({ where: {id: req.user.id} });
    res.render("Company/companyShareOpportunity",{ usertype:"company", dataValues:company.dataValues});
});

router.post("/company/announcement",[auth,checkUserRole("company")], async function(req,res){
    const { companyId, name, description, startDate , endDate } = req.body;
    console.log(companyId, name, description, startDate , endDate);
    try {
        const newAnnouncement = await Announcement.create({
            companyId:companyId,
            name: name,
            description: description,
            startDate: startDate,
            endDate: endDate
          });
        res.redirect("/company?action=formfilled");
        
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred while creating the announcement in database.');   
    }
});

router.get("/company/applications",[auth,checkUserRole("company")],async function(req,res){
    let company = await Company_model.findOne({ where: {id: req.user.id} });
    let applications = await Application_model.findAll();
    res.render("Company/applications",{ usertype:"company", dataValues:company.dataValues, applications:applications});
})

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
    res.render("Company/applications",{ usertype:"company", dataValues:company.dataValues, action: req.query.action});
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

            const newCompany = await Company_model.create({
                name: name,
                username: username,
                email: email,
                password: hashedPassword,
                address: address
              });
            const token= createTokenWithIdandUserType(newCompany.id,"company");
            res.cookie('jwt', token);
            res.status(200).json({ company: newCompany.id });

        } catch (err) {
            const errors = handleErrors(err);
            res.status(400).json({ errors });   
        }
});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
    return jwt.sign({id: id, userType:userType},'privateKey');//----------------------------------------------------------------------
}


module.exports= router;