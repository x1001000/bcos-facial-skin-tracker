import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Patient, Visit, Consent } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(id) as
    | Patient
    | undefined;
  if (!patient) return NextResponse.json({ error: "not found" }, { status: 404 });
  const visits = db
    .prepare(
      "SELECT * FROM visits WHERE patient_id = ? AND deleted_at IS NULL ORDER BY captured_at ASC",
    )
    .all(id) as Visit[];
  const consent = db
    .prepare(
      "SELECT * FROM consents WHERE patient_id = ? ORDER BY signed_at DESC LIMIT 1",
    )
    .get(id) as Consent | undefined;
  return NextResponse.json({ patient, visits, consent });
}
