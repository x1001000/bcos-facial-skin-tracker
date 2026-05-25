import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getDb } from "@/lib/db";
import type { Patient, Visit, Consent } from "@/lib/types";

const UPLOADS =
  process.env.BCOS_UPLOADS_DIR ?? path.join(process.cwd(), "public", "uploads");

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const patient = db.prepare("SELECT id FROM patients WHERE id = ?").get(id);
  if (!patient) return NextResponse.json({ error: "not found" }, { status: 404 });

  const visits = db
    .prepare("SELECT image_path, landmarks_path FROM visits WHERE patient_id = ?")
    .all(id) as { image_path: string; landmarks_path: string | null }[];

  // FK cascade removes consents, visits, treatments.
  db.prepare("DELETE FROM patients WHERE id = ?").run(id);

  // Best-effort: remove per-visit uploads. Only touch files inside UPLOADS, and
  // skip seed assets like placeholder.svg.
  await Promise.all(
    visits.flatMap((v) =>
      [v.image_path, v.landmarks_path]
        .filter((p): p is string => !!p && p.startsWith("/uploads/") && !p.endsWith("placeholder.svg"))
        .map(async (rel) => {
          const abs = path.join(UPLOADS, path.basename(rel));
          await fs.unlink(abs).catch(() => {});
        }),
    ),
  );

  return NextResponse.json({ ok: true });
}
