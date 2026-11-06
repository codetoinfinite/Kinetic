# Build: Language Select

The small "English" pill from a site footer, built on the kit `Select`, so it keeps the kit popover motion, outside-press dismissal, typeahead and arrow-key navigation. Each option shows a decorative region flag, the language name in that language and the name in the interface language. It works controlled or uncontrolled and ships a 16-language default list, including two right-to-left scripts.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A footer language picker on the kit Select: translate glyph or flag in the trigger, flag emoji, native names with lang and dir per option.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. The selected code lives in `value` when the parent controls it, otherwise in local state seeded from `defaultValue` (or the first language). It is always passed to the kit `Select` as `value`, so the listbox and the trigger read one source. `onChange` ignores a null key and a re-pick of the current language, then calls `onChange(code, language)`.
2. Each `SelectItem` gets `id={code}` and `textValue={nativeName}`. Typeahead matches what the user sees first, and the flag emoji does not get in the way of matching.
3. The native name is a `<span lang={code} dir={dir}>`, so screen readers switch voice for "Deutsch" or "日本語", and Arabic and Hebrew render right-to-left inside an otherwise left-to-right menu. The flag is `aria-hidden`.
4. `flagEmoji(region)` maps the two letters of an ISO 3166 region to the regional-indicator code points `0x1F1E6 + (letter - 65)`. Fonts draw the pair as a single flag glyph.
5. The trigger uses the kit Select `renderValue`. It shows `RiTranslate2` (the default) or the selected flag, then the native name. A trailing `RiCheckLine` marks the current row and is only made `invisible` on the others, so every row keeps the same width.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `regional indicator A = 0x1F1E6`
  Unicode puts the 26 regional-indicator symbols in A–Z order from U+1F1E6. Two of them in sequence are rendered as the flag of that region.
- `popover width = w-[248px]`
  This is narrower than the shared 266px menu but still fits the longest default row, "🇨🇳 简体中文 Chinese (Simplified)", with the check mark. Longer names truncate.
- `list height = max-h-[240px] (kit Select)`
  About six rows are visible. The 16 defaults scroll, and the popover still fits above a footer trigger at the bottom of a viewport.
- `size = sm by default (px-[7px] py-1, Body 2 Medium, 16px glyph)`
  This matches the compact footer pill. Use `size="md"` and a `label` when the select sits in a settings form.

## API

```ts
function LanguageSelect(props: { languages?: readonly Language[]; value?: string; defaultValue?: string; onChange?: (code: string, language: Language) => void; trigger?: "icon" | "flag"; showName?: boolean; size?: "sm" | "md"; label?: ReactNode; "aria-label"?: string; isDisabled?: boolean; className?: string; triggerClassName?: string }): JSX.Element
```

- `languages: readonly Language[]` — default `LANGUAGES`
  Options in display order: `{ code, nativeName, name, region, dir? }`.
- `value: string`
  Selected language code (controlled).
- `defaultValue: string` — default `first language`
  Initial code when uncontrolled.
- `onChange: (code: string, language: Language) => void`
  Called when a different language is picked.
- `trigger: "icon" | "flag"` — default `"icon"`
  What precedes the native name in the trigger.
- `showName: boolean` — default `true`
  Show the interface-language name after the native name in each option.
- `size: "sm" | "md"` — default `"sm"`
  Kit Select size.
- `label: ReactNode`
  Visible label above the trigger. It replaces `aria-label` as the name.
- `aria-label: string` — default `"Language"`
  Accessible name when there is no visible label.
- `isDisabled: boolean` — default `false`
  Disables the trigger.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** There is nothing of its own to clean up. The kit Select owns its outside-press listener and removes it when the popover closes or the component unmounts.

**Reduced motion.** The only motion is the kit Select popover fade and scale, which is a short CSS transition. Nothing in this component animates on its own.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using the flag as the language label. A flag names a country: English is not only 🇺🇸, and Arabic is not only 🇸🇦. The trigger defaults to the translate glyph, and every flag is `aria-hidden` decoration next to a real name.
- Windows does not draw flag emoji, so it shows the two letters ("DE") instead. That is acceptable here only because the flag is never the sole label.
- Leaving out `lang` on native names. A screen reader then reads "日本語" or "Deutsch" with the interface voice and mispronounces it.

## Notes

- Pass your own `languages` to limit the list to the locales you ship. Each needs `code`, `nativeName`, `name` and `region`, and optionally `dir`.
- `trigger="flag"` with `showName={false}` gives the most compact footer variant, the second select in the demo.

## Definition of done

The trigger reads "English" after a translate glyph. Opening it lists 16 languages, each with a flag, a native name and a grey English name, and a check mark on the current one. Typing "d" moves focus to Deutsch and Enter selects it. The trigger then reads "Deutsch", and `onChange` receives "de". In the list, العربية and עברית render right-to-left. Escape or a click outside closes the list without changing the value.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
