const rateLimit = require("express-rate-limit");
const { rateLimitAuditLogger } = require("./logging/rateLimitAuditLogger");

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  // helps avoid the trust proxy validation error if needed
  validate: { trustProxy: false },

  message: "Too many login attempts, please try again later.",
  handler: rateLimitAuditLogger({
    eventType: "login_rate_limited",
    message: "Login rate limit exceeded",
    metadata: {
      windowMs: 15 * 60 * 1000,
      maxAttempts: 10,
      flow: "login",
    },
  }),
});