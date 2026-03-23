const rateLimit = require("express-rate-limit");
const { rateLimitHandler } = require("./logging/rateLimitHandler");

module.exports = rateLimit({
  windowMs: 60 * 60 * 1000, // rate limit lasts for 1 hour
  max: 100, // max 5 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Please try again later.",
  handler: rateLimitHandler({
    eventType: "register_rate_limited",
    message: "Registration rate limit exceeded",
    metadata: {
      windowMs: 60 * 60 * 1000,
      maxAttempts: 100,
      flow: "register",
    },
    view: "auth/register",
    viewData: (req) => ({
      title: "Register",
      pageCss: "/stylesheets/pages/register.css",
      form: {
        email: req.body?.email || "",
        display_name: req.body?.display_name || "",
      },
    }),
  }),
});
