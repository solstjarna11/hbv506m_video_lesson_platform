const { errorLogStream } = require('./fileStreams');
const { sanitizeString, sanitizeValue } = require('./sanitizeLogData');

function writeErrorLog(req, err, extras = {}) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      event_type: sanitizeString(extras.eventType || err?.eventType || 'server_error', 80),
      status_code: Number.isInteger(extras.statusCode) ? extras.statusCode : (err?.statusCode || 500),
      code: sanitizeString(err?.code || '', 80) || null,
      actor_user_id: req?.user?.id ?? null,
      ip_address: sanitizeString(req?.ip ?? '', 100) || null,
      method: sanitizeString(req?.method ?? '', 16) || null,
      path: sanitizeString(req?.originalUrl ?? req?.url ?? '', 200) || null,
      message: sanitizeString(err?.message || 'Unexpected application error', 300),
      metadata: sanitizeValue(extras.metadata || {}),
    };

    errorLogStream.write(`${JSON.stringify(entry)}\n`);
  } catch (logErr) {
    console.warn('Error file logging failed:', logErr.message);
  }
}

module.exports = { writeErrorLog };