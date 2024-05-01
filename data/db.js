const mysql = require("mysql2");
const Sequlize = require("sequelize");
const sequelize= new Sequlize("insternship","root","Enes123",{
    host: "localhost",

    dialect: "mysql"
});


async function conntect() {
    try {
        await sequelize.authenticate();
        console.log("mysql server bağlantısı yapıldı.");
    } catch (error) {
        console.log("bağlantı hatası", error);
    }
}
    
conntect();
module.exports= sequelize;