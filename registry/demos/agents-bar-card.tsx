'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agents Bar Card" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */

import { AgentsBarCard } from '@/registry/ui/agents-bar-card';
import type { AgentMonth, AgentUsage } from '@/registry/ui/agents-bar-card';

const NAMES = [
  'Atlas', 'Nova', 'Echo', 'Pixel', 'Sage', 'Quill', 'Orbit', 'Relay', 'Scout', 'Forge',
  'Lumen', 'Cipher', 'Drift', 'Ember', 'Flux', 'Halo', 'Iris', 'Juno', 'Kite', 'Loom',
  'Mosaic', 'Nimbus', 'Onyx', 'Prism', 'Quartz', 'Rune', 'Sable', 'Tide', 'Umbra', 'Vega',
];
const COLORS = ['neutral', 'blue', 'lime', 'pink'] as const;

// December runs per agent, in creation order; zeros are idle agents.
const DECEMBER = [
  62, 125, 104, 0, 104, 15, 0, 0, 0, 84, 0, 140, 69, 39, 0, 39, 120, 77, 0, 0, 96, 18, 39, 92, 77,
  57, 15, 113, 85, 30,
];

function month(id: string, label: string, shift: number, scale: number): AgentMonth {
  const agents: AgentUsage[] = NAMES.map((name, i) => {
    const base = DECEMBER[(i + shift) % DECEMBER.length] ?? 0;
    return { id: name.toLowerCase(), name, color: COLORS[i % COLORS.length], value: Math.round(base * scale) * 10 };
  });
  return { id, label, agents };
}

const MONTHS: AgentMonth[] = [
  month('oct', 'October', 13, 0.6),
  month('nov', 'November', 7, 0.8),
  month('dec', 'December', 0, 1),
];

export default function Demo() {
  return (
    <div className="w-full max-w-[680px]">
      <AgentsBarCard months={MONTHS} startLabel="Oldest" endLabel="Newest" />
    </div>
  );
}
