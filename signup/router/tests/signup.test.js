
const request = require('supertest');
const app = require('../../app');
const db = require("../../data/db");

let ubysStudent;
beforeAll(async () => {
  try {
    if(process.env.NODE_ENV!== "test")
        throw new Error("Environment is not test! DB sync should not be executed!")
    await db.sequelize.sync({ force: true });
    console.log('Database synced successfully');
    ubysStudent = await db.Ubys_Student.create({
      id: 12345,
      student_name: "Test Student",
      email: "test@std.iyte.edu.tr",
      tc: "12345678901",
      year: 3,
      department: "CENG"
    });
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
});

afterAll(async () => {
  await db.sequelize.close();
});

describe('Signup Endpoints', () => {
  it("should register a company with valid data", async () => {
    const res = await request(app)
      .post("/company")
      .send({
        name: "Test company",
        username: "testcompany",
        email: "company@examplemail.com",
        password: "securepassword",
        confirmPassword: "securepassword",
        address: "Test Address"
      });

    expect(res.statusCode).toBe(200);
  });

  it("should fail if email is invalid", async () => {
    const res = await request(app)
      .post("/company")
      .send({
        name: "Test Company",
        username: "testcompany",
        email: "notanemail",
        password: "securepass",
        confirmPassword: "securepass",
        address: "Test Address"
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.email).toBe("Please enter a valid email");
  });

  it("should fail if password is too short", async () => {
    const res = await request(app)
      .post("/company")
      .send({
        name: "Test Company",
        username: "testcompany",
        email: "company@example.com",
        password: "123",
        confirmPassword: "123",
        address: "Test Address"
      });

    expect(res.statusCode).toBe(400);
  });

  it("should register a student with valid data", async () => {
    const res = await request(app)
      .post("/student")
      .send({
        email: ubysStudent.email,
        password: "securepass",
        confirmPassword: "securepass"
      });
    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/jwt=/);
    });


    it("should fail if email is not valid", async () => {
        const res = await request(app)
        .post("/student")
        .send({
            email: "notanemail",
            password: "securepass",
            confirmPassword: "securepass"
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.errors.email).toBe("Please enter a valid email");
    });

    it("should fail if email is not a student mail or not found in ubys database", async () => {
        const res = await request(app)
        .post("/student")
        .send({
            email: "test@gmail.com",
            password: "securepass",
            confirmPassword: "securepass"
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.errors.email).toBe("This is not a valid student email");

        const res2 = await request(app)
        .post("/student")
        .send({
            email: "notfound@std.iyte.edu.tr",
            password: "securepass",
            confirmPassword: "securepass"
        });

        expect(res2.statusCode).toBe(400);
        expect(res2.body.errors.email).toBe("Incorrect student email")
    });

});
