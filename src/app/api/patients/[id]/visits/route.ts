import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { getDb } from "@/lib/db";
import type { SkinProfile } from "@/lib/types";
import { evaluateRules } from "@/lib/rules/treatment";

const UPLOADS =
  process.env.BCOS_UPLOADS_DIR ?? path.join(process.cwd(), "public", "uploads");

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: patientId } = await params;
  const body = (await req.json()) as {
    image_data_url: string;
    landmarks?: unknown;
    profile: SkinProfile;
  };

  if (!body?.image_data_url || !body?.profile) {
    return NextResponse.json({ error: "image and profile required" }, { status: 400 });
  }

  const db = getDb();
  const patient = db.prepare("SELECT id FROM patients WHERE id = ?").get(patientId);
  if (!patient) return NextResponse.json({ error: "patient not found" }, { status: 404 });

  // Decode data URL and write to disk.
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(body.image_data_url);
  if (!m) return NextResponse.json({ error: "bad image data url" }, { status: 400 });
  const ext = m[1] === "image/png" ? "png" : "jpg";
  const buf = Buffer.from(m[2], "base64");
  const visitId = randomUUID();
  await fs.mkdir(UPLOADS, { recursive: true });
  const imgRel = `/uploads/${visitId}.${ext}`;
  await fs.writeFile(path.join(UPLOADS, `${visitId}.${ext}`), buf);

  let landmarksRel: string | null = null;
  if (body.landmarks) {
    landmarksRel = `/uploads/${visitId}.landmarks.json`;
    await fs.writeFile(
      path.join(UPLOADS, `${visitId}.landmarks.json`),
      JSON.stringify(body.landmarks),
    );
  }

  db.prepare(
    `INSERT INTO visits (id, patient_id, captured_at, image_path, landmarks_path, profile_json, quality_passed)
     VALUES (?, ?, datetime('now'), ?, ?, ?, ?)`,
  ).run(
    visitId,
    patientId,
    imgRel,
    landmarksRel,
    JSON.stringify(body.profile),
    body.profile.quality.passed ? 1 : 0,
  );

  // Evaluate rules against baseline (first quality-passed visit).
  const baselineRow = db
    .prepare(
      `SELECT profile_json FROM visits WHERE patient_id = ? AND deleted_at IS NULL AND quality_passed = 1
       ORDER BY captured_at ASC LIMIT 1`,
    )
    .get(patientId) as { profile_json: string } | undefined;

  if (baselineRow) {
    const baseline = JSON.parse(baselineRow.profile_json) as SkinProfile;
    const triggered = evaluateRules(baseline, body.profile);
    const insertSugg = db.prepare(
      `INSERT INTO treatments (id, patient_id, visit_id, rule_id, region, metric, delta, status, text)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'suggested', ?)`,
    );
    for (const t of triggered) {
      insertSugg.run(
        randomUUID(),
        patientId,
        visitId,
        t.rule.id,
        t.rule.region,
        t.rule.metric,
        t.delta,
        t.rule.text_en, // store English source; UI shows localized via rule lookup
      );
    }
  }

  return NextResponse.json({ visit_id: visitId, image_path: imgRel }, { status: 201 });
}
