"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LANG, dict, type Lang } from "./dictionaries";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: <K extends keyof typeof dict.en>(
    key: K,
    ...args: typeof dict.en[K] extends (...a: infer A) => unknown ? A : []
  ) => string;
};

const I18nContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "bcos.lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "zh-TW") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<Ctx>(() => {
    const t: Ctx["t"] = (key, ...args) => {
      const entry = dict[lang][key] as unknown;
      if (typeof entry === "function") {
        return (entry as (...a: unknown[]) => string)(...args);
      }
      return entry as string;
    };
    return { lang, setLang, t };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
