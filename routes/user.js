const express = require("express");
const router= express.Router();
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");
const nodeMailer = require("nodemailer");

const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");

async function findUserByEmail(email) {
	let user = null;
	let userType = '';
    const mail = email;
    const parts = mail.split("@");
    const domain = parts[1]; 

    if (domain === "iyte.edu.tr") {
      	user = await Admin_model.findOne({ where: { email } });
		userType = "admin";
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

    /*let user = await Admin_model.findOne({ where: { email } });
    if (user) return { user , userType: 'admin' };

    user = await Student_model.findOne({ where: { email } });
    if (user) return { user , userType: 'student' };

    user = await Company_model.findOne({ where: { email } });
    if (user) return { user , userType: 'company' };*/

    return null;
}

const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { error: '' };

	if (err.message === "wrong username or password") {
		errors.error = "wrong username or password";
	}

	if (err.message === "statusByDIC") {
		errors.error = "Your registration request is still pending approval.";
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

router.get("/signup",function(req,res){
    res.render("signup");
});

router.get("/",function(req,res){
    res.render("signin");
});

router.post("/", async function(req,res){
    const { email, password } = req.body;
    try {
		const user = await findUserByEmail(email);
    	if(!user) {
			throw Error("wrong username or password");
		}

    	const checkPassword= await bcrypt.compare(password,user.user.password);
	  
    	if(!checkPassword) {
			throw Error("wrong username or password");
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

router.post("/forgotPassword", async function(req, res) {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No user with that email' });
    }
    const token = jwt.sign({ id: user.user.id, userType: user.userType }, 'secretKey', { expiresIn: '5m' });

    const transporter = nodeMailer.createTransport({
        service: 'gmail',
    	auth: {
        	user: 'enesbilalbabaturalpro06@gmail.com', // your Gmail address
        	pass: 'elde beun xhtc btxu' // your Gmail password or App Password if 2FA is enabled
    	}
    });

    await transporter.sendMail({
        from: '"Buket Erşahin" <enesbilalbabaturalpro06@gmail.com>',
        to: email,
        subject: 'Password Reset Link',
        html: `<a href="http://localhost:3000/changePassword?token=${token}">Reset Password</a>`
    });
    res.status(200).json({ success: 'Password reset link has been sent.' });
});

router.get('/changePassword', (req, res) => {
    const { token } = req.query;

    // Check if the token exists
    if (!token) {
        return res.status(400).send('No token provided.');
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, 'secretKey');

        // If token is valid, render the page with the token
        res.render('ForgotPassword/changePassword', { token });
    } catch (err) {
        // Handle different errors differently
        if (err.name === 'TokenExpiredError') {
            res.status(401).send('Token has expired.');
        } else {
            res.status(400).send('Invalid or expired token');
        }
    }
});

router.post('/changePassword', async (req, res) => {
    const { password, confirmPassword, token } = req.body;
    if (password.length < 6) {
        return res.status(404).json({ error: 'Minimum password length is 6 characters' });
    }

	if (password !== confirmPassword) {
		return res.status(404).json({ error: 'Passwords do not match' });
	}

    try {
		//console.log(decoded);
		const decoded = jwt.verify(token, 'secretKey');
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
		res.status(200).json({ success: 'password updated succesfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

router.get("/logout",function(req,res){
    res.clearCookie('jwt');

    res.redirect('/');
});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
	return jwt.sign({id: id, userType:userType},'privateKey');//----------------------------------------------------------------------
}

module.exports=router;

/*const express = require("express");
const router= express.Router();
const bcrypt= require("bcrypt");
const jwt=require("jsonwebtoken");

const Student_model= require("../models/student-model");
const Admin_model= require("../models/admin-model");
const Company_model= require("../models/company-model");

const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { error: '' };

	if (err.message === "wrong username or password") {
		errors.error = "wrong username or password";
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

router.get("/logout",function(req,res){
    res.clearCookie('jwt');
    res.redirect('/');
});

router.get("/signup",function(req,res){
    res.render( "signup");
});

router.get("/",function(req,res){
    res.render("signin");
});

router.post("/", async function(req,res){
    const {email, password}=req.body;
    try {

        let user = null;
		    let userType = '';
        const mail = email;
        const parts = mail.split("@");
        const domain = parts[1]; 
    
        // Select the appropriate model based on the user type
        if (domain === "iyte.edu.tr") {
          	user = await Admin_model.findOne({ where: { email } });
		    	  userType = "admin";
            }
		    else if (domain === "std.iyte.edu.tr") {
		    	user = await Student_model.findOne({ where: { email } });
		    	userType = "student";
		    }
		    else {
		    	user = await Company_model.findOne({ where: { email } });
		    	userType = "company";
		    }

        if(!user) {
          throw Error("wrong username or password");
        }
        
        const checkPassword= await bcrypt.compare(password,user.password);
        if(!checkPassword) {
          throw Error("wrong username or password");
        }
        const token= createTokenWithIdandUserType(user.id,userType);
        res.cookie('jwt', token);
        res.status(200).json({ user: userType });
      
      } catch (error) {
        const errors = handleErrors(error);
        res.status(400).json({ errors });
      }

});

function createTokenWithIdandUserType(id,userType){       //we can add this function into the models so that every model has its own function.
  return jwt.sign({id: id, userType:userType},'privateKey');//----------------------------------------------------------------------
}

module.exports=router;
*/