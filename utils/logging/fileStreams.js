const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');

const logsDir = process.env.LOG_DIR || path.join(__dirname, '..', '..', 'logs');

fs.mkdirSync(logsDir, { recursive: true });

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createRotatingLogStream(filename) {
  return rfs.createStream(filename, {
    size: process.env.LOG_ROTATE_SIZE || '1M',
    interval: process.env.LOG_ROTATE_INTERVAL || '1d',
    maxFiles: parsePositiveInt(process.env.LOG_MAX_FILES, 7),
    compress: 'gzip',
    path: logsDir,
  });
}

const accessLogStream = createRotatingLogStream('access.log');
const errorLogStream = createRotatingLogStream('error.log');

module.exports = {
  logsDir,
  accessLogPath: path.join(logsDir, 'access.log'),
  errorLogPath: path.join(logsDir, 'error.log'),
  accessLogStream,
  errorLogStream,
};