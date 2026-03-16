// Operations for "audit_logs" table.
// All queries are parameterized (?). Defense against injection (A05).

const db = require("./index");
const {
  sanitizeString,
  stringifyMetadata,
  MAX_USER_AGENT_LENGTH,
} = require("../utils/logging/sanitizeLogData");

function logEvent({
  event_type,
  severity = "info",
  actor_user_id = null,
  ip_address = null,
  user_agent = null,
  message = null,
  metadata = null,
}) {
  const metadata_json = stringifyMetadata(metadata);

  const stmt = db.prepare(`
    INSERT INTO audit_logs
      (event_type, severity, actor_user_id, ip_address, user_agent, message, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    sanitizeString(event_type, 80),
    sanitizeString(severity, 20),
    actor_user_id,
    sanitizeString(ip_address, 100),
    sanitizeString(user_agent, MAX_USER_AGENT_LENGTH),
    sanitizeString(message, 300),
    metadata_json,
  );

  return result.lastInsertRowid;
}

function getLatestLogs({ limit = 50, severity = null } = {}) {
  // Limit is interpolated safely by validation (can't be parameterized in SQLite LIMIT reliably with all wrappers)
  // Note: for LIMIT, we validate it and then interpolate the number.
  // That avoids injection risk while keeping things compatible.
  const safeLimit =
    Number.isInteger(limit) && limit > 0 && limit <= 500 ? limit : 50;

  if (severity) {
    return db
      .prepare(
        `
        SELECT *
        FROM audit_logs
        WHERE severity = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ${safeLimit}
      `,
      )
      .all(severity);
  }

  return db
    .prepare(
      `
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ${safeLimit}
    `,
    )
    .all();
}

function searchLogs({
  severity,
  event_type,
  actor_user_id,
  q,
  from,
  to,
  limit = 50,
} = {}) {
  const where = [];
  const params = [];

  const safeLimit =
    Number.isInteger(limit) && limit > 0 && limit <= 500 ? limit : 50;

  if (severity) {
    where.push("severity = ?");
    params.push(severity);
  }

  if (event_type) {
    where.push("event_type = ?");
    params.push(event_type);
  }

  if (Number.isInteger(actor_user_id) && actor_user_id > 0) {
    where.push("actor_user_id = ?");
    params.push(actor_user_id);
  }

  if (q && q.trim()) {
    where.push("(message LIKE ? OR ip_address LIKE ? OR user_agent LIKE ?)");
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }

  if (from) {
    where.push("created_at >= datetime(?)");
    params.push(from);
  }

  if (to) {
    where.push("created_at <= datetime(?)");
    params.push(to);
  }

  const sql = `
    SELECT *
    FROM audit_logs
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC, id DESC
    LIMIT ${safeLimit}
  `;

  return db.prepare(sql).all(...params);
}

module.exports = {
  logEvent,
  getLatestLogs,
  searchLogs,
};
