const mysql = require("mysql2");
const Sequlize = require("sequelize");
const sequelize= new Sequlize("mysql://sdv6k03sq9002wxv:utk6tfl4plobswj5@b8rg15mwxwynuk9q.chr7pe7iynqr.eu-west-1.rds.amazonaws.com:3306/o09uyv2tnnwb9utm",
{
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