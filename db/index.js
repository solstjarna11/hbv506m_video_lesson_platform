const Database = require('better-sqlite3'); // SQLite library, synchronous and fast.
const path = require('path'); // For handling file paths
const fs = require('fs'); // File system module
const dotenv = require('dotenv');

const prodEnvPath = '/etc/video-lesson-platform/env'; // production env file path
const localEnvPath = path.resolve(__dirname, '..', '.env'); // local development .env file path

const envPath = fs.existsSync(prodEnvPath) ? prodEnvPath : localEnvPath;

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Could not load env file:', envPath);
} else {
  console.log('Loaded environment variables from:', envPath);
}

console.log('process.env.DB_PATH: ', process.env.DB_PATH);
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db'); // Path to the SQLite database file
console.log('dbPath: ', dbPath);

// Ensure data folder exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Good defaults
db.pragma('journal_mode = WAL'); // Better concurrency & crash resilience
db.pragma('foreign_keys = ON'); // Enforce foreign key constraints

module.exports = db;
