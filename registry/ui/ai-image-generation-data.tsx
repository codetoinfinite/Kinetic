/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Image Generation" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
import { GALLERY_ITEMS, type GalleryItem } from "@/registry/ui/image-gallery-masonry";

/* Shared types and seed data for the AI Image Generation page. Everything is
   fixed so the page renders the same on the server and the client. */

export type ImageView = "thread" | "automations" | "customize";
export type ImageFeedback = "like" | "dislike" | null;

export interface ImageSession {
  id: string;
  title: string;
  /** Short age shown in the badge, e.g. "34m" or "now". */
  age: string;
}

export interface ImageRepo {
  id: string;
  name: string;
  sessions: ImageSession[];
}

export type ThreadEntry =
  | { id: string; kind: "user"; text: string; styles?: string[] }
  | { id: string; kind: "assistant"; text: string }
  | { id: string; kind: "image"; prompt: string; item: GalleryItem; feedback?: ImageFeedback };

export interface StylePreset {
  id: string;
  label: string;
  /** Gallery picture used as the preset's thumbnail. */
  sample: GalleryItem;
}

export interface AspectOption {
  id: string;
  label: string;
  /** CSS aspect-ratio for the generated tile. */
  ratio: string;
}

export const ASPECTS: AspectOption[] = [
  { id: "1:1", label: "Square", ratio: "1 / 1" },
  { id: "4:5", label: "Portrait", ratio: "4 / 5" },
  { id: "3:4", label: "Poster", ratio: "3 / 4" },
  { id: "4:3", label: "Landscape", ratio: "4 / 3" },
];

/** One preset per gallery picture, so every thumbnail is real artwork. */
export const STYLE_PRESETS: StylePreset[] = GALLERY_ITEMS.map((item) => ({
  id: item.style.replace(/\s+/g, "-"),
  label: item.style.charAt(0).toUpperCase() + item.style.slice(1),
  sample: item,
}));

export const IMAGE_MODELS = [
  { id: "fable-5", name: "Fable 5", description: "Painterly detail, best all-rounder", tone: "blue" as const },
  { id: "fable-5-mini", name: "Fable 5 Mini", description: "Fast drafts in a few seconds", monogram: "FM", tone: "cyan" as const },
  { id: "prism-2", name: "Prism 2", description: "Sharp type and product shots", tone: "orange" as const, badges: ["new" as const] },
  { id: "halftone-xl", name: "Halftone XL", description: "Print-ready posters at 4K", monogram: "HX", tone: "purple" as const, badges: ["pro" as const] },
];

export const PROJECTS = ["project-sea", "harbor-ui", "kinetic-lab"];
export const AGENT_MODES = [
  { id: "agent", label: "Agent", description: "Plans, generates and refines on its own" },
  { id: "ask", label: "Ask", description: "Answers first, generates when you confirm" },
  { id: "draft", label: "Draft", description: "Low-res previews only, no credits used" },
];

export const INITIAL_REPOS: ImageRepo[] = [
  {
    id: "boardui",
    name: "boardui",
    sessions: [
      { id: "pro-badge", title: "pro badge restyle", age: "2h" },
      { id: "install-docs", title: "installation docs page", age: "1d" },
    ],
  },
  {
    id: "vibl",
    name: "vibl coding project",
    sessions: [
      { id: "landing", title: "landing page design", age: "34m" },
      { id: "image-generation", title: "image generation", age: "now" },
      { id: "coding", title: "coding scenario", age: "now" },
      { id: "mobile-vue", title: "mobile app for vuejs starter", age: "5h" },
      { id: "refactor", title: "code refactor dropdown", age: "18h" },
    ],
  },
  {
    id: "strider",
    name: "strider landing page work",
    sessions: [
      { id: "hero-anim", title: "hero section animation", age: "3d" },
      { id: "pricing-copy", title: "pricing table copy", age: "4d" },
    ],
  },
  {
    id: "pirate",
    name: "pirate mini game iOS",
    sessions: [
      { id: "cannon", title: "cannon physics tuning", age: "1w" },
      { id: "sprites", title: "sprite sheet cleanup", age: "2w" },
    ],
  },
];

