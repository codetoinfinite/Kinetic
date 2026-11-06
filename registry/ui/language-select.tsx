/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Language Select" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Key } from "react-aria-components";
import { RiCheckLine, RiTranslate2 } from "@remixicon/react";
import { Select, SelectItem } from "@/registry/ui/select";
import type { SelectSize } from "@/registry/ui/select";
import { cx } from "@/registry/lib/cx";

/**
 * Language Select: the footer language picker. Built on the kit `Select`, so
 * it keeps its popover motion, outside-press dismissal, typeahead and
 * arrow-key navigation.
 *
 *   <LanguageSelect defaultValue="de" onChange={(code) => setLocale(code)} />
 *
 * Every option shows the region flag (decorative), the language's own name
 * marked up with `lang` and `dir` so screen readers switch voice, and the
 * name in the interface language. The trigger leads with a translate glyph by
 * default, because a flag names a country, not a language.
 */

export interface Language {
  /** BCP 47 tag. Used as the option id and as `lang` on the native name. */
  code: string;
  /** The language's name for itself: "Deutsch", "日本語". */
  nativeName: string;
  /** The name in the interface language, shown as the secondary label. */
  name: string;
  /** ISO 3166-1 alpha-2 region whose flag decorates the option. */
  region: string;
  /** Writing direction of the native name. Defaults to "ltr". */
  dir?: "ltr" | "rtl";
}

export const LANGUAGES: readonly Language[] = [
  { code: "en", nativeName: "English", name: "English", region: "US" },
  { code: "de", nativeName: "Deutsch", name: "German", region: "DE" },
  { code: "es", nativeName: "Español", name: "Spanish", region: "ES" },
  { code: "fr", nativeName: "Français", name: "French", region: "FR" },
  { code: "it", nativeName: "Italiano", name: "Italian", region: "IT" },
  { code: "pt-BR", nativeName: "Português", name: "Portuguese", region: "BR" },
  { code: "nl", nativeName: "Nederlands", name: "Dutch", region: "NL" },
  { code: "pl", nativeName: "Polski", name: "Polish", region: "PL" },
  { code: "tr", nativeName: "Türkçe", name: "Turkish", region: "TR" },
  { code: "uk", nativeName: "Українська", name: "Ukrainian", region: "UA" },
  { code: "ar", nativeName: "العربية", name: "Arabic", region: "SA", dir: "rtl" },
  { code: "he", nativeName: "עברית", name: "Hebrew", region: "IL", dir: "rtl" },
  { code: "hi", nativeName: "हिन्दी", name: "Hindi", region: "IN" },
  { code: "ja", nativeName: "日本語", name: "Japanese", region: "JP" },
  { code: "ko", nativeName: "한국어", name: "Korean", region: "KR" },
  { code: "zh-CN", nativeName: "简体中文", name: "Chinese (Simplified)", region: "CN" },
];

const REGIONAL_INDICATOR_A = 0x1f1e6;

/** "DE" → 🇩🇪. Two regional-indicator symbols that fonts draw as one flag. */
export function flagEmoji(region: string): string {
  const letters = region.toUpperCase();
  if (!/^[A-Z]{2}$/.test(letters)) return "";
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + letters.charCodeAt(0) - 65,
    REGIONAL_INDICATOR_A + letters.charCodeAt(1) - 65,
  );
}

export interface LanguageSelectProps {
  /** Options, in display order. Defaults to `LANGUAGES` (16 languages). */
  languages?: readonly Language[];
  /** Selected language code (controlled). */
  value?: string;
  /** Initial language code when uncontrolled. Falls back to the first language. */
  defaultValue?: string;
  /** Called with the new code and its `Language` record. */
  onChange?: (code: string, language: Language) => void;
  /** What leads the trigger: the translate glyph (default) or the selected flag. */
  trigger?: "icon" | "flag";
  /** Show the interface-language name after the native name in the list. */
  showName?: boolean;
  /** Kit Select size. `sm` matches the footer pill. */
  size?: SelectSize;
  /** Visible label above the trigger. Without it the select is named by `aria-label`. */
  label?: ReactNode;
  "aria-label"?: string;
  isDisabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

// #region critical
export function LanguageSelect({
  languages = LANGUAGES,
  value,
  defaultValue,
  onChange,
  trigger = "icon",
  showName = true,
  size = "sm",
  label,
  "aria-label": ariaLabel = "Language",
  isDisabled,
  className,
  triggerClassName,
}: LanguageSelectProps) {
  const [inner, setInner] = useState(() => defaultValue ?? languages[0]?.code ?? "");
  const current = value ?? inner;
  const selected = languages.find((l) => l.code === current) ?? languages[0];

  const change = (key: Key | null) => {
    if (key === null) return;
    const next = languages.find((l) => l.code === String(key));
    if (!next || next.code === current) return;
    if (value === undefined) setInner(next.code);
    onChange?.(next.code, next);
  };

  const iconSize = size === "sm" ? "size-4" : "size-[18px]";

  return (
    <Select
      label={label}
      aria-label={label ? undefined : ariaLabel}
      size={size}
      value={selected?.code ?? null}
      onChange={change}
      isDisabled={isDisabled}
      className={cx("w-fit", className)}
      triggerClassName={triggerClassName}
      popoverClassName="w-[248px]"
      renderValue={
        selected ? (
          <>
            {trigger === "flag" ? (
              <span aria-hidden className="shrink-0 text-[15px] leading-none">
                {flagEmoji(selected.region)}
              </span>
            ) : (
              <RiTranslate2 aria-hidden className={cx(iconSize, "shrink-0 text-foreground-icon-secondary")} />
            )}
            <span lang={selected.code} dir={selected.dir ?? "ltr"} className="truncate">
              {selected.nativeName}
            </span>
          </>
        ) : null
      }
    >
      {languages.map((language) => {
        const isCurrent = language.code === selected?.code;
        return (
          <SelectItem
            key={language.code}
            id={language.code}
            textValue={language.nativeName}
            className="gap-2.5"
          >
            <span aria-hidden className="w-5 shrink-0 text-center text-[17px] leading-none">
              {flagEmoji(language.region)}
            </span>
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
              <span lang={language.code} dir={language.dir ?? "ltr"} className="truncate">
                {language.nativeName}
              </span>
              {showName && language.name !== language.nativeName ? (
                <span className="truncate text-caption-1-regular text-text-tertiary">{language.name}</span>
              ) : null}
            </span>
            <RiCheckLine
              aria-hidden
              className={cx("size-4 shrink-0 text-foreground-icon-primary", !isCurrent && "invisible")}
            />
          </SelectItem>
        );
      })}
    </Select>
  );
}
// #endregion
