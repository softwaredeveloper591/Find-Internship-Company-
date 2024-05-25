const mysql = require("mysql2");
const Sequlize = require("sequelize");
const sequelize= new Sequlize("internship","root","mehmetanl!",{
    host: "localhost",
	dialect: "mysql",
    logging: false
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