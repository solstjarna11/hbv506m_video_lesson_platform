const { safeAuditLog } = require('../auditLogger');

function rateLimitHandler({
  eventType,
  severity = 'warn',
  message,
  metadata = {},
  view = null,
  viewData = null,
} = {}) {
  return function rateLimitHandler(req, res, next, options) {
    const retryAfterHeader = res.getHeader('Retry-After');
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
    const responseMessage = options.message || message || 'Rate limit exceeded';

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

    if (view) {
      const extraViewData = typeof viewData === 'function' ? viewData(req) : (viewData || {});
      return res.status(options.statusCode).render(view, {
        errors: [responseMessage],
        ...extraViewData,
      });
    }

    return res.status(options.statusCode).send(responseMessage);
  };
}

module.exports = { rateLimitHandler };
