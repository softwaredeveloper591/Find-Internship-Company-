const express = require("express");
const router= express.Router();
const auth = require("../middleware/auth"); 
const checkUserRole= require("../middleware/checkUserRole")
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Announcement = require("../models/announcement-model");



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

router.put("/admin/announcement/:opportunityId",[auth,checkUserRole("admin")],async function(req,res){
  let opportunityId= req.params.opportunityId;
  console.log(req.body.status);
  let announcement= await Announcement.findOne({ where: {id: opportunityId} });  //------------------------------------------------------------------------
  announcement.statusByDIC=req.body.status;
  await announcement.save();
  res.send(announcement);
});

module.exports= router;