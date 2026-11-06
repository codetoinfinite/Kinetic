/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Language Select" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'language-select',
  title: 'Language Select',
  category: 'form',
  kit: 'boardui',
  tags: ['select', 'language', 'i18n', 'footer', 'boardui'],
  blurb:
    'A footer language picker on the kit Select: translate glyph or flag in the trigger, flag emoji, native names with lang and dir per option.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/language-select.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],

  summary:
    'The small "English" pill from a site footer, built on the kit `Select`, so it keeps the kit popover motion, outside-press dismissal, typeahead and arrow-key navigation. Each option shows a decorative region flag, the language name in that language and the name in the interface language. It works controlled or uncontrolled and ships a 16-language default list, including two right-to-left scripts.',

  mechanism: [
    'The selected code lives in `value` when the parent controls it, otherwise in local state seeded from `defaultValue` (or the first language). It is always passed to the kit `Select` as `value`, so the listbox and the trigger read one source. `onChange` ignores a null key and a re-pick of the current language, then calls `onChange(code, language)`.',
    'Each `SelectItem` gets `id={code}` and `textValue={nativeName}`. Typeahead matches what the user sees first, and the flag emoji does not get in the way of matching.',
    'The native name is a `<span lang={code} dir={dir}>`, so screen readers switch voice for "Deutsch" or "日本語", and Arabic and Hebrew render right-to-left inside an otherwise left-to-right menu. The flag is `aria-hidden`.',
    '`flagEmoji(region)` maps the two letters of an ISO 3166 region to the regional-indicator code points `0x1F1E6 + (letter - 65)`. Fonts draw the pair as a single flag glyph.',
    'The trigger uses the kit Select `renderValue`. It shows `RiTranslate2` (the default) or the selected flag, then the native name. A trailing `RiCheckLine` marks the current row and is only made `invisible` on the others, so every row keeps the same width.',
  ],

  constants: [
    {
      name: 'regional indicator A',
      value: '0x1F1E6',
      why: 'Unicode puts the 26 regional-indicator symbols in A–Z order from U+1F1E6. Two of them in sequence are rendered as the flag of that region.',
    },
    {
      name: 'popover width',
      value: 'w-[248px]',
      why: 'This is narrower than the shared 266px menu but still fits the longest default row, "🇨🇳 简体中文 Chinese (Simplified)", with the check mark. Longer names truncate.',
    },
    {
      name: 'list height',
      value: 'max-h-[240px] (kit Select)',
      why: 'About six rows are visible. The 16 defaults scroll, and the popover still fits above a footer trigger at the bottom of a viewport.',
    },
    {
      name: 'size',
      value: 'sm by default (px-[7px] py-1, Body 2 Medium, 16px glyph)',
      why: 'This matches the compact footer pill. Use `size="md"` and a `label` when the select sits in a settings form.',
    },
  ],

  pitfalls: [
    'Using the flag as the language label. A flag names a country: English is not only 🇺🇸, and Arabic is not only 🇸🇦. The trigger defaults to the translate glyph, and every flag is `aria-hidden` decoration next to a real name.',
    'Windows does not draw flag emoji, so it shows the two letters ("DE") instead. That is acceptable here only because the flag is never the sole label.',
    'Leaving out `lang` on native names. A screen reader then reads "日本語" or "Deutsch" with the interface voice and mispronounces it.',
  ],

  notes: [
    'Pass your own `languages` to limit the list to the locales you ship. Each needs `code`, `nativeName`, `name` and `region`, and optionally `dir`.',
    '`trigger="flag"` with `showName={false}` gives the most compact footer variant, the second select in the demo.',
  ],

  apiSignature:
    'function LanguageSelect(props: { languages?: readonly Language[]; value?: string; defaultValue?: string; onChange?: (code: string, language: Language) => void; trigger?: "icon" | "flag"; showName?: boolean; size?: "sm" | "md"; label?: ReactNode; "aria-label"?: string; isDisabled?: boolean; className?: string; triggerClassName?: string }): JSX.Element',

  props: [
    { name: 'languages', type: 'readonly Language[]', default: 'LANGUAGES', description: 'Options in display order: `{ code, nativeName, name, region, dir? }`.' },
    { name: 'value', type: 'string', description: 'Selected language code (controlled).' },
    { name: 'defaultValue', type: 'string', default: 'first language', description: 'Initial code when uncontrolled.' },
    { name: 'onChange', type: '(code: string, language: Language) => void', description: 'Called when a different language is picked.' },
    { name: 'trigger', type: '"icon" | "flag"', default: '"icon"', description: 'What precedes the native name in the trigger.' },
    { name: 'showName', type: 'boolean', default: 'true', description: 'Show the interface-language name after the native name in each option.' },
    { name: 'size', type: '"sm" | "md"', default: '"sm"', description: 'Kit Select size.' },
    { name: 'label', type: 'ReactNode', description: 'Visible label above the trigger. It replaces `aria-label` as the name.' },
    { name: 'aria-label', type: 'string', default: '"Language"', description: 'Accessible name when there is no visible label.' },
    { name: 'isDisabled', type: 'boolean', default: 'false', description: 'Disables the trigger.' },
  ],

  reducedMotion:
    'The only motion is the kit Select popover fade and scale, which is a short CSS transition. Nothing in this component animates on its own.',

  cleanup:
    'There is nothing of its own to clean up. The kit Select owns its outside-press listener and removes it when the popover closes or the component unmounts.',

  acceptance:
    'The trigger reads "English" after a translate glyph. Opening it lists 16 languages, each with a flag, a native name and a grey English name, and a check mark on the current one. Typing "d" moves focus to Deutsch and Enter selects it. The trigger then reads "Deutsch", and `onChange` receives "de". In the list, العربية and עברית render right-to-left. Escape or a click outside closes the list without changing the value.',

  criticalRegion: 'critical',
};

export default meta;
