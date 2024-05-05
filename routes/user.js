const express = require("express");
const router= express.Router();
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");

const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");

const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { error: '' };

	if (err.message === "wrong username or password") {
		errors.error = "wrong username or password";
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

router.get("/logout",function(req,res){
    res.clearCookie('jwt');
    res.redirect('/');
});

router.get("/signup",function(req,res){
    res.render( "signup");
});

router.get("/",function(req,res){
    res.render("signin");
});

router.post("/", async function(req,res){
    const {email, password}=req.body;
    try {

        let user = null;
		    let userType = '';
        const mail = email;
        const parts = mail.split("@");
        const domain = parts[1]; 
    
        // Select the appropriate model based on the user type
        if (domain === "iyte.edu.tr") {
          	user = await Admin_model.findOne({ where: { email } });
		    	  userType = "admin";
            }
		    else if (domain === "std.iyte.edu.tr") {
		    	user = await Student_model.findOne({ where: { email } });
		    	userType = "student";
		    }
		    else {
		    	user = await Company_model.findOne({ where: { email } });
		    	userType = "company";
		    }

        if(!user) {
          throw Error("wrong username or password");
        }
        
        const checkPassword= await bcrypt.compare(password,user.password);
        if(!checkPassword) {
          throw Error("wrong username or password");
        }
        const token= createTokenWithIdandUserType(user.id,userType);
        res.cookie('jwt', token);
        res.status(200).json({ user: userType });
      
      } catch (error) {
        const errors = handleErrors(error);
        res.status(400).json({ errors });
      }

});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
  return jwt.sign({id: id, userType:userType},'privateKey');//----------------------------------------------------------------------
}

module.exports=router;