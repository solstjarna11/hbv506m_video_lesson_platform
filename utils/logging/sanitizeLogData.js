const MAX_MESSAGE_LENGTH = Number.parseInt(process.env.LOG_MAX_MESSAGE_LENGTH, 10) || 300;
const MAX_METADATA_LENGTH = Number.parseInt(process.env.LOG_MAX_METADATA_LENGTH, 10) || 2000;
const MAX_USER_AGENT_LENGTH = Number.parseInt(process.env.LOG_MAX_USER_AGENT_LENGTH, 10) || 300;
const MAX_FIELD_LENGTH = Number.parseInt(process.env.LOG_MAX_FIELD_LENGTH, 10) || 200;

const REDACTED = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'csrf',
  'csrftoken',
  'csrf_token',
  'session',
  'sessionid',
  'session_id',
  'cookie',
  'cookies',
  'authorization',
  'auth',
  'secret',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
]);

function sanitizeString(value, maxLength = MAX_FIELD_LENGTH) {
  if (value == null) return null;

  const normalized = String(value)
    .replaceAll(/%(25)?0d/gi, ' ')
    .replaceAll(/%(25)?0a/gi, ' ')
    .replaceAll(String.raw`\r`, ' ')
    .replaceAll(String.raw`\n`, ' ')
    .replaceAll(String.raw`\t`, ' ')
    .replaceAll(/[\r\n\t]+/g, ' ')
    .replaceAll('\0', '')
    .replaceAll(/\s{2,}/g, ' ')
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)} ${TRUNCATED}`;
}

function sanitizeValue(value, depth = 0) {
  if (value == null) return value;

  if (depth > 4) {
    return '[MaxDepthExceeded]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: sanitizeString(value.name, 80),
      message: sanitizeString(value.message, MAX_MESSAGE_LENGTH),
    };
  }

  if (typeof value === 'object') {
    const output = {};
    const entries = Object.entries(value).slice(0, 30);

    for (const [key, val] of entries) {
      const normalizedKey = String(key).toLowerCase();

      if (SENSITIVE_KEYS.has(normalizedKey)) {
        output[key] = REDACTED;
      } else {
        output[key] = sanitizeValue(val, depth + 1);
      }
    }

    return output;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return sanitizeString(String(value));
}

function stringifyMetadata(metadata) {
  if (!metadata) return null;

  const sanitized = sanitizeValue(metadata);

  let json;
  try {
    json = JSON.stringify(sanitized);
  } catch (err) {
    json = JSON.stringify({ note: 'Failed to serialize metadata safely' });
  }

  if (json.length <= MAX_METADATA_LENGTH) {
    return json;
  }

  return JSON.stringify({
    note: 'Metadata truncated',
    preview: json.slice(0, MAX_METADATA_LENGTH),
  });
}

module.exports = {
  sanitizeString,
  sanitizeValue,
  stringifyMetadata,
  MAX_MESSAGE_LENGTH,
  MAX_METADATA_LENGTH,
  MAX_USER_AGENT_LENGTH,
};