const rateLimit = require("express-rate-limit");
const { rateLimitHandler } = require("./logging/rateLimitHandler");

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  // helps avoid the trust proxy validation error if needed
  validate: { trustProxy: false },

  message: "Too many login attempts, please try again later.",
  handler: rateLimitHandler({
    eventType: "login_rate_limited",
    message: "Login rate limit exceeded",
    metadata: {
      windowMs: 15 * 60 * 1000,
      maxAttempts: 100,
      flow: "login",
    },
    view: "auth/login",
    viewData: (req) => ({
      title: "Login",
      pageCss: "/stylesheets/pages/register.css",
      form: { email: req.body?.email || "" },
    }),
  }),
});
