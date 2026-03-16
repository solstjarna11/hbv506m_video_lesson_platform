const { safeAuditLog } = require('../auditLogger');
const { writeErrorLog } = require('../logging/writeErrorLog');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) ? err.statusCode :
    Number.isInteger(err.status) ? err.status :
    500;

  const isOperational = Boolean(err.isOperational);
  const eventType = err.eventType || (statusCode >= 500 ? 'server_error' : 'request_error');
  const severity = err.severity || (statusCode >= 500 ? 'error' : 'warn');

  const publicMessage =
    statusCode >= 500
      ? 'Something went wrong. Please try again later.'
      : (err.publicMessage || 'The request could not be completed.');

  writeErrorLog(req, err, {
    statusCode,
    eventType,
    metadata: {
      isOperational,
      severity,
    },
  });

  safeAuditLog(req, {
    event_type: eventType,
    severity,
    actor_user_id: req.user?.id ?? null,
    message: isOperational ? err.message : 'Unexpected application error',
    metadata: {
      statusCode,
      code: err.code || null,
      method: req.method,
      path: req.originalUrl,
      isOperational,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      ...(err.metadata || {}),
    },
  });

  res.locals.message = publicMessage;
  res.locals.error = process.env.NODE_ENV === 'development' ? err : {};
  res.status(statusCode);

  return res.render('error');
}

module.exports = errorHandler;