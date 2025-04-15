const jwt=require("jsonwebtoken");
const { APP_SECRET } = require("../config");

module.exports = function(userTypes) {
  return function(req, res, next) {
    const token = req.cookies.jwt;
  
    if (!token) {
    return res.status(401).send('yetkiniz yok');
    }
  
    jwt.verify(token, APP_SECRET, (err, user) => {
    if (err) {
      return res.status(401).send('yetkiniz yok');
    }
  
    // Check if the userType attribute of the JWT payload is in the allowed userTypes array
    if (!userTypes.includes(user.userType)) {
      return res.status(403).send('my token but wrong user');
    }
  
    req.user = user;
    next();
    });
  };
  };