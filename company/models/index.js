const fs = require('fs');
const path = require('path');
const Sequelize = require("sequelize");
const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_DIALECT, DB_PORT } = require("../config");
const basename = path.basename(__filename);
const db = {};


const sequelize = new Sequelize( DB_NAME, DB_USER, DB_PASSWORD, 
    {
        host: DB_HOST,
        dialect: DB_DIALECT,
        port: DB_PORT,
        logging: false
    }
);

fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.endsWith('.js') &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach(model => {
  if (model.associate)
    model.associate(db);
});

// sequelize.sync({ alter: true }) 
//   .then(() => console.log('Database synchronized'))
//   .catch(err => console.error('Error synchronizing database:', err));

async function connect() {
  try {
      await sequelize.authenticate();
      console.log("MySQL server connection established.");
  } catch (error) {
      console.log("Connection error", error);
  }
}

connect();
module.exports = db;