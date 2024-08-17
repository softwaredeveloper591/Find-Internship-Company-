const express = require("express");
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.urlencoded({extended:false})); // to obtain the data coming from forms in a json structure.
app.use(express.json());

const signup = require("./router/signup");
app.use(signup);

app.use(express.static("Pictures"));
app.use(express.static("node_modules"));
app.use(express.static("helper_scripts"));
app.use(express.static("style"));

app.use(cookieParser());

app.set("view engine", "ejs");

app.listen(3002, () => {
		console.log("app is listening on port 3002");
	}
);