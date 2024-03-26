const express = require("express");
const router= express.Router();
const path=require("path");


router.use("/company/:companyid",function(req,res){
    res.render("Company/company");
})

router.use("/signup/company",function(req,res){
    res.render( "Company/signup");
})

module.exports= router;