// tests/user.test.js
const request = require('supertest');
const app = require('../app');
const db = require("../data/db");
const jwt = require("jsonwebtoken");
const { APP_SECRET } = require("../config");
const bcrypt = require('bcrypt');


// Global signIn helper for tests
global.signIn = () => {
  // Create a payload with id and userType
  const payload = {
    id: 280201054,
    userType: "student"
  };
  // Sign the token
  const token = jwt.sign(payload, APP_SECRET, { expiresIn: "1h" });
  // Return as a cookie string (simulate how your app sets cookies)
  return [`jwt=${token}`];
};

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

let user;
beforeAll(async () => {
  try {
    await db.sequelize.sync({ force: true });
    console.log('Database synced successfully');
    user= await createUser();
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
});

afterAll(async () => {
  if (user) {
      await user.destroy();
    }
  await db.sequelize.close();
});

describe('User Endpoints', () => {
  it('returns the user info', async () => {
    const res = await request(app).get('/').
    set('Cookie', signIn()).send().expect(200);
    expect(res.body.userType).toBe('student');
  });

  it("should login a user and set jwt cookie", async () => {
    const res = await request(app)
      .post("/")
      .send({ email: user.email, password: openPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBe("secretary");
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/jwt=/);
  });

  it("should fail with wrong password or wrong email", async () => {
    const res = await request(app)
      .post("/")
      .send({ email: user.email, password: "wrongpass" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.error).toBe("Wrong username or password");

    const res2 = await request(app)
      .post("/")
      .send({ email: "wrong@iyte.edu.tr", password: openPassword });

    expect(res2.statusCode).toBe(400);
    expect(res2.body.errors.error).toBe("Wrong username or password");
  });

  it("should fail with non-existent user", async () => {
    const res = await request(app)
      .post("/")
      .send({ email: "notfound@std.iyte.edu.tr", password: "notexist" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.error).toBe("Wrong username or password");
  });

  it("should return 200 if password reset link has been sent", async () => {
    const res = await request(app)
      .post("/forgotPassword")
      .send({ email: user.email });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe('Password reset link has been sent.');
  });

  it("should clear the jwt cookie and redirect to login page", async () => {
    const res = await request(app)
      .get("/logout")
      .set("Cookie", signIn())
      .expect(302); // 302 Found (redirect)

    // Check that the Set-Cookie header clears the jwt cookie
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/jwt=;/);

    // Check that the redirect location is "/"
    expect(res.headers['location']).toBe('/');
  });

});
