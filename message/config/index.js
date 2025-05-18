const dotEnv = require("dotenv");

if (process.env.NODE_ENV !== "prod") {
  const configFile = `./.env.${process.env.NODE_ENV}`;
  dotEnv.config();
} else {
  dotEnv.config();
}

module.exports = {
	DB_NAME: process.env.DB_NAME,
	DB_USER: process.env.DB_USER,
	DB_PASSWORD: process.env.DB_PASSWORD,
	DB_HOST: process.env.DB_HOST,
	DB_DIALECT: process.env.DB_DIALECT,
	DB_PORT: process.env.DB_PORT,
	PORT: process.env.PORT,
	MSG_QUEUE_URL: process.env.MSG_QUEUE_URL,
	APP_SECRET: process.env.APP_SECRET,
	SENTRY_DSN: process.env.SENTRY_DSN
};