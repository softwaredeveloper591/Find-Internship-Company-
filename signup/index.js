const express = require("express");
const cookieParser = require('cookie-parser');
const errorHandler = require("./utils/errorHandler");

const app = express();

app.use(express.urlencoded({extended:false})); // to obtain the data coming from forms in a json structure.
app.use(express.json());

const signup = require("./router/signup");
app.use(signup);

app.use(express.static("Pictures"));
app.use(express.static("node_modules"));
app.use(express.static("style"));

app.use(cookieParser());

app.set("view engine", "ejs");

errorHandler(app);

app.listen(3002, () => {
		console.log("app is listening on port 3002");
	}
)
.on('error', (error) => {
	console.log(error);
	process.exit();
})
.on('close', () => {
	channel.close();
});