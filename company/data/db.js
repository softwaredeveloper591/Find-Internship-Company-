const Sequelize = require('sequelize');
const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_DIALECT, DB_PORT } = require('../config');
const initModels = require('../models/init-models'); // Import your initModels function

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: DB_DIALECT,
  port: DB_PORT,
  logging: false,
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

// Initialize models and their relationships
const db = initModels(sequelize); // Calling initModels to initialize models and relationships

// Export the db context with models
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
