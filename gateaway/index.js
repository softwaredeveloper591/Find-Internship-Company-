const express = require("express");
const proxy =  require("express-http-proxy");

const app = express();

app.use(express.json());

app.use("/secretary", proxy("http://localhost:3006"));
app.use("/company", proxy("http://localhost:3005"));
app.use("/student", proxy("http://localhost:3004"));
app.use("/admin", proxy("http://localhost:3003"));
app.use("/signup", proxy("http://localhost:3002"));
app.use("/", proxy("http://localhost:3001"));

app.listen(4000, () => {
		console.log("app is listening on port 3000");
	}
);