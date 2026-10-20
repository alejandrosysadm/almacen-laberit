'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'almacen.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      cat TEXT NOT NULL,
      serial_norm TEXT,
      data TEXT NOT NULL,
      history TEXT NOT NULL DEFAULT '[]',
      created_at TEXT, created_by TEXT,
      updated_at TEXT, updated_by TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS items_serial ON items(serial_norm) WHERE serial_norm IS NOT NULL AND serial_norm <> '';
    CREATE INDEX IF NOT EXISTS items_cat ON items(cat);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT, email TEXT,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      must_change INTEGER NOT NULL DEFAULT 0,
      pw_hash TEXT NOT NULL,
      failed INTEGER NOT NULL DEFAULT 0,
      lock_until TEXT, last_login TEXT, pw_changed TEXT,
      created_at TEXT, created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      ip TEXT, ua TEXT
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      t TEXT NOT NULL, u TEXT, a TEXT, d TEXT, r TEXT
    );
    CREATE INDEX IF NOT EXISTS audit_t ON audit(t);
  `);
  return db;
}
module.exports = { openDb };
