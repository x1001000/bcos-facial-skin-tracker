"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

export function Header() {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-lg font-semibold text-zinc-900">{t("app_name")}</span>
          <span className="hidden sm:inline text-xs text-zinc-500">{t("app_tagline")}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/patients" className="text-zinc-700 hover:text-zinc-950">
            {t("nav_patients")}
          </Link>
          <div className="flex rounded-md border border-zinc-200 overflow-hidden text-xs">
            <button
              onClick={() => setLang("zh-TW")}
              className={`px-2 py-1 ${lang === "zh-TW" ? "bg-zinc-900 text-white" : "bg-white text-zinc-700"}`}
            >
              中
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-1 ${lang === "en" ? "bg-zinc-900 text-white" : "bg-white text-zinc-700"}`}
            >
              EN
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
