'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Blob Avatar" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import { useState, type ReactNode } from 'react';
import { Radio, RadioGroup, Label } from 'react-aria-components';
import { RiRefreshLine } from '@remixicon/react';

import { AgentListPanel, type AgentListItem } from '@/registry/ui/agent-list-panel';
import {
  BLOB_COLORS,
  BLOB_FACES,
  BLOB_SHAPES,
  BlobAvatar,
  blobLook,
  type BlobColor,
  type BlobFace,
  type BlobShape,
} from '@/registry/ui/blob-avatar';
import { Button } from '@/registry/ui/button';
import { Input } from '@/registry/ui/input';
import { cx } from '@/registry/lib/cx';

type Look = { shape?: BlobShape; color?: BlobColor; face?: BlobFace };
type Agent = Omit<AgentListItem, 'avatar'> & { look: Look };

const AGENTS: Agent[] = [
  { id: 'landing', name: 'Landing page designer', lastMessage: 'Give the hero one clear action.', time: '2m', status: 'running', look: { shape: 'shield', color: 'lime', face: 'dots' } },
  { id: 'content', name: 'Content reviewer', lastMessage: 'The shorter opening feels warmer.', time: '9m', status: 'done', look: { shape: 'squircle', color: 'peach', face: 'sleepy' } },
  { id: 'marketing', name: 'Marketing bot', lastMessage: 'Lead with the problem you solve.', time: '14m', status: 'waiting', look: { shape: 'star', color: 'mint', face: 'happy' } },
  { id: 'seo', name: 'SEO bot', lastMessage: 'Start with a practical guide.', time: '32m', status: 'running', look: { shape: 'flower', color: 'violet', face: 'dots' } },
  { id: 'research', name: 'Research assistant', lastMessage: 'Ask about the last time they switched.', time: '1h', status: 'done', look: { shape: 'blob', color: 'butter', face: 'surprised' } },
  { id: 'security', name: 'Security agent', lastMessage: 'Review access permissions.', time: '3h', status: 'error', look: { shape: 'diamond', color: 'sky', face: 'wink' } },
  { id: 'planner', name: 'Product planner', lastMessage: 'Seeded from its name, no overrides.', time: 'Mon', status: 'done', look: {} },
];

const SHAPE_LABEL: Record<BlobShape, string> = {
  blob: 'Blob', squircle: 'Squircle', star: 'Star', flower: 'Flower', diamond: 'Diamond', shield: 'Shield', cloud: 'Cloud',
};
const FACE_LABEL: Record<BlobFace, string> = {
  dots: 'Dots', happy: 'Happy', sleepy: 'Sleepy', wink: 'Wink', surprised: 'Surprised', none: 'No face',
};

const tile = ({ isSelected, isFocusVisible, isHovered }: { isSelected: boolean; isFocusVisible: boolean; isHovered: boolean }) =>
  cx(
    'grid size-11 cursor-pointer place-items-center rounded-xl outline-none transition-colors duration-150 ease-out motion-reduce:transition-none',
    isSelected
      ? 'bg-background-tertiary-default ring-1 ring-border-button-hover'
      : isHovered && 'bg-background-secondary-default',
    isFocusVisible && 'ring-2 ring-border-focus-ring',
  );

function Picker({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <RadioGroup value={value} onChange={onChange} orientation="horizontal" className="flex flex-col gap-2">
      <Label className="text-caption-1-medium text-text-secondary">{label}</Label>
      <div className="flex flex-wrap gap-1">{children}</div>
    </RadioGroup>
  );
}

export default function Demo() {
  const [agents, setAgents] = useState(AGENTS);
  const [selected, setSelected] = useState('landing');
  const [created, setCreated] = useState(0);
  const agent = agents.find((a) => a.id === selected) ?? agents[0];
  if (!agent) return null;

  const look = { ...blobLook(agent.name), ...agent.look };
  const custom = Object.keys(agent.look).length > 0;
  const update = (patch: Partial<Agent>) =>
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, ...patch } : a)));
  const setLook = (patch: Look) => update({ look: { ...agent.look, ...patch } });

  const createAgent = () => {
    const n = created + 1;
    setCreated(n);
    setAgents((prev) => [{ id: `new-${n}`, name: `Untitled agent ${n}`, lastMessage: 'Seeded from its name.', time: 'now', status: 'idle', look: {} }, ...prev]);
    setSelected(`new-${n}`);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background-full p-6">
      <div className="flex h-[512px] w-full max-w-[900px] gap-3">
        <AgentListPanel
          agents={agents.map((a) => ({
            ...a,
            name: a.name || 'Untitled',
            avatar: <BlobAvatar name={a.name || 'Untitled'} {...a.look} size="sm" decorative />,
          }))}
          selectedId={agent.id}
          onSelect={(id) => setSelected(id)}
          onCreate={createAgent}
          className="hidden w-[280px] shrink-0 sm:flex"
        />

        <section
          aria-label="Avatar editor"
          className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-3xl border border-border-button-default bg-background-primary-default p-5"
        >
          <header className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate text-body-semibold text-text-primary">{agent.name || 'Untitled'}</h2>
            <Button size="xs" variant="ghost" leadingIcon={RiRefreshLine} disabled={!custom} onClick={() => update({ look: {} })}>
              Match name
            </Button>
          </header>

          <div className="grid gap-5 md:grid-cols-[176px_1fr]">
            <div className="flex flex-col items-center gap-3">
              <div data-testid="hero" className="grid size-44 place-items-center rounded-3xl bg-background-secondary-default">
                <BlobAvatar name={agent.name || 'Untitled'} {...agent.look} size="2xl" />
              </div>
              <div className="flex items-end gap-2" aria-label="Sizes" role="group">
                {(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
                  <BlobAvatar key={s} name={agent.name} {...agent.look} size={s} decorative />
                ))}
              </div>
              <p className="text-caption-2-regular text-text-tertiary">24 · 32 · 40 · 56 px</p>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <Input
                label="Name"
                size="small"
                value={agent.name}
                onChange={(name) => update({ name })}
                hint={custom ? 'Shape, face and colour are set by hand.' : 'Shape, face and colour come from the name.'}
              />
              <Picker label="Shape" value={look.shape} onChange={(v) => setLook({ shape: v as BlobShape })}>
                {BLOB_SHAPES.map((s) => (
                  <Radio key={s} value={s} className={tile}>
                    <BlobAvatar name={s} shape={s} color={look.color} face="none" size={28} animated={false} decorative />
                    <span className="sr-only">{SHAPE_LABEL[s]}</span>
                  </Radio>
                ))}
              </Picker>
              <Picker label="Face" value={look.face} onChange={(v) => setLook({ face: v as BlobFace })}>
                {BLOB_FACES.map((f) => (
                  <Radio key={f} value={f} className={tile}>
                    <BlobAvatar name={f} shape={look.shape} color={look.color} face={f} size={30} animated={false} decorative />
                    <span className="sr-only">{FACE_LABEL[f]}</span>
                  </Radio>
                ))}
              </Picker>
              <Picker label="Colour" value={look.color} onChange={(v) => setLook({ color: v as BlobColor })}>
                {(Object.keys(BLOB_COLORS) as BlobColor[]).map((c) => (
                  <Radio
                    key={c}
                    value={c}
                    className={({ isSelected, isFocusVisible }) =>
                      cx(
                        'grid size-9 cursor-pointer place-items-center rounded-full outline-none',
                        isSelected && 'ring-2 ring-text-primary',
                        isFocusVisible && 'ring-2 ring-border-focus-ring',
                      )
                    }
                  >
                    <svg viewBox="0 0 20 20" aria-hidden className="size-7">
                      <circle cx="10" cy="10" r="10" fill={BLOB_COLORS[c].edge} />
                      <circle cx="9.4" cy="9.2" r="8.6" fill={BLOB_COLORS[c].fill} />
                    </svg>
                    <span className="sr-only">{BLOB_COLORS[c].label}</span>
                  </Radio>
                ))}
              </Picker>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
