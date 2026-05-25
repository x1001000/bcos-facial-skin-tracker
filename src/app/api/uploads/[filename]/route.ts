import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const UPLOADS =
  process.env.BCOS_UPLOADS_DIR ?? path.join(process.cwd(), "public", "uploads");

const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!SAFE_NAME.test(filename)) {
    return NextResponse.json({ error: "bad filename" }, { status: 400 });
  }
  const ext = path.extname(filename).toLowerCase();
  const type = CONTENT_TYPES[ext];
  if (!type) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }
  try {
    const file = await fs.readFile(path.join(UPLOADS, filename));
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