const byId = (id: string): GalleryItem => GALLERY_ITEMS.find((item) => item.id === id) ?? GALLERY_ITEMS[0]!;

/** The picture the opening generation resolves into. */
export const FIRST_RESULT: GalleryItem = {
  id: "gen-footballer",
  title: "Footballer dribbling",
  style: "vintage editorial",
  ratio: "4 / 5",
  kind: "beach",
  palette: ["#9fc3e8", "#f3e3c3", "#e4572e", "#1d3557"],
  halftone: true,
};

export const FIRST_PROMPT =
  "Create a vintage editorial illustration of a footballer dribbling in a striped home kit against a blue background.";

export const INITIAL_THREADS: Record<string, ThreadEntry[]> = {
  "image-generation": [
    { id: "u-1", kind: "user", text: FIRST_PROMPT },
    { id: "g-1", kind: "image", prompt: FIRST_PROMPT, item: FIRST_RESULT },
  ],
  landing: [
    { id: "u-2", kind: "user", text: "Hero art for the landing page: yellow cabs in heavy palette-knife oil, morning light." },
    { id: "g-2", kind: "image", prompt: "Yellow cabs in heavy palette-knife oil, morning light", item: byId("cabs"), feedback: "like" },
    { id: "a-2", kind: "assistant", text: "Here is the hero option. Want a cooler palette for the dark theme?" },
  ],
  coding: [
    { id: "u-3", kind: "user", text: "Sketch a mascot for the coding scenario docs: a cat holding a mug, thick linework." },
    { id: "g-3", kind: "image", prompt: "A cat holding a mug, thick linework", item: byId("cat") },
  ],
};

export const SUGGESTIONS = [
  "A hanok bookshop at dusk in a soft pastel duotone",
  "Perfume bottle still life with grainy neon reflections",
  "Ronin in a red coat, cel-shaded, wind in the grass",
];

const KINDS: GalleryItem["kind"][] = [
  "crown", "ronin", "bloom", "branch", "perfume", "cat", "cabs", "beach", "highway", "goldfish", "hanok", "ape",
];

const PALETTES: GalleryItem["palette"][] = [
  ["#f6d7dd", "#9cc3d1", "#ffffff", "#56698a"],
  ["#1b1530", "#ff4fa3", "#53e0ff", "#f2eaff"],
  ["#f4e7d7", "#c8312b", "#f3b13c", "#1c1a1a"],
  ["#dbe8c6", "#4f7a3a", "#f1cf5f", "#1f2a1c"],
  ["#93d3e6", "#f2d7a6", "#ff7a59", "#1f5f8b"],
  ["#f0e2c8", "#2f6d6a", "#f08a24", "#3b2b23"],
];

/** FNV-1a: a stable 32-bit hash, so a prompt always picks the same artwork. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** "Create a vintage illustration of…" → "Vintage illustration of". */
export function titleFromPrompt(prompt: string): string {
  const words = prompt
    .replace(/^(please\s+)?(create|make|draw|generate|render|sketch|paint|design)\s+(an?\s+|the\s+)?/i, "")
    .replace(/[.,:;!?]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled image";
}

/** A deterministic picture for a prompt: the seed picks the artwork and its palette. */
export function itemFromPrompt(id: string, prompt: string, ratio: string, styles: string[]): GalleryItem {
  const seed = hashString(`${id}:${prompt}`);
  return {
    id,
    title: titleFromPrompt(prompt),
    style: styles.length ? styles.join(", ").toLowerCase() : "fable 5",
    ratio,
    kind: KINDS[seed % KINDS.length] ?? "bloom",
    palette: PALETTES[(seed >>> 8) % PALETTES.length] ?? PALETTES[0]!,
    halftone: (seed & 1) === 1,
  };
}
