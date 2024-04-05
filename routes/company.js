const express = require("express");
const router= express.Router();
const path=require("path");
const Company_model= require("../models/company-model");
const bcrypt= require("bcrypt");

router.get("/company/:companyid",function(req,res){
    res.render("Company/company");
})

router.get("/signup/company",function(req,res){
    res.render( "Company/signup");
})

router.post("/signup/company",async function(req,res){
    const { name, username, email, password, address } = req.body;
    console.log(req.body.address);
    const hashedPassword = await bcrypt.hash(password,10);
    console.log(address+name);
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
            res.status(500).send('An error occurred while creating the student.');   
        }
})
module.exports= router;