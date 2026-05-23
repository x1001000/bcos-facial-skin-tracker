import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as {
    status?: "accepted" | "edited" | "rejected";
    edited_text?: string;
    reject_reason?: string;
  };
  const db = getDb();
  const existing = db.prepare("SELECT id FROM treatments WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.status) {
    sets.push("status = ?");
    vals.push(body.status);
  }
  if (body.edited_text !== undefined) {
    sets.push("edited_text = ?");
    vals.push(body.edited_text);
  }
  if (body.reject_reason !== undefined) {
    sets.push("reject_reason = ?");
    vals.push(body.reject_reason);
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  vals.push(id);
  db.prepare(`UPDATE treatments SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  return NextResponse.json({ ok: true });
}
