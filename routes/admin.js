const express = require("express");
const router= express.Router();
const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole")
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement = require("../models/announcement");



router.get("/admin/announcementRequests",[auth,checkUserRole("admin")],async function(req,res){
    let admin = await Admin_model.findOne({ where: {id: req.user.id} });
    let announcements= await Announcement.findAll();  
    let companies= Company_model.findAll();    
    res.render("Admin/announcementRequests",{ usertype:"admin", dataValues:admin.dataValues, announcements:announcements, companies});
  });


  
  router.get("/admin",[auth,checkUserRole("admin")],async function(req,res){
    let admin = await Admin_model.findOne({ where: {id: req.user.id} });
    res.render("Admin/admin",{ usertype:"admin", dataValues:admin.dataValues});
});

module.exports= router;