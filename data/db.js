const mysql = require("mysql2");
const Sequlize = require("sequelize");
const sequelize= new Sequlize('mysql://hpkp6jw607pp5buy:d7561shgxf487p1k@w1kr9ijlozl9l79i.chr7pe7iynqr.eu-west-1.rds.amazonaws.com:3306/e5asdqjuwe3vye7k',
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