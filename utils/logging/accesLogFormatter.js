const { sanitizeString } = require('./sanitizeLogData');

const MAX_ACCESS_URL_LENGTH =
  Number.parseInt(process.env.LOG_MAX_ACCESS_URL_LENGTH, 10) || 200;

const MAX_ACCESS_REFERRER_LENGTH =
  Number.parseInt(process.env.LOG_MAX_ACCESS_REFERRER_LENGTH, 10) || 200;

const MAX_ACCESS_USER_AGENT_LENGTH =
  Number.parseInt(process.env.LOG_MAX_ACCESS_USER_AGENT_LENGTH, 10) || 200;

function formatAccessLog(tokens, req, res) {
  const remoteAddr = sanitizeString(tokens['remote-addr'](req, res) || '-', 100) || '-';
  const method = sanitizeString(tokens.method(req, res) || '-', 16) || '-';
  const url = sanitizeString(tokens.url(req, res) || '-', MAX_ACCESS_URL_LENGTH) || '-';
  const httpVersion = sanitizeString(tokens['http-version'](req, res) || '1.1', 10) || '1.1';
  const status = sanitizeString(tokens.status(req, res) || '-', 10) || '-';
  const contentLength = sanitizeString(tokens.res(req, res, 'content-length') || '-', 20) || '-';
  const referrer =
    sanitizeString(tokens.referrer(req, res) || '-', MAX_ACCESS_REFERRER_LENGTH) || '-';
  const userAgent =
    sanitizeString(tokens['user-agent'](req, res) || '-', MAX_ACCESS_USER_AGENT_LENGTH) || '-';

  return `${remoteAddr} - - "${method} ${url} HTTP/${httpVersion}" ${status} ${contentLength} "${referrer}" "${userAgent}"`;
}

module.exports = { formatAccessLog };