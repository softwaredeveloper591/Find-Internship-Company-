// tests/user.test.js
const request = require('supertest');
const app = require('../../app');
const db = require("../../data/db");
const jwt = require("jsonwebtoken");
const { APP_SECRET } = require("../../config");
const bcrypt = require('bcrypt');

global.signIn = () => {
  const payload = {
    id: 456,
    userType: "secretary"
  };
  const token = jwt.sign(payload, APP_SECRET, { expiresIn: "1h" });
  return [`jwt=${token}`];
};

let secretary,student, manualApplication;

beforeAll(async () => {
  try {
    if(process.env.NODE_ENV!== "test")
        throw new Error("Environment is not test! DB sync should not be executed!")
    await db.sequelize.sync({ force: true });
    const hashedPassword = await bcrypt.hash("oldpassword", 10);
    secretary = await db.Secretary.create({
      id: 456,
      username: "Test Secretary",
      email: "secretary@iyte.edu.tr",
      password: hashedPassword
    });
    // Create a student
      student = await db.Student.create({
        id: 2,
        username: "Student User",
        email: "student@test.com",
        password: "hashedpassword"
      });
  
      // Create a manual application
      manualApplication = await db.ManualApplication.create({
        id: 10,
        studentId: student.id,
        isApprovedByDIC: true,
        isSentBySecretary: null
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

describe('Secretary Endpoints:', () => {
  it("should return secretary info without password", async () => {
    const res = await request(app)
      .get("/personalInfo")
      .set("Cookie", global.signIn())
      .expect(200);

    expect(res.body).toHaveProperty("id", secretary.id);
    expect(res.body).toHaveProperty("username", secretary.username);
    expect(res.body).toHaveProperty("email", secretary.email);
    expect(res.body).not.toHaveProperty("password");
  });

  it("should update username and email", async () => {
    const res = await request(app)
      .post("/personalInfo")
      .set("Cookie", global.signIn())
      .send({
        firstName: "New",
        lastName: "Name",
        email: "newsecretary@iyte.edu.tr"
      });

    expect(res.statusCode).toBe(200);
    // to check secretary changes is reflected to database
    const updated = await db.Secretary.findByPk(secretary.id);
    expect(updated.username).toBe("New Name");
    expect(updated.email).toBe("newsecretary@iyte.edu.tr");
  });

  it("should update password", async () => {
    const res = await request(app)
      .post("/personalInfo")
      .set("Cookie", global.signIn())
      .send({
        currentPassword: "oldpassword",
        password: "newpassword",
        confirmPassword: "newpassword"
      });

    expect(res.statusCode).toBe(200);
    const updated = await db.Secretary.findByPk(secretary.id);
    const isMatch = await bcrypt.compare("newpassword", updated.password);
    expect(isMatch).toBe(true);
  });

  it("should fail if new password is same as current password", async () => {
    const res = await request(app)
      .post("/personalInfo")
      .set("Cookie", global.signIn())
      .send({
        currentPassword: "newpassword",
        password: "newpassword",
        confirmPassword: "newpassword"
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('New password must be different from the current password.');
  });

  it("should return manual applications with status 200", async () => {
    const res = await request(app)
      .get("/manualApplications")
      .set("Cookie", global.signIn())
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("id", manualApplication.id);
    expect(res.body[0]).toHaveProperty("studentId", student.id);
    expect(res.body[0].Student).toBeDefined();
    expect(res.body[0].Student).toHaveProperty("username", student.username);
    expect(res.body[0].Student).toHaveProperty("id", student.id);
  });


});
