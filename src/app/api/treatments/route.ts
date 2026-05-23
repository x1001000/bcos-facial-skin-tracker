import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { TreatmentSuggestion } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const visitId = searchParams.get("visit_id");
  const patientId = searchParams.get("patient_id");
  if (!visitId && !patientId) {
    return NextResponse.json({ error: "visit_id or patient_id required" }, { status: 400 });
  }
  const db = getDb();
  const rows = visitId
    ? (db
        .prepare("SELECT * FROM treatments WHERE visit_id = ? ORDER BY created_at ASC")
        .all(visitId) as TreatmentSuggestion[])
    : (db
        .prepare("SELECT * FROM treatments WHERE patient_id = ? ORDER BY created_at DESC")
        .all(patientId) as TreatmentSuggestion[]);
  return NextResponse.json(rows);
}
