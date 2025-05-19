const dotEnv = require("dotenv");

if (process.env.NODE_ENV == "test") {
  const configFile = `./.env.${process.env.NODE_ENV}`;
  dotEnv.config({ path: configFile });
} else {
  dotEnv.config();
}

let config = {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_DIALECT: process.env.DB_DIALECT,
  DB_PORT: process.env.DB_PORT,
  PORT: process.env.PORT,
  MSG_QUEUE_URL: process.env.MSG_QUEUE_URL,
  APP_SECRET: process.env.APP_SECRET,
  SENTRY_DSN: process.env.SENTRY_DSN,
  EMAIL_PASS: process.env.EMAIL_PASS
};

if (process.env.NODE_ENV === "test") {
  console.log("Test environment detected. Using test database configuration.");
  config = {
    ...config,
    DB_NAME: "test",
    DB_USER: "root",
    DB_PASSWORD: "enes1212",
    DB_HOST: "localhost",
    DB_DIALECT: "mysql",
    DB_PORT: 3306,
    PORT: 3001,
    MSG_QUEUE_URL: 'amqp://rabbitmq',
    APP_SECRET: "Automated_System",
    SENTRY_DSN: "https://c5f3589cf7f85b3e309f2c1e2f652e64@o4507821746094080.ingest.de.sentry.io/4507827687129168",
    EMAIL_PASS: "elde beun xhtc btxu"
  };
}

module.exports = config;