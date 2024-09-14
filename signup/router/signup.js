const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { isEmail } = require('validator');
const { APP_SECRET } = require("../config");

const Student_model = require("../models/student-model");
const Company_model = require("../models/company-model");
const Ubys_model = require("../models/ubys-model");

const router = express.Router();

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

router.get("/", function(req,res) {
    res.render("signup");
});

router.post("/company",async function(req,res){
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

router.post("/student",async function(req,res){
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
    
    const Student = await Ubys_model.findOne({ where: { email }});
		if(!Student) {
			throw Error('not in ubys database');
		}
    const ubysStudent=Student.dataValues;
    
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
			username: ubysStudent.student_name,
			email,
			tc:ubysStudent.tc,
            year:ubysStudent.year,
            department:ubysStudent.department,
            password: hashedPassword
        });
        const token= createTokenWithIdandUserType(newStudent.id,"student");
        res.cookie('jwt', token);
        res.status(200).json({ student: newStudent.id });
    } 
	catch (err) {
      	const errors = handleErrors(err);
      	res.status(400).json({ errors });  
    }
});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
  return jwt.sign({id: id, userType:userType}, APP_SECRET);//----------------------------------------------------------------------
};

module.exports = router;