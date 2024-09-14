const jwt=require("jsonwebtoken");
const { APP_SECRET } = require("../config");

module.exports = function(userType) {
    return function(req, res, next) {
      const token = req.cookies.jwt;
  
      if (!token) {
        return res.status(401).send('yetkiniz yok');
      }
  
      jwt.verify(token, APP_SECRET, (err, user) => {
        if (err) {
          return res.status(403).send('This is not my token');
        }
  
        // Check the userType attribute of the JWT payload
        if (user.userType != userType) {
          return res.status(403).send('my token but wrong user');
        }
  
        req.user = user;
        next();
      });
    };
  };