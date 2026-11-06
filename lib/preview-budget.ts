'use client';

import type { Cost } from '@/scripts/schema';

/* ==========================================================================
   Who gets to be live.
   --------------------------------------------------------------------------
   The constraint that shapes this whole site: Chromium allows roughly 16
   simultaneous WebGL contexts *per renderer process*, and creating the 17th
   does not fail — it fires `webglcontextlost` on the OLDEST one. So the
   failure mode of "just render every preview" is not a crash, it is cards
   silently going black as the user scrolls, which is far worse because it
   looks like a bug in the component rather than in the page.

   Same-origin iframes share the renderer process, so isolating previews in
   iframes does not raise the ceiling. There is no way around a budget.

   This module is the single arbiter. Every preview asks for a slot, gets a
   yes or no, and re-asks whenever the ranking changes. Grants go to the
   highest-priority claimants; the rest render a static poster instead.
   ========================================================================== */

/**
 * Simultaneous live previews allowed per cost tier.
 *
 * `webgl: 2` against a ceiling of ~16 looks conservative, and is deliberate:
 * a single component may itself allocate more than one context (a dual-canvas
 * split uses two), the detail page may hold one while the grid behind it
 * holds another, and low-end integrated GPUs report the limit as 8.
 */
export const LIMIT: Record<Cost, number> = {
  css: Number.POSITIVE_INFINITY,
  dom: 8,
  canvas2d: 3,
  webgl: 2,
};

export interface Claim {
  id: string;
  cost: Cost;
  /** Higher wins. See `priority()`. */
  weight: number;
}

type Listener = (live: boolean) => void;

interface Entry extends Claim {
  notify: Listener;
  granted: boolean;
}

const entries = new Map<string, Entry>();
let scheduled = false;

/**
 * Ranking. Multiplicative rather than additive so the tiers cannot invert:
 * no amount of intersection ratio lets a background card outrank a hovered
 * one, and nothing outranks the component a detail page is actually about.
 */
export function priority(
  ratio: number,
  { hovered = false, focused = false } = {},
): number {
  return Math.max(ratio, 0.001) * (hovered ? 100 : 1) * (focused ? 1000 : 1);
}

function settle(): void {
  scheduled = false;

  // A hidden tab gets nothing. Checked here rather than only on
  // `visibilitychange`, because a tab opened in the background — cmd-click, or
  // a restored session — is hidden from its very first paint and never fires
  // that event, so it would allocate its full budget of real GPU contexts and
  // evict them from the tab the user is actually looking at.
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    revokeAll();
    return;
  }

  const byCost = new Map<Cost, Entry[]>();
  for (const entry of entries.values()) {
    const list = byCost.get(entry.cost);
    if (list) list.push(entry);
    else byCost.set(entry.cost, [entry]);
  }

  for (const [cost, list] of byCost) {
    const limit = LIMIT[cost];
    list.sort((a, b) => b.weight - a.weight);

    for (let i = 0; i < list.length; i += 1) {
      const entry = list[i];
      if (!entry) continue;
      const granted = i < limit;
      if (granted !== entry.granted) {
        entry.granted = granted;
        entry.notify(granted);
      }
    }
  }
}

/**
 * Coalesce to one settle per frame. Scrolling a grid fires an intersection
 * callback per card; re-sorting on each of those would turn a cheap sort into
 * a per-card cost, and a preview could be granted and revoked several times
 * within one frame — each revocation tearing down a real GPU context.
 */
function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  if (typeof queueMicrotask === 'function') queueMicrotask(settle);
  else Promise.resolve().then(settle);
}

export function claim(claimRequest: Claim, notify: Listener): () => void {
  entries.set(claimRequest.id, { ...claimRequest, notify, granted: false });
  schedule();

  return () => {
    entries.delete(claimRequest.id);
    schedule();
  };
}

export function update(id: string, weight: number): void {
  const entry = entries.get(id);
  if (!entry || entry.weight === weight) return;
  entry.weight = weight;
  schedule();
}

/**
 * Revoke everything, so a backgrounded tab holds zero GPU contexts — which
 * matters because the user's other tab is the one that now needs them. Reached
 * both from `visibilitychange` and from `settle` itself.
 */
export function revokeAll(): void {
  for (const entry of entries.values()) {
    if (!entry.granted) continue;
    entry.granted = false;
    entry.notify(false);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') revokeAll();
    else schedule();
  });
}
