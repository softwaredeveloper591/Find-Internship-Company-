const express = require("express");
const router= express.Router();
const path=require("path");
const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole")


router.use("/admin",[auth,checkUserRole("student")],function(req,res){
    res.render("Admin/admin");
})

module.exports= router;