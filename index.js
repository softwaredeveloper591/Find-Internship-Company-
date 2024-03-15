const express = require("express");
const app = express();
const routerStudent=require("./routes/student");
const routerCompany=require("./routes/company");
const routerAdmin=require("./routes/admin");

const path=require("path");
app.set("view engine", "ejs");

app.use(express.static("Pictures"));
app.use(express.static("node_modules"));

app.use(routerAdmin);
app.use(routerCompany);
app.use(routerStudent);


app.listen(3000);
