import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    patient_id: string;
    signed_name: string;
    signature_data: string;
  };
  if (!body.patient_id || !body.signed_name?.trim() || !body.signature_data) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO consents (id, patient_id, signed_name, signature_data) VALUES (?, ?, ?, ?)",
  ).run(id, body.patient_id, body.signed_name.trim(), body.signature_data);
  return NextResponse.json({ id }, { status: 201 });
}
