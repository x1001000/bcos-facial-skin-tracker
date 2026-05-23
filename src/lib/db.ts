import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import type { SkinProfile, Region } from "./types";
import { evaluateRules } from "./rules/treatment";

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
  seedIfEmpty(_db);
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

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM patients").get() as {
    n: number;
  };
  if (count.n > 0) return;
  seed(db);
}

function makeRegion(
  L: number,
  a: number,
  b: number,
  texture: number,
  pore: number,
  wrinkle: number,
) {
  return { L, a, b, texture, pore, wrinkle };
}

function makeProfile(opts: {
  luminance: number;
  redness: number;
  texture: number;
  asymmetry: number;
}): SkinProfile {
  const { luminance, redness, texture, asymmetry } = opts;
  const r = (name: Region, redBoost = 0, texBoost = 0): [Region, ReturnType<typeof makeRegion>] => [
    name,
    makeRegion(
      luminance + Math.random() * 2 - 1,
      redness + redBoost + Math.random() * 0.5 - 0.25,
      8 + Math.random() * 1.5,
      texture + texBoost + Math.random() * 2,
      30 + Math.random() * 5 + (name === "nose" ? 12 : 0),
      name === "forehead" || name === "perioral" ? texture * 0.6 + Math.random() * 1.5 : 0,
    ),
  ];
  const per_region = Object.fromEntries([
    r("forehead", 0, 1.5),
    r("left_cheek", -0.2, 0),
    r("right_cheek", asymmetry, 0),
    r("nose", 0.5, 0),
    r("perioral", 0, 0.5),
    r("chin", 0, 0),
  ]) as SkinProfile["per_region"];
  return {
    quality: {
      yaw: (Math.random() - 0.5) * 6,
      pitch: (Math.random() - 0.5) * 6,
      luminance,
      ipd: 220 + Math.random() * 20,
      blur: 120 + Math.random() * 30,
      passed: true,
    },
    per_region,
    global: {
      symmetry: asymmetry,
      overall_texture: texture,
      overall_redness: redness,
    },
  };
}

function seed(db: Database.Database) {
  const insertPatient = db.prepare(
    "INSERT INTO patients (id, name, birth_year, notes) VALUES (?, ?, ?, ?)",
  );
  const insertVisit = db.prepare(
    "INSERT INTO visits (id, patient_id, captured_at, image_path, profile_json) VALUES (?, ?, ?, ?, ?)",
  );
  const insertConsent = db.prepare(
    "INSERT INTO consents (id, patient_id, signed_name, signature_data) VALUES (?, ?, ?, ?)",
  );

  type PatientSeed = {
    id: string;
    name: string;
    birth_year: number;
    notes: string;
    visits: { daysAgo: number; profile: SkinProfile }[];
  };

  const today = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const patients: PatientSeed[] = [
    {
      id: "p_lin",
      name: "林佳穎 (Lin, Jia-Ying)",
      birth_year: 1988,
      notes: "Concern: right-cheek redness, post-treatment monitoring",
      visits: [
        {
          daysAgo: 84,
          profile: makeProfile({ luminance: 64, redness: 9.2, texture: 18.0, asymmetry: 4.1 }),
        },
        {
          daysAgo: 42,
          profile: makeProfile({ luminance: 65, redness: 10.8, texture: 17.2, asymmetry: 5.8 }),
        },
        {
          daysAgo: 3,
          profile: makeProfile({ luminance: 66, redness: 12.7, texture: 16.4, asymmetry: 7.2 }),
        },
      ],
    },
    {
      id: "p_chen",
      name: "陳奕辰 (Chen, Yi-Chen)",
      birth_year: 1995,
      notes: "Concern: forehead texture and pore density",
      visits: [
        {
          daysAgo: 90,
          profile: makeProfile({ luminance: 61, redness: 7.0, texture: 24.0, asymmetry: 1.5 }),
        },
        {
          daysAgo: 45,
          profile: makeProfile({ luminance: 62, redness: 6.8, texture: 22.1, asymmetry: 1.7 }),
        },
        {
          daysAgo: 5,
          profile: makeProfile({ luminance: 63, redness: 6.5, texture: 19.6, asymmetry: 1.4 }),
        },
      ],
    },
  ];

  const insertSugg = db.prepare(
    `INSERT INTO treatments (id, patient_id, visit_id, rule_id, region, metric, delta, status, text)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'suggested', ?)`,
  );

  const tx = db.transaction(() => {
    for (const p of patients) {
      insertPatient.run(p.id, p.name, p.birth_year, p.notes);
      insertConsent.run(
        randomUUID(),
        p.id,
        p.name.split(" ")[0],
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><text x='10' y='40' font-family='cursive' font-size='28'>" +
          p.name.split(" ")[0] +
          "</text></svg>",
      );
      const visitIds: string[] = [];
      for (const v of p.visits) {
        const captured = new Date(today.getTime() - v.daysAgo * dayMs).toISOString();
        const vid = randomUUID();
        visitIds.push(vid);
        insertVisit.run(
          vid,
          p.id,
          captured,
          "/uploads/placeholder.svg",
          JSON.stringify(v.profile),
        );
      }
      // Evaluate rules: baseline = first visit, current = last visit.
      const baseline = p.visits[0].profile;
      const current = p.visits[p.visits.length - 1].profile;
      const triggered = evaluateRules(baseline, current);
      const currentVid = visitIds[visitIds.length - 1];
      for (const t of triggered) {
        insertSugg.run(
          randomUUID(),
          p.id,
          currentVid,
          t.rule.id,
          t.rule.region,
          t.rule.metric,
          t.delta,
          t.rule.text_en,
        );
      }
    }
  });
  tx();
}
