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
const bodyParser = require('body-parser');
const AdmZip = require("adm-zip");
const axios = require('axios');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement_model = require("../models/announcement-model");
const Document_model = require("../models/document-model");
const Application_model = require("../models/application-model");

let totalAnnouncementsCount = 0;

async function updateTotalAnnouncementsCount() {
    try {
        totalAnnouncementsCount = await Announcement_model.count( 
			{ 
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
						)`)
					}
				}
			} 
		);
    } catch (error) {
        console.error('Failed to fetch total applications count:', error);
    }
}

router.use(async (req, res, next) => {
    await updateTotalAnnouncementsCount();
    next();
});

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
    const student = await Student_model.findOne({ where: {id: req.user.id} });
    res.render("Student/student",{ 
		usertype:"student", 
		dataValues:student.dataValues,
		totalAnnouncementsCount
	});
})

router.get("/student/opportunities", [auth, checkUserRole("student")], async function(req, res) {

    try {
        const student = await Student_model.findOne({ where: { id: req.user.id }});
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
                    )`)
                }
            },
            include: [
                {
                    model: Company_model,
                    attributes: ['name']
                }
            ]
        });

        const formattedAnnouncements = announcements.map(announcement => ({
            ...announcement.dataValues,
            formattedEndDate: moment(announcement.endDate).tz('Europe/Istanbul').format('DD MM YYYY'),
			image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
        }));

        res.render("Student/opportunities", {
            usertype: "student",
            dataValues: student.dataValues,
            announcements: formattedAnnouncements
        });
    } catch (err) {
        console.error("Error fetching opportunities:", err);
        res.status(500).send("Error fetching opportunities.");
    }
});

router.get("/student/opportunities/:opportunityId",[auth,checkUserRole("student")],async function(req,res){
	try {
        const student = await Student_model.findOne({ where: { id: req.user.id }});
		const opportunityId = req.params.opportunityId.slice(1);
		const now = moment.tz('Europe/Istanbul').toDate(); // Get current time in Turkey time zone

        const announcement = await Announcement_model.findOne({ 
			where: {
				id: opportunityId,
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

		const formattedAnnouncement = {
			...announcement.dataValues,
			image: announcement.image ? `data:image/png;base64,${announcement.image.toString('base64')}` : null
		};

        res.render("Student/apply", {
            usertype: "student",
            dataValues: student.dataValues,
            announcement: formattedAnnouncement
        });
    } catch (err) {
        console.error("Error fetching announcement requests:", err);
        res.status(500).send("Error fetching announcement requests.");
    }
});

router.post("/student/opportunities/:opportunityId",upload.single('CV'),[auth,checkUserRole("student")],async function(req,res){
	const student = await Student_model.findOne( { where: { id: req.user.id }} );

  	const announcementId=req.params.opportunityId.slice(1);
  	const file = req.file;
  	const binaryData = file.buffer;
  	const fileType="CV";
  	const name = file.originalname;

  	const { user_phone, relative_phone } = req.body;

    const templatePath = path.join(__dirname, '../Pictures', 'ApplicationForm.docx');

    const createFilledDocument = async () => {
        const zip = new AdmZip(templatePath);
        const docxTemplate = zip.readAsText("word/document.xml");

        const filledDocx = docxTemplate
            .replace(/«name»/g, student.username)
            .replace(/«studentClass»/g, student.year)
            .replace(/«studentNumber»/g, student.id)
            .replace(/«tcNo»/g, student.tc)
            .replace(/«user_phone»/g, user_phone)
            .replace(/«relative_phone»/g, relative_phone)
            .replace(/«email»/g, student.email);

        zip.updateFile("word/document.xml", Buffer.from(filledDocx, "utf-8"));
        return zip.toBuffer();

    };
	
  	try {
		bufferedApplicationForm = await createFilledDocument();

    const application = await Application_model.create({
      studentId: student.id,
      announcementId,
      status: 0,
    });

    await Document_model.create({
      name:`${student.username}_ApplicationForm.docx`,
      applicationId: application.id,
      data: bufferedApplicationForm,
      fileType:'Application Form',
      username: student.username
    });


  	  await Document_model.create({
  	    name,
  	    applicationId: application.id,
  	    data: binaryData,
  	    fileType,
  	    username: student.username
  	  });
		res.redirect("/student/opportunities");
  	}  catch (error) {
  	  console.log(error);
  	  res.status(500).send('An error occurred while creating the application or the document.'); 
  	};
});

router.get("/student/applications",[auth,checkUserRole("student")],async function(req,res){
	const student = await Student_model.findOne({ where: { id: req.user.id }});

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
					attributes: ['announcementName'],
					include: [
					  {
						model: Company_model,
						attributes: ['name'] // Fetching the company name
					  }
					]
			  	}
			]
		});

		res.render("Student/applications", {
			usertype: "student",
			dataValues: student.dataValues,
			applications,
			totalAnnouncementsCount
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
    
    
const Student= await axios.get('http://localhost:3500/student?mail='+email);
    const ubysStudent=Student.data[0];

    console.log(ubysStudent);
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
            id: ubysStudent.id,
			      username: ubysStudent.name,
			      email,
            tc:ubysStudent.tc,
            year:ubysStudent.year,
            department:ubysStudent.department,
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