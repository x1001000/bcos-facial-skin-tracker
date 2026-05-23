"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import type { Patient } from "@/lib/types";

type Row = Patient & { visit_count: number };

export default function PatientsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const r = await fetch("/api/patients");
    setRows(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim()) return;
    await fetch("/api/patients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        birth_year: birthYear ? Number(birthYear) : null,
        notes: notes || null,
      }),
    });
    setName("");
    setBirthYear("");
    setNotes("");
    setShowAdd(false);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("patients_title")}</h1>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          {t("patient_add")}
        </button>
      </div>

      {showAdd && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 space-y-3 shadow-sm">
          <label className="block text-sm">
            <span className="text-zinc-700">{t("patient_name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-700">{t("patient_birth_year")}</span>
            <input
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              type="number"
              className="mt-1 w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-700">{t("patient_notes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={add}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              {t("save")}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 divide-y rounded-lg border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 && (
          <div className="px-4 py-6 text-sm text-zinc-500">{t("patients_empty")}</div>
        )}
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
          >
            <div>
              <div className="font-medium text-zinc-900">{p.name}</div>
              <div className="text-xs text-zinc-500">
                {p.birth_year ? `${p.birth_year} · ` : ""}
                {p.notes ?? ""}
              </div>
            </div>
            <div className="text-xs text-zinc-500">{t("visits_count", p.visit_count)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
