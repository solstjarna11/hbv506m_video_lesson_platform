const rateLimit = require("express-rate-limit");
const { rateLimitAuditLogger } = require("./logging/rateLimitAuditLogger");

module.exports = rateLimit({
  windowMs: 60 * 60 * 1000, // rate limit lasts for 1 hour
  max: 5, // max 5 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Please try again later.",
  handler: rateLimitAuditLogger({
    eventType: "register_rate_limited",
    message: "Registration rate limit exceeded",
    metadata: {
      windowMs: 60 * 60 * 1000,
      maxAttempts: 5,
      flow: "register",
    },
  }),
});
