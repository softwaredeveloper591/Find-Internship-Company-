const Sequelize = require("sequelize");
const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_DIALECT, DB_PORT } = require("../config");

const sequelize = new Sequelize( DB_NAME, DB_USER, DB_PASSWORD, 
    {
        host: DB_HOST,
        dialect: DB_DIALECT,
        port: DB_PORT,
        logging: false
    }
);

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