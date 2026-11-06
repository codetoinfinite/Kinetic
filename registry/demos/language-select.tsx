'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Language Select" (boardui.com/).
 * No BoardUI source was used.
 */
import { useState } from "react";
import { parseDate } from "@internationalized/date";
import { LanguageSelect, LANGUAGES } from "@/registry/ui/language-select";

const GREETING: Record<string, string> = {
  en: "Welcome back, Ada",
  de: "Willkommen zurück, Ada",
  es: "Bienvenida de nuevo, Ada",
  fr: "Bon retour parmi nous, Ada",
  it: "Bentornata, Ada",
  "pt-BR": "Bem-vinda de volta, Ada",
  nl: "Welkom terug, Ada",
  pl: "Witaj ponownie, Ada",
  tr: "Tekrar hoş geldin, Ada",
  uk: "З поверненням, Ada",
  ar: "مرحبًا بعودتك يا Ada",
  he: "ברוכה השבה, Ada",
  hi: "वापसी पर स्वागत है, Ada",
  ja: "おかえりなさい、Adaさん",
  ko: "다시 오신 것을 환영합니다, Ada님",
  "zh-CN": "欢迎回来，Ada",
};

// A fixed day, so the preview never depends on the clock.
const RELEASE = parseDate("2026-11-05").toDate("UTC");

export default function Demo() {
  const [code, setCode] = useState("en");
  const language = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
  const dir = language?.dir ?? "ltr";

  const date = new Intl.DateTimeFormat(code, { dateStyle: "full", timeZone: "UTC" }).format(RELEASE);
  const price = new Intl.NumberFormat(code, { style: "currency", currency: "EUR" }).format(1249.5);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-[640px] rounded-2xl border border-border-component-detail-container bg-background-primary-default shadow-card">
        <div className="flex flex-col gap-4 border-b border-separator-border p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-headline-medium text-text-primary">Language &amp; region</h3>
            <p className="mt-1 text-body-2-regular text-text-secondary">
              Changes the dashboard copy, dates and currency. Your teammates keep their own setting.
            </p>
          </div>
          <LanguageSelect
            label="Interface language"
            size="md"
            value={code}
            onChange={(next) => setCode(next)}
            className="shrink-0"
            triggerClassName="min-w-[180px]"
          />
        </div>

        <div className="p-5">
          <p className="text-caption-1-semibold uppercase tracking-wide text-text-tertiary">Preview</p>
          <div
            data-lang-preview=""
            lang={code}
            dir={dir}
            className="mt-2 rounded-xl bg-background-secondary-default p-4"
          >
            <p className="text-title-3-medium text-text-primary">{GREETING[code] ?? GREETING.en}</p>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-body-2-regular sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-caption-1-regular text-text-tertiary" lang="en">
                  Release date
                </dt>
                <dd className="truncate text-text-primary">{date}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption-1-regular text-text-tertiary" lang="en">
                  Pro licence
                </dt>
                <dd className="text-text-primary">{price}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator-border px-5 py-3">
          <span className="text-caption-1-regular text-text-tertiary">Footer variant, same state</span>
          <LanguageSelect
            aria-label="Footer language"
            trigger="flag"
            showName={false}
            value={code}
            onChange={(next) => setCode(next)}
          />
        </div>
      </div>
    </div>
  );
}
