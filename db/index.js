const Database = require('better-sqlite3'); // SQLite library, synchronous and fast.
const path = require('path'); // For handling file paths
const fs = require('fs'); // File system module

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db'); // Path to the SQLite database file
console.log('dbPath: ', dbPath)

// Ensure data folder exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Good defaults
db.pragma('journal_mode = WAL'); // Better concurrency & crash resilience
db.pragma('foreign_keys = ON'); // Enforce foreign key constraints

module.exports = db;
