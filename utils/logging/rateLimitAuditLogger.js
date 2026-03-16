const { safeAuditLog } = require('../auditLogger');

function rateLimitAuditLogger({
  eventType,
  severity = 'warn',
  message,
  metadata = {},
} = {}) {
  return function rateLimitHandler(req, res, next, options) {
    const retryAfterHeader = res.getHeader('Retry-After');
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);

    safeAuditLog(req, {
      event_type: eventType || 'rate_limited',
      severity,
      actor_user_id: req.user?.id ?? null,
      message: message || 'Rate limit exceeded',
      metadata: {
        limiter: eventType || 'rate_limited',
        statusCode: options.statusCode,
        limitScope: 'ip',
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
        ...metadata,
      },
    });

    res.status(options.statusCode).send(options.message);
  };
}

module.exports = { rateLimitAuditLogger };
