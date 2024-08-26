const express = require("express");
const cookieParser = require('cookie-parser');
const errorHandler = require("./utils/errorHandler");

const app = express();

app.use(express.urlencoded({extended:false})); // to obtain the data coming from forms in a json structure.
app.use(express.json());
app.use(express.static("Pictures"));
app.use(express.static("node_modules"));
app.use(express.static("style"));

app.use(cookieParser());

app.set("view engine", "ejs");

const student = require("./router/student");
app.use(student);

errorHandler(app);

app.listen(3004, () => {
		console.log("app is listening on port 3004");
	}
)
.on('error', (error) => {
	console.log(error);
	process.exit();
})
.on('close', () => {
	channel.close();
});