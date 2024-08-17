const Sequelize = require("sequelize");
const sequelize = new Sequelize("internship", "root", "B1rn0Z4!", {
    host: "host.docker.internal",  // Host machine IP address
    dialect: "mysql",
    port: 3306,  // MySQL port on host machine
    logging: false
});

async function connect() {
    try {
        await sequelize.authenticate();
        console.log("MySQL server connection established.");
    } catch (error) {
        console.log("Connection error", error);
    }
}

connect();
module.exports = sequelize;