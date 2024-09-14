const jwt=require("jsonwebtoken");
const { APP_SECRET } = require("../config");

module.exports=function (req, res, next){
    const token=req.cookies.jwt;
    if(!token){
        return res.status(401).send("Yetkiniz yok");
    }
    try {
        const decodedToken=jwt.verify(token, APP_SECRET);  //verify method throws exception if verification fails.
        req.user=decodedToken.id;  //?
        next();
    } catch (ex) {
        res.status(400).send("hatalı token");

    }
    
}
