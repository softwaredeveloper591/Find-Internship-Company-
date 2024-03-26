const express = require("express");
const app = express();
const mysql = require("mysql2");

const path=require("path");
app.use(express.urlencoded({extended:false})); // to obtain the data coming from forms in a json structure.

app.set("view engine", "ejs");

app.use(express.static("Pictures"));
app.use(express.static("node_modules"));

const routerStudent=require("./routes/student");
const routerCompany=require("./routes/company");
const routerAdmin=require("./routes/admin");

app.use(routerAdmin);
app.use(routerCompany);
app.use(routerStudent);


app.listen(3000);
