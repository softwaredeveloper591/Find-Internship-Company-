const jwt=require("jsonwebtoken");

module.exports = function(userType) {
    return function(req, res, next) {
      const token = req.headers['authorization'];
  
      if (!token) {
        return res.status(401).send('yetkiniz yok');
      }
  
      jwt.verify(token,'privateKey', (err, user) => {
        if (err) {
          return res.status(403).send('This is not my token');
        }
  
        // Check the userType attribute of the JWT payload
        if (user.usertype != userType) {
          return res.status(403).send('my token but wrong user');
        }
  
        req.user = user;
        next();
      });
    };
  };