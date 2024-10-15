// set another name when user type is null
const jwt = require("jsonwebtoken");
const { APP_SECRET } = require("../config");

module.exports = function (req, res, next){
    const token = req.cookies.jwt;
    if(!token){
        req.userType = "";
        next();
    }
    try {
        const decodedToken = jwt.verify(token, APP_SECRET);
        req.userType = decodedToken.userType;
        next();
    } catch (ex) {
        req.userType = "";
        next();
    }
}