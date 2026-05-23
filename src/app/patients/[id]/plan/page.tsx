"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { RULES } from "@/lib/rules/treatment";
import type { Patient, Visit, TreatmentSuggestion, SkinProfile, Region } from "@/lib/types";

type Data = { patient: Patient; visits: Visit[] };

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const [data, setData] = useState<Data | null>(null);
  const [suggestions, setSuggestions] = useState<TreatmentSuggestion[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    const [pd, sg] = await Promise.all([
      fetch(`/api/patients/${id}`).then((r) => r.json()),
      fetch(`/api/treatments?patient_id=${id}`).then((r) => r.json()),
    ]);
    setData(pd);
    setSuggestions(sg);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-zinc-500">…</div>;

  const latest = data.visits[data.visits.length - 1];
  const baseline = data.visits[0];

  async function patch(suggestionId: string, body: Partial<TreatmentSuggestion>) {
    await fetch(`/api/treatments/${suggestionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  const latestSuggs = latest
    ? suggestions.filter((s) => s.visit_id === latest.id)
    : [];

  const latestProf = latest ? (JSON.parse(latest.profile_json) as SkinProfile) : null;
  const baseProf = baseline ? (JSON.parse(baseline.profile_json) as SkinProfile) : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <Link href={`/patients/${id}`} className="text-xs text-zinc-500 hover:underline">
          ← {data.patient.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{t("plan_title")}</h1>
        <p className="text-sm text-zinc-600 mt-1">{t("plan_subtitle")}</p>
      </div>

      {latest && baseline && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-600 shadow-sm">
          <div className="flex justify-between">
            <span>
              <strong>{t("plan_baseline")}:</strong> {baseline.captured_at.slice(0, 10)}
            </span>
            <span>
              <strong>{t("plan_latest")}:</strong> {latest.captured_at.slice(0, 10)}
            </span>
          </div>
        </div>
      )}

      {latestSuggs.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
          {t("plan_empty")}
        </div>
      )}

      <ul className="space-y-3">
        {latestSuggs.map((s) => {
          const rule = RULES.find((r) => r.id === s.rule_id);
          const body =
            s.status === "edited" && s.edited_text
              ? s.edited_text
              : rule
              ? lang === "zh-TW" ? rule.text_zh : rule.text_en
              : s.text;
          const regionLabel =
            s.region === "global"
              ? (t("region_global") as string)
              : (t(`region_${s.region as Region}` as `region_${Region}`) as string);
          const metricLabel = t(
            `metric_${s.metric as "L" | "a" | "b" | "texture" | "pore" | "wrinkle" | "symmetry" | "overall_texture" | "overall_redness"}` as never,
          ) as string;
          return (
            <li
              key={s.id}
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                s.status === "rejected"
                  ? "border-zinc-200 opacity-60"
                  : s.status === "accepted"
                  ? "border-emerald-200"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  <div>
                    <span className="font-medium text-zinc-700">{t("plan_triggered_by")}: </span>
                    {regionLabel} · {metricLabel}
                  </div>
                  <div>
                    <span className="font-medium text-zinc-700">{t("plan_delta")}: </span>
                    <span className={s.delta > 0 ? "text-rose-600" : "text-emerald-700"}>
                      {s.delta > 0 ? "+" : ""}
                      {s.delta.toFixed(2)}
                    </span>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {editing === s.id ? (
                <div className="mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-zinc-300 p-2 text-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white"
                      onClick={() => {
                        patch(s.id, { status: "edited", edited_text: editText });
                        setEditing(null);
                      }}
                    >
                      {t("plan_save_edit")}
                    </button>
                    <button
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs"
                      onClick={() => setEditing(null)}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-zinc-800">{body}</p>
              )}

              {s.status === "rejected" && s.reject_reason && (
                <div className="mt-2 text-xs text-zinc-500">
                  {s.reject_reason}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {s.status === "suggested" && (
                  <>
                    <button
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white"
                      onClick={() => patch(s.id, { status: "accepted" })}
                    >
                      {t("plan_accept")}
                    </button>
                    <button
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs"
                      onClick={() => {
                        setEditing(s.id);
                        setEditText(body);
                      }}
                    >
                      {t("plan_edit")}
                    </button>
                    <RejectControl
                      value={rejectReason}
                      onChange={setRejectReason}
                      onSubmit={() => {
                        patch(s.id, {
                          status: "rejected",
                          reject_reason: rejectReason || undefined,
                        });
                        setRejectReason("");
                      }}
                    />
                  </>
                )}
                {s.status !== "suggested" && (
                  <button
                    className="text-xs text-zinc-500 underline"
                    onClick={() =>
                      patch(s.id, {
                        status: "suggested",
                        edited_text: undefined,
                        reject_reason: undefined,
                      })
                    }
                  >
                    Reset
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {latestProf && baseProf && (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer">Raw profile JSON</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded bg-zinc-900 p-3 text-[10px] text-zinc-100">
            {JSON.stringify({ baseline: baseProf, latest: latestProf }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TreatmentSuggestion["status"] }) {
  const { t } = useI18n();
  const key = `plan_status_${status}` as
    | "plan_status_suggested"
    | "plan_status_accepted"
    | "plan_status_edited"
    | "plan_status_rejected";
  const palette: Record<typeof status, string> = {
    suggested: "bg-zinc-100 text-zinc-700",
    accepted: "bg-emerald-100 text-emerald-800",
    edited: "bg-sky-100 text-sky-800",
    rejected: "bg-zinc-100 text-zinc-500 line-through",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${palette[status]}`}>
      {t(key) as string}
    </span>
  );
}

function RejectControl({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        {t("plan_reject")}
      </button>
    );
  }
  return (
    <div className="flex w-full gap-2 items-center">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("plan_reject_reason")}
        className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs"
      />
      <button
        onClick={() => {
          onSubmit();
          setOpen(false);
        }}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white"
      >
        {t("plan_reject")}
      </button>
      <button
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        className="text-xs text-zinc-500 underline"
      >
        {t("cancel")}
      </button>
    </div>
  );
}
