const express = require("express");
const cookieParser = require('cookie-parser');
const errorHandler = require("./utils/errors/errorHandler");
const { PORT } = require('./config');

const app = express();

app.use(express.urlencoded({extended:false})); // to obtain the data coming from forms in a json structure.
app.use(express.json());
app.use(express.static("Pictures"));
app.use(express.static("node_modules"));
app.use(express.static("style"));

app.use(cookieParser());

app.set("view engine", "ejs");

const admin = require("./router/admin");
app.use(admin);

errorHandler(app);

app.listen(PORT, () => {
		console.log(`app is listening on port ${PORT}`);
	}
)
.on('error', (error) => {
	console.log(error);
	process.exit();
})
.on('close', () => {
	channel.close();
});