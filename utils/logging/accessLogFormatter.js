const { sanitizeString } = require("./sanitizeLogData");

const MAX_ACCESS_URL_LENGTH =
  Number.parseInt(process.env.LOG_MAX_ACCESS_URL_LENGTH, 10) || 200;

const MAX_ACCESS_REFERRER_LENGTH =
  Number.parseInt(process.env.LOG_MAX_ACCESS_REFERRER_LENGTH, 10) || 200;

const MAX_ACCESS_USER_AGENT_LENGTH =
  Number.parseInt(process.env.LOG_MAX_ACCESS_USER_AGENT_LENGTH, 10) || 200;

function decodeForLogging(value) {
  if (!value) return value;

  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function formatAccessLog(tokens, req, res) {
  const remoteAddr =
    sanitizeString(tokens["remote-addr"](req, res) || "-", 100) || "-";
  const method = sanitizeString(tokens.method(req, res) || "-", 16) || "-";
  const httpVersion =
    sanitizeString(tokens["http-version"](req, res) || "1.1", 10) || "1.1";
  const status = sanitizeString(tokens.status(req, res) || "-", 10) || "-";
  const contentLength =
    sanitizeString(tokens.res(req, res, "content-length") || "-", 20) || "-";
  const rawUrl = tokens.url(req, res) || "-";
  const rawReferrer = tokens.referrer(req, res) || "-";

  const url =
    sanitizeString(decodeForLogging(rawUrl), MAX_ACCESS_URL_LENGTH) || "-";
  const referrer =
    sanitizeString(decodeForLogging(rawReferrer), MAX_ACCESS_REFERRER_LENGTH) ||
    "-";
  const userAgent =
    sanitizeString(
      tokens["user-agent"](req, res) || "-",
      MAX_ACCESS_USER_AGENT_LENGTH,
    ) || "-";

  return `${remoteAddr} - - "${method} ${url} HTTP/${httpVersion}" ${status} ${contentLength} "${referrer}" "${userAgent}"`;
}

module.exports = { formatAccessLog };
