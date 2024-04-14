const express = require("express");
const router= express.Router();
const path=require("path");
const Company_model= require("../models/company-model");
const bcrypt= require("bcrypt");
const auth = require("../middleware/auth");  
const checkUserRole= require("../middleware/checkUserRole");
const Announcement = require("../models/announcement");

router.get("/company/announcement",[auth,checkUserRole("company")], async function(req,res){
    let company = await Company_model.findOne({ where: {id: req.user.id} });
    res.render("Company/announcement",{ usertype:"company", dataValues:company.dataValues});
})

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
})

router.get("/company",[auth,checkUserRole("company")],async function(req,res){
    let company = await Company_model.findOne({ where: {id: req.user.id} });
    res.render("Company/company",{ usertype:"company", dataValues:company.dataValues, action: req.query.action});
})



router.get("/signup/company",function(req,res){
    res.render( "Company/signup");
})

router.post("/signup/company",async function(req,res){
    const { name, username, email, password, address } = req.body;
    console.log(req.body.address);
    const hashedPassword = await bcrypt.hash(password,10);
        try {
            const newCompany = await Company_model.create({
                name: name,
                username: username,
                email: email,
                password: hashedPassword,
                address: address
              });
            res.send(newCompany);
            //   const token= createTokenWithId(newStudent.id);
            //   res.header("x-auth-token",token.send(newStudent));

        } catch (error) {
            console.log(error);
            res.status(500).send('An error occurred while creating the student in database.');   
        }
})
module.exports= router;