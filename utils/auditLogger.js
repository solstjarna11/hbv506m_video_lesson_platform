const auditLogsRepo = require('../db/auditLogsRepo');

function safeAuditLog(req, payload) {
  try {
    const baseMetadata = payload.metadata || {};

    auditLogsRepo.logEvent({
      event_type: payload.event_type,
      severity: payload.severity || 'info',
      actor_user_id: payload.actor_user_id ?? req?.user?.id ?? null,
      ip_address: req?.ip ?? null,
      user_agent: req?.get?.('User-Agent') ?? null,
      message: payload.message || null,
      metadata: {
        ...baseMetadata,
        method: req?.method ?? null,
        path: req?.originalUrl ?? req?.path ?? null,
        userRole: req?.user?.role ?? null,
      },
    });
  } catch (e) {
    console.warn('Audit log failed:', e.message);
  }
}

module.exports = { safeAuditLog };