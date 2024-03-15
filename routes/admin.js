const express = require("express");
const router= express.Router();
const path=require("path");


router.use("/admin",function(req,res){
    res.render("Admin/admin");
})

module.exports= router;