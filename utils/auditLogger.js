const auditLogsRepo = require('../db/auditLogsRepo');

// Safely log an audit event, catching and logging any errors internally
function safeAuditLog(req, payload) {
  try {
    const baseMetadata = payload.metadata || {};

    auditLogsRepo.logEvent({
      ...payload,
      ip_address: req?.ip ?? null,
      user_agent: req?.get?.('User-Agent') ?? null,
      metadata: {
        ...baseMetadata,
        userRole: req?.user?.role ?? null
      }
    });
  } catch (e) {
    console.warn('Audit log failed:', e.message);
  }
}

module.exports = { safeAuditLog };
