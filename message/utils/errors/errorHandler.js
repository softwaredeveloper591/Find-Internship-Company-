const BaseError = require("./customError");
require("dotenv").config(); 

const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

module.exports = (app) => {
  app.use((error, req, res, next) => {
    let reportError = !(error instanceof BaseError);

    if (reportError) {
      Sentry.captureException(error);
    }

    const statusCode = error.statusCode || 500;
    const data = error.data || error.message;
    return res.status(statusCode).json(data);
  });
};