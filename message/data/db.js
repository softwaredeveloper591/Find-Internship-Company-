const Sequelize = require('sequelize');
const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_DIALECT, DB_PORT } = require('../config');
const initModels = require('../models/init-models'); // Import your initModels function

// const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
//   host: DB_HOST,
//   dialect: DB_DIALECT,
//   port: DB_PORT,
//   logging: console.log,
// });

const sequelize = new Sequelize(
  'userdb',        // DB name (MYSQL_DATABASE)
  'user',          // DB user (MYSQL_USER)
  'userpass',      // DB password (MYSQL_PASSWORD)
  {
    host: 'message-mysql-srv', // Service name in K8s (matches metadata.name in Service)
    dialect: 'mysql',
    port: 3306,
    logging: false,
  }
);

async function connect() {
  try {
    await sequelize.authenticate();
    console.log("MySQL server connection established.");

    // Ensure all tables are created
    await sequelize.sync();
    console.log("Database synced successfully.");

    // Seed data after sync
    await seed();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

connect();

async function seed() {
  try {
    await db.Admin.findOrCreate({
      where: { id: 6401 },
      defaults: {
        username: 'Buket Erşahin',
        email: 'buketoksuzoglu@iyte.edu.tr',
      }
    });

    await db.Secretary.findOrCreate({
      where: { id: 1709 },
      defaults: {
        username: 'Mehmet Anıl Cömert',
        email: 'mehmetcomert@iyte.edu.tr'
      }
    });
  } catch (error) {
    console.error('Seeding error:', error);
  }
}


// Initialize models and their relationships
const db = initModels(sequelize); // Calling initModels to initialize models and relationships

// Export the db context with models
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
