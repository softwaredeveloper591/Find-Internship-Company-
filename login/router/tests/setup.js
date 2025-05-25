const db = require("../../data/db");
const bcrypt = require('bcrypt');

const openPassword = "password123";
const createUser = async () => {
  try {
      let person= await db.Secretary.create({
      id: 280201054,
      username: "Test User",
      email: "test@iyte.edu.tr",
      password: await bcrypt.hash(openPassword, 10)
      });
      return person;
    } catch (error) {
      console.error("Error creating test user:", error);
      throw error;
    }
  }


beforeAll(async () => {
  try {
    if(process.env.NODE_ENV!== "test")
        throw new Error("Environment is not test! DB sync should not be executed!")
    await db.sequelize.getQueryInterface().dropAllTables();
    await db.sequelize.sync({ force: true });
    await createUser();
     await db.Ubys_Student.create({
      id: 12345,
      student_name: "Test Student",
      email: "test@std.iyte.edu.tr",
      tc: "12345678901",
      year: 3,
      department: "CENG"
    });
    console.log('Database synced successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
});

afterAll(async () => {
  await db.sequelize.close();
});
