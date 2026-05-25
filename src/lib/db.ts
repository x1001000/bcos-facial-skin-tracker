import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.BCOS_DB_PATH ?? path.join(process.cwd(), "bcos.db");
const UPLOADS_DIR =
  process.env.BCOS_UPLOADS_DIR ?? path.join(process.cwd(), "public", "uploads");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birth_year INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      signed_name TEXT NOT NULL,
      signature_data TEXT NOT NULL,
      signed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      captured_at TEXT NOT NULL DEFAULT (datetime('now')),
      image_path TEXT NOT NULL,
      landmarks_path TEXT,
      profile_json TEXT NOT NULL,
      quality_passed INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS visits_patient_idx ON visits(patient_id, captured_at);

    CREATE TABLE IF NOT EXISTS treatments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      rule_id TEXT NOT NULL,
      region TEXT NOT NULL,
      metric TEXT NOT NULL,
      delta REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'suggested',
      text TEXT NOT NULL,
      edited_text TEXT,
      reject_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS treatments_visit_idx ON treatments(visit_id);
  `);
}

