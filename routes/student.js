const express = require("express");
const router= express.Router();
const path=require("path");


router.use("/student/:studentid",function(req,res){
    res.render("Student/student");
})

router.use("/singup",function(req,res){
    res.render( "singup");
})

router.use("/",function(req,res){
    res.render("singin");
})

module.exports= router;