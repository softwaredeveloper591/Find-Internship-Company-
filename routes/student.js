const express = require("express");
const router= express.Router();
const bcrypt= require("bcrypt");


const db= require("../data/db");
const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");


router.use("/student/:studentid",function(req,res){
    // db.execute("select * from company")
    //     .then(result => {
    //         res.send(result[0]);
    //     })
    //     .catch(err => console.log(err));
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
        res.send(user);
        const checkPassword= await bcrypt.compare((password,user.password));
        if(!user || !checkPassword)
          return res.status(500).send("wrong username or password");
      } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred while processing your request.');
      }

})

module.exports= router;