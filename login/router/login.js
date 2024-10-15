const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt= require("bcrypt");
const nodeMailer = require("nodemailer");
const { APP_SECRET, EMAIL_PASS } = require("../config");

const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");
const Secretary_model = require("../models/secretary-model");

const asyncErrorHandler = require("../utils/asyncErrorHandler");
const userType = require("../middleware/userType");

async function findUserByEmail(email) {
	let user = null;
	let userType = '';
    const mail = email;
    const parts = mail.split("@");
    const domain = parts[1]; 

    if (email === "buketoksuzoglu@iyte.edu.tr") {
      	user = await Admin_model.findOne({ where: { email } });
		userType = "admin";
    }
	else if(domain === "iyte.edu.tr") {
		user = await Secretary_model.findOne({ where: { email } });
		userType = "secretary";
	}
	else if (domain === "std.iyte.edu.tr") {
		user = await Student_model.findOne({ where: { email } });
		userType = "student";
	}
	else {
		user = await Company_model.findOne({ where: { email } });
		userType = "company";
	}

	if(user) return { user, userType };

    return null;
}

const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { error: '' };

	if (err.message === "Wrong username or password") {
		errors.error = "Wrong username or password";
	}

	if (err.message === "statusByDIC") {
		errors.error = "Your registration request is still pending approval.";
	}
  
    if(err.message === "Failed to communicate with the server.") {
        errors.error = "Failed to communicate with the server.";
    }

    // validation errors
    if (err.message.includes('user validation failed')) {
      	// console.log(err);
      	Object.values(err.errors).forEach(({ properties }) => {
        // console.log(val);
        // console.log(properties);
        errors[properties.path] = properties.message;
      	});
    }

    return errors;
}

router.get("/", userType, function(req,res) {
    res.status(200).json({ userType: req.userType});
});


router.post("/", async function(req,res){
    const { email, password } = req.body;
    try {
        let user;
        try{
		    user = await findUserByEmail(email);
        } catch(e){
            throw Error("Failed to communicate with the server.");
        }

    	if(!user) {
			throw Error("Wrong username or password");
		}

    	const checkPassword= await bcrypt.compare(password,user.user.password);
	  
    	if(!checkPassword) {
			throw Error("Wrong username or password");
		}

		if (user.userType === "company") {
			if (user.user.statusByDIC === 0) {
				throw Error("statusByDIC");
			}
		}

    	const token= createTokenWithIdandUserType(user.user.id,user.userType);
    	res.cookie('jwt', token);
		res.status(200).json({ user: user.userType });
    } 
	catch (error) {
		const errors = handleErrors(error);
      	res.status(400).json({ errors });
    }
});

router.post("/forgotPassword", asyncErrorHandler( async (req, res, next) => {
	const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No user with that email' });
    }
    const token = jwt.sign({ id: user.user.id, userType: user.userType }, APP_SECRET , { expiresIn: '5m' });
    const transporter = nodeMailer.createTransport({
        service: 'gmail',
    	auth: {
        	user: 'enesbilalbabaturalpro06@gmail.com', 
        	pass: EMAIL_PASS 
    	}
    });
    await transporter.sendMail({
        from: '"Buket Erşahin" <enesbilalbabaturalpro06@gmail.com>',
        to: email,
        subject: 'Password Reset Link',
		html: `<a href="http://localhost:5173/changePassword?token=${token}">Reset Password</a>`
    });
    res.status(200).json({ success: 'Password reset link has been sent.' });  
}));

// delete, no need
router.get('/changePassword', (req, res) => {
    const { token } = req.query;

    // Check if the token exists
    if (!token) {
        res.status(400).json( { error: 'No token provided.' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, APP_SECRET );

        // If token is valid, render the page with the token
        return res.status(200).json({ success: true, token });
    } catch (err) {
        // Handle different errors differently
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token has expired.' })
        } else {
            res.status(400).json({ error: 'Invalid or expired token.' });
        }
    }
});

router.post('/changePassword', asyncErrorHandler( async (req, res, next) => {
    const { password, confirmPassword, token } = req.body;
    if (password.length < 6) {
        return res.status(404).json({ error: 'Minimum password length is 6 characters' });
    }

	if (password !== confirmPassword) {
		return res.status(404).json({ error: 'Passwords do not match' });
	}

	//console.log(decoded);
    let decoded;
    try {
        decoded = jwt.verify(token, APP_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token has expired.' });
        } else {
            res.status(400).json({ error: 'Invalid or expired token.' });
        }
    }

    const { id, userType } = decoded;
    let model;
    switch (userType) {
        case 'admin':
            model = Admin_model;
            break;
        case 'student':
            model = Student_model;
            break;
        case 'company':
            model = Company_model;
            break;
        default:
            return res.status(400).json({ error: 'Invalid user type' });
    }
	const user = await model.findOne({ where: { id } });
	const checkPassword= await bcrypt.compare(password,user.password);
	
    if(checkPassword) {
		return res.status(400).json({ error: 'New password must be different from the current password.' });
	}
    const hashedPassword = await bcrypt.hash(password, 10);
    await model.update( { password: hashedPassword }, { where: { id } } );
	res.status(200).json({ success: 'Password updated succesfully.' });
}));

router.get("/logout", function(req,res){
    res.clearCookie('jwt');

    res.redirect('/');
});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
	return jwt.sign({id: id, userType:userType}, APP_SECRET);//----------------------------------------------------------------------
}

module.exports=router;