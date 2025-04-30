const express = require("express");
const cookieParser = require('cookie-parser');
const errorHandler = require("./utils/errors/errorHandler");
const { PORT } = require('./config');
const cors = require('cors');

const app = express();
app.use(cors({
	origin: 'http://localhost:5173', // Replace with the URL of your frontend
	methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
	credentials: true, // Allow cookies if needed
	// security headers
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({extended: true, limit: '10mb'})); // to obtain the data coming from forms in a json structure.
app.use(express.static("Pictures"));
app.use(express.static("node_modules"));
app.use(express.static("style"));

app.use(cookieParser());

app.set("view engine", "ejs");

const company = require("./routers/companyRouter");
app.use(company);

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