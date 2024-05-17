const express = require("express");
const router= express.Router();
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");
const auth = require("../middleware/auth");  //this auth turns yellow when I export it with a function name
const checkUserRole= require("../middleware/checkUserRole");
const multer= require("multer");
const upload = multer();
const path = require('path');
const { isEmail } = require('validator');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

const Student_model= require("../models/student-model");
const UbysStudent_model = require("../models/ubys-student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Document_model = require("../models/document-model");
const Application_model = require("../models/application-model");


const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { duplicate: '', email: '', password: '', confirmPassword: '' };

  if (err.message === "not in ubys database") {
	errors.email = "Incorrect student email";
  }

  if (err.message === "not eligible") {
	errors.email = "That student is not eligible";
  }

  if (err.message === "not a std mail") {
	errors.email = 'This is not a valid student email';
  }

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
    errors.duplicate = 'That email is already registered';
  }

  return errors;
}

router.get("/student",[auth,checkUserRole("student")],async function(req,res){
    let student = await Student_model.findOne({ where: {id: req.user.id} });
    res.render("Student/student",{ usertype:"student", dataValues:student.dataValues});
})

router.get("/student/opportunities", [auth, checkUserRole("student")], async function(req, res) {
    try {
        const student = await Student_model.findOne({ where: { id: req.user.id }, attributes: { exclude: ['password'] } });
		const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone
		const announcements = await Announcement_model.findAll({
			where: {
				isActive: true,
				startDate: {
                    [Sequelize.Op.lte]: now // Ensure the announcement has started
                },
				id: {
					[Op.notIn]: Sequelize.literal(`(
						SELECT announcementId
						FROM application
						WHERE studentId = ${student.id}
						OR isRejected = true  
					)`)
				}
			},
			include: [
				{
					model: Company_model,
					attributes: ['name']
				}
			]
		})
		
		res.render("Student/opportunities", {
			usertype: "student",
			dataValues: student.dataValues,
			announcements
		});
		
    } catch (err) {
        console.error("Error fetching opportunities:", err);
        res.status(500).send("Error fetching opportunities.");
    }
});

router.get("/student/opportunities/:opportunityId",[auth,checkUserRole("student")],async function(req,res){
	try {
        const student = await Student_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});
		const opportunityId = req.params.opportunityId.slice(1);
        const announcement = await Announcement_model.findOne({ where: {id: opportunityId} });  

        res.render("Student/single-opportunity", {
            usertype: "student",
            dataValues: student.dataValues,
            announcement
        });
    } catch (err) {
        console.error("Error fetching announcement requests:", err);
        res.status(500).send("Error fetching announcement requests.");
    }
});

router.post("/student/opportunities/:opportunityId",upload.single('CV'),[auth,checkUserRole("student")],async function(req,res){
  const studentId=req.body.studentId;
  const studentName=req.body.studentName;
  const announcementId=req.params.opportunityId.slice(1);
  const file =req.file;
  const binaryData = file.buffer;
  const fileType="CV";
  const name = file.originalname;

  try {
    const application = await Application_model.create({
      studentId,
      announcementId,
      status: 0,
    });

    await Document_model.create({
      name,
      applicationId: application.id,
      data: binaryData,
      fileType,
      username: studentName
    });
	res.redirect("/student/opportunities");
  }  catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while creating the application or the document.'); 
  };
});

router.get("/student/applications",[auth,checkUserRole("student")],async function(req,res){
	const student = await Student_model.findOne({ where: { id: req.user.id }, attributes: {exclude: ['password']}});

	try {
        const applications = await Application_model.findAll({
			where: {
				studentId: student.dataValues.id  // Filter applications by the provided student ID
			},
			include: [
				{
					model: Student_model,
					attributes: ['username'] // Fetching only the student name
				},
				{
					model: Announcement_model,
					attributes: ['announcementName'] // Fetching only the announcement (opportunity) name
				}
			],
		});

		res.render("Student/applications", {
			usertype: "student",
			dataValues: student.dataValues,
			applications,
			message: applications.length > 0 ? '' : "You haven't applied for any internships yet."
		});
    }
	catch (err) {
        console.error("Error fetching announcement requests:", err);
        res.status(500).send("Error fetching announcement requests.");
    }
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
    const { email, password, confirmPassword } = req.body;
    const hashedPassword = await bcrypt.hash(password,10);

	const mail = email;
    const parts = mail.split("@");
    const domain = parts[1]; 

        try {

			if (!isEmail(email)) {
            	throw Error('Please enter a valid email');
          	}

			if (domain !== "std.iyte.edu.tr") {
				throw Error('not a std mail');
			}

			const ubysStudent = await UbysStudent_model.findOne({ where: { email } });

			if(!ubysStudent) {
				throw Error('not in ubys database');
			}
  
			if(ubysStudent.department !== "CENG" || ubysStudent.year < 3) {
				throw Error('not eligible');
			}
        
          	if (password.length < 6) {
           	 	throw Error('Minimum password length');
          	}  
        
          	if (password !== confirmPassword) {
            	throw Error('Passwords do not match');
          	}

            const newStudent = await Student_model.create({ 
                username: ubysStudent.student_name,
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