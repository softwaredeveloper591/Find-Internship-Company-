const Sequelize = require('sequelize');
const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_DIALECT, DB_PORT } = require('../config');
const initModels = require('../models/init-models'); // Import your initModels function

// const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
//   host: DB_HOST,
//   dialect: DB_DIALECT,
//   port: DB_PORT,
//   logging: false,
// });

const sequelize = new Sequelize(
  'userdb',        // DB name (MYSQL_DATABASE)
  'user',          // DB user (MYSQL_USER)
  'userpass',      // DB password (MYSQL_PASSWORD)
  {
    host: 'user-mysql-srv', // Service name in K8s (matches metadata.name in Service)
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

// Initialize models and their relationships
const db = initModels(sequelize); // Calling initModels to initialize models and relationships

async function seed() {
  try {
    const admin= await db.Admin.findOrCreate({
      where: { id: 6401 },
      defaults: {
        username: 'Buket Erşahin',
        email: 'buketoksuzoglu@iyte.edu.tr',
        password: '$2b$10$qvoWNe.//9lsWhGGYSWLxudm7DTa9vnMM4kkTC31YF5yfDaIAIQv6'
      }
    });

    await db.Secretary.findOrCreate({
      where: { id: 1709 },
      defaults: {
        username: 'Mehmet Anıl Cömert',
        email: 'mehmetcomert@iyte.edu.tr',
        password: '$2b$10$mI50VgjNbpWfSWXefz8nce2q8vuN.TZ3Sz32TDKVDCV1nIBM/hNIi'
      }
    });

    await db.Ubys_Student.findOrCreate({
      where: { id: 280201054 },
      defaults: {
        student_name: 'Ahmet Said Barkahan',
        email: 'ahmetbarkahan@std.iyte.edu.tr',
        department: 'CENG',
        year: 3,
        tc: '23809476217'
      }
    });

    await db.Ubys_Student.findOrCreate({
      where: { id: 290201110 },
      defaults: {
        student_name: 'Tural Karimli',
        email: 'turalkarimli@std.iyte.edu.tr',
        department: 'CENG',
        year: 3,
        tc: '99321745998'
      }
    });
  } catch (error) {
    console.error('Seeding error:', error);
  }
}




// Export the db context with models
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
