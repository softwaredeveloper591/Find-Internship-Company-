const express = require("express");
const router= express.Router();
const path=require("path");


router.use("/company/:companyid",function(req,res){
    res.render("Company/company");
})

module.exports= router;