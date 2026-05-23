import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Beauty Clinic OS — facial intake & longitudinal tracking",
  description:
    "Standardized facial photo intake, quantified skin profiles, longitudinal comparison, and explainable treatment planning for beauty clinics.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <I18nProvider>
          <Header />
          <main className="flex-1">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
