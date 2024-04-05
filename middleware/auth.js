const jwt=require("jsonwebtoken");

module.exports=function (req, res, next){
    const token=req.header("authorization");
    if(!token){
        return res.status(401).send("Yetkiniz yok");
    }
    try {
        const decodedToken=jwt.verify(token, 'privateKey');  //verify method throws exception if verification fails.
        req.user=decodedToken.id;  //?
        console.log(req.user);
        next();
    } catch (ex) {
        res.status(400).send("hatalı token");

    }
    
}
