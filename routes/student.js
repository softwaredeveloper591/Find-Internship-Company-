const express = require("express");
const router= express.Router();
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");
const auth = require("../middleware/auth");  //this auth turns yellow when I export it with a function name


const db= require("../data/db");
const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");


router.get("/student/:studentid",auth,function(req,res){

    res.render("Student/student");
})

router.get("/signup/student",function(req,res){
    res.render( "Student/signup");
})

router.post("/signup/student",async function(req,res){
    const { student_number, username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password,10);
        try {
            const newStudent = await Student_model.create({
                id: student_number,
                username: username,
                email: email,
                password: hashedPassword
              });
              const token= createTokenWithIdandUserType(newStudent.id,"student");
              res.header("authorization",token.send(newStudent));
        } catch (error) {
            console.log(error);
            res.status(500).send('An error occurred while creating the student.');   
        }
})


router.get("/",function(req,res){
    res.render("signin");
})

router.post("/", async function(req,res){
    const {usertype, username, password}=req.body;
    try {
        let user = null;
    
        // Select the appropriate model based on the user type
        switch (usertype) {
          case 'student':
            user = await Student_model.findOne({ where: { username} });
            break;
          case 'admin':
            user = await Admin_model.findOne({ where: { username} });
            break;
          case 'company':
            user = await Company_model.findOne({ where: { username} });
            break;
          default:
            throw new Error("Invalid user type");
        }
        if(!user)
          return res.status(500).send("wrong username or password");
        const checkPassword= await bcrypt.compare(password,user.password);
        if(!checkPassword)
          return res.status(500).send("wrong username or password");
        const token= createTokenWithIdandUserType(user.id,usertype);
        res.header("authorization",token).send(user);
      } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred while processing your request.');
      }

})

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
  return jwt.sign({id: id, userType:userType},'privateKey');
}

module.exports= router;