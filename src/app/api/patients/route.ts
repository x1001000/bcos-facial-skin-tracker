import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Patient } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM visits v WHERE v.patient_id = p.id AND v.deleted_at IS NULL) as visit_count
       FROM patients p ORDER BY p.created_at DESC`,
    )
    .all() as (Patient & { visit_count: number })[];
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Patient>;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const db = getDb();
  const id = `p_${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO patients (id, name, birth_year, notes) VALUES (?, ?, ?, ?)",
  ).run(id, body.name.trim(), body.birth_year ?? null, body.notes ?? null);
  const row = db.prepare("SELECT * FROM patients WHERE id = ?").get(id);
  return NextResponse.json(row, { status: 201 });
}
