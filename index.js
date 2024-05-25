const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.urlencoded({extended:false})); // to obtain the data coming from forms in a json structure.
app.use(express.json());  //to be able to send data as a json format via postman
app.set("view engine", "ejs");

app.use(express.static("Pictures"));
app.use(express.static("node_modules"));
app.use(express.static("style"));
app.use(express.static("helper scripts"));
app.use('/uploads', express.static('uploads'));


app.use(cookieParser());

const routerStudent=require("./routes/student");
const routerCompany=require("./routes/company");
const routerAdmin=require("./routes/admin");
const routerUser=require("./routes/user");
const routerSecretary = require("./routes/secretary");

app.use(routerAdmin);
app.use(routerCompany);
app.use(routerStudent);
app.use(routerUser);
app.use(routerSecretary);

const PORT = process.env.PORT || 3000;
app.listen(PORT);
