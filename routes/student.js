const express = require("express");
const router= express.Router();
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");
const auth = require("../middleware/auth");  //this auth turns yellow when I export it with a function name
const checkUserRole= require("../middleware/checkUserRole");
const multer= require("multer");
const upload= multer();
const path = require('path');
const { isEmail } = require('validator');

const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement = require("../models/announcement-model");
const Document_model = require("../models/document-model");
const Application_model = require("../models/application-model");


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
}


router.get("/student",[auth,checkUserRole("student")],async function(req,res){
  let student = await Student_model.findOne({ where: {id: req.user.id} });
  let announcements= await Announcement.findAll();  
  let companies= Company_model.findAll();   
  res.render("Student/opportunities",{ usertype:"student", dataValues:student.dataValues,announcements:announcements, companies});
})

router.get("/student/opportunities",[auth,checkUserRole("student")],async function(req,res){
  let student = await Student_model.findOne({ where: {id: req.user.id} });
  let announcements= await Announcement.findAll();  
  let companies= Company_model.findAll();     
  res.render("Student/opportunities",{ usertype:"student", dataValues:student.dataValues, announcements:announcements, companies});
});

router.get("/student/opportunities/:opportunityId",[auth,checkUserRole("student")],async function(req,res){
  let student = await Student_model.findOne({ where: {id: req.user.id} });
  let opportunityId=req.params.opportunityId.slice(1); //unfortunately I cannot get opportunityId properly here it comes with ":"
  let announcement= await Announcement.findOne({ where: {id: opportunityId} });  
  let company= Company_model.findOne({ where: {id: announcement.dataValues.companyId} });      
  res.render("Student/single-opportunity",{ usertype:"student", dataValues:student.dataValues, announcement:announcement, company});
});


router.post("/student/opportunities/:opportunityId",upload.single('CV'),[auth,checkUserRole("student")],async function(req,res){
  const studentId=req.body.studentID;
  const studentName=req.body.username;
  const announcementId=req.params.opportunityId.slice(1);
  const file =req.file;
  const binaryData = file.buffer;
  const fileType="CV";
  const name = file.originalname;
  try {
    const application = await Application_model.create({
      studentId,
      announcementId,
      status: "waiting for Company",
    });

    const document= await Document_model.create({
      name:name,
      applicationId: application.id,
      data: binaryData,
      fileType: fileType,
      studentName:studentName
    });

  }  catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while creating the application or the document.'); 
  };
});

//bu get isteği şu anda herhangi bir yerde kullanılmııyor, ilerde kullanmak için yazıldı.---hala kullanılmıyor!!!!
router.get("/student/opportunities/download/:studentId/:fileType",[auth,checkUserRole("student")],async function(req,res){
  const fileType = req.params.fileType;
  const studentId=req.params.studentId;
  const takenDocument = await Document_model.findOne({where:{studentId:studentId, fileType:fileType}});
  let filename= takenDocument.dataValues.name;
  let binaryData= takenDocument.dataValues.data;
  const fileExtension = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream'; // Default content type
  contentType = 'image/jpeg';
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', contentType);
  res.send(binaryData);
});


router.post("/signup/student",async function(req,res){
    const { username, email, password, confirmPassword } = req.body;
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

            const newStudent = await Student_model.create({ 
                username: username,
                email: email,
                password: hashedPassword
              });
              const token= createTokenWithIdandUserType(newStudent.id,"student");
              res.cookie('jwt', token);
    	        res.status(200).json({ student: newStudent.id });
        } catch (err) {
          const errors = handleErrors(err);
          res.status(400).json({ errors });  
        }
});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
  return jwt.sign({id: id, userType:userType},'privateKey');//----------------------------------------------------------------------
};

module.exports= router;