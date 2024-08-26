const BaseError = require("./customError");

const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://c5f3589cf7f85b3e309f2c1e2f652e64@o4507821746094080.ingest.de.sentry.io/4507827687129168",
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