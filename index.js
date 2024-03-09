const express = require("express");
const app = express();

const path=require("path");

app.use("/admin",function(req,res){
    res.sendFile(path.join(__dirname, "Views/Admin/admin.html"));
})

app.use("/company/:companyid",function(req,res){
    res.sendFile(path.join(__dirname, "Views/Company/company.html"));
})

app.use("/student/:studentid",function(req,res){
    res.sendFile(path.join(__dirname, "Views/Student/student.html"));
})

app.use("/singup",function(req,res){
    res.sendFile(path.join(__dirname, "Views/singup.html"));
})

app.use("/",function(req,res){
    res.sendFile(path.join(__dirname, "Views/singin.html"));
})


app.listen(3000);
