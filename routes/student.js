const express = require("express");
const router= express.Router();
const path=require("path");


const db= require("../data/db");


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
        const studentNumber= req.body.student_number;
        const username= req.body.username;
        const email= req.body.email;
        const password=req.body.password;
        try {
            await db.execute("INSERT INTO student(id,username,password,email) VALUES (?,?,?,?)",
            [studentNumber,username,email,password]);
            res.redirect("/student/:studentid");

        } catch (error) {
            console.log(error);
            
        }
})
router.get("/",function(req,res){
    res.render("signin");
})

router.post("/", async function(req,res){
    const usertype= req.body.usertype;
    console.log(usertype);
    const username= req.body.username;
    const password=req.body.password;

    try {
        let query = "";
        let queryParams = [username, password]; // Add username and password to the query parameters

        // Construct the query string based on the user type
        switch (usertype) {
            case 'student':
                query = "SELECT * FROM student WHERE username=? AND password=?";
                break;
            case 'admin':
                query = "SELECT * FROM admin WHERE username=? AND password=?";
                break;
            case 'company':
                query = "SELECT * FROM company WHERE username=? AND password=?";
                break;
            default:
                throw new Error("Invalid user type");
        }
        const [data,] = await db.execute(query, queryParams);
        res.send(data);
        // res.redirect("/student/:studentid");

    } catch (error) {
        console.log(error);
        
    }

})

module.exports= router;