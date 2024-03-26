const mysql = require("mysql2");

let connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password:"Enes123",
    database: "insternship"
});

connection.connect(function(err){
    if(err){
        return console.log(err);
    }
     console.log("mysql server bağlantısı yapıldı.");
})

module.exports=connection.promise();