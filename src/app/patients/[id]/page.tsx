"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { MetricChart } from "@/components/MetricChart";
import type { Patient, Visit, Consent, SkinProfile, RegionMetrics } from "@/lib/types";
import { REGIONS } from "@/lib/types";

type Data = { patient: Patient; visits: Visit[]; consent: Consent | null };

const METRICS: (keyof RegionMetrics)[] = ["L", "a", "b", "texture", "pore", "wrinkle"];

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [metric, setMetric] = useState<keyof RegionMetrics>("a");
  const [aIdx, setAIdx] = useState(0);
  const [bIdx, setBIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t("patient_delete_confirm"))) return;
    setDeleting(true);
    const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/patients");
    } else {
      setDeleting(false);
      alert(`delete failed: ${res.status}`);
    }
  }

  useEffect(() => {
    fetch(`/api/patients/${id}`).then((r) => r.json()).then((d: Data) => {
      setData(d);
      if (d.visits.length > 0) {
        setAIdx(0);
        setBIdx(d.visits.length - 1);
      }
    });
  }, [id]);

  const points = useMemo(() => {
    if (!data) return [];
    return data.visits.map((v) => {
      const p = JSON.parse(v.profile_json) as SkinProfile;
      return {
        date: v.captured_at.slice(0, 10),
        per_region: p.per_region,
      };
    });
  }, [data]);

  if (!data) {
    return <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-zinc-500">…</div>;
  }

  const hasConsent = data.consent !== null;
  const newVisitHref = hasConsent
    ? `/intake/${id}`
    : `/consent/${id}`;

  const visitA = data.visits[aIdx];
  const visitB = data.visits[bIdx];
  const profA = visitA ? (JSON.parse(visitA.profile_json) as SkinProfile) : null;
  const profB = visitB ? (JSON.parse(visitB.profile_json) as SkinProfile) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.patient.name}</h1>
          <div className="text-xs text-zinc-500 mt-1">
            {data.patient.birth_year ? `${data.patient.birth_year} · ` : ""}
            {data.patient.notes ?? ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/patients/${id}/plan`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {t("plan_title")}
          </Link>
          <Link
            href={newVisitHref}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            + {t("nav_new_visit")}
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            {deleting ? "…" : t("patient_delete")}
          </button>
        </div>
      </div>

      {data.visits.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
          {t("timeline_no_visits")}
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{t("timeline_compare")}</h2>
              <div className="text-xs text-zinc-500">
                {t("visits_count", data.visits.length)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <ComparisonCard
                label={t("timeline_baseline")}
                visits={data.visits}
                profile={profA}
                idx={aIdx}
                onChange={setAIdx}
              />
              <ComparisonCard
                label={t("timeline_current")}
                visits={data.visits}
                profile={profB}
                idx={bIdx}
                onChange={setBIdx}
              />
            </div>
            {profA && profB && (
              <DeltaTable a={profA} b={profB} />
            )}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{t("metrics_title")}</h2>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as keyof RegionMetrics)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
              >
                {METRICS.map((m) => (
                  <option key={m} value={m}>
                    {t(`metric_${m}` as `metric_${typeof m}`) as string}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4">
              <MetricChart data={points} metric={metric} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ComparisonCard({
  label,
  visits,
  profile,
  idx,
  onChange,
}: {
  label: string;
  visits: Visit[];
  profile: SkinProfile | null;
  idx: number;
  onChange: (i: number) => void;
}) {
  const { t } = useI18n();
  if (!profile) return null;
  const visit = visits[idx];
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <select
          value={idx}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded border border-zinc-300 px-2 py-1 text-xs"
        >
          {visits.map((v, i) => (
            <option key={v.id} value={i}>
              {v.captured_at.slice(0, 10)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 aspect-[4/5] w-full overflow-hidden rounded bg-zinc-100 relative">
        <Image
          src={visit.image_path}
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span
          className={
            profile.quality.passed
              ? "text-emerald-700"
              : "text-amber-700"
          }
        >
          {profile.quality.passed ? "✓ " + t("quality_passed") : "⚠ " + t("quality_failed")}
        </span>
        <span className="text-zinc-500">
          L* {profile.global.overall_redness.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function DeltaTable({ a, b }: { a: SkinProfile; b: SkinProfile }) {
  const { t } = useI18n();
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-1 pr-3">{t("table_region")}</th>
            {METRICS.map((m) => (
              <th key={m} className="py-1 px-2">
                {t(`metric_${m}` as `metric_${typeof m}`) as string}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REGIONS.map((region) => (
            <tr key={region} className="border-t border-zinc-100">
              <td className="py-1 pr-3 font-medium text-zinc-700">
                {t(`region_${region}` as `region_${typeof region}`) as string}
              </td>
              {METRICS.map((m) => {
                const av = a.per_region[region][m];
                const bv = b.per_region[region][m];
                const d = bv - av;
                const cls =
                  Math.abs(d) < 0.01
                    ? "text-zinc-400"
                    : d > 0
                    ? "text-rose-600"
                    : "text-emerald-700";
                return (
                  <td key={m} className={`py-1 px-2 ${cls}`}>
                    {d > 0 ? "+" : ""}
                    {d.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
