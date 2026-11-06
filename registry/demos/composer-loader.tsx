'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { RiArrowUpLine, RiStopFill } from '@remixicon/react';
import { AgentThinking } from '@/registry/ui/agent-thinking';
import { ComposerLoader } from '@/registry/ui/composer-loader';
import type { ComposerLoaderProps } from '@/registry/ui/composer-loader';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { Switch } from '@/registry/ui/switch';

/* A chat thread with BoardUI's 52px composer pill. Sending lights the rim
   and the thinking line appears; Stop (or the switch) turns it off and the
   light fades out. The segmented control swaps between the default band, a
   tapered band and a bloom-only wash. */
type Look = 'band' | 'tapered' | 'wash';

const LOOKS: { id: Look; name: string; props: Partial<ComposerLoaderProps> }[] = [
  { id: 'band', name: 'Band', props: {} },
  { id: 'tapered', name: 'Tapered', props: { taper: 0.6, arc: 150 } },
  { id: 'wash', name: 'Wash', props: { bloomOnly: true, bloom: 22, bloomStrength: 0.55 } },
];

const ANSWER =
  'Three tickets are blocked: BRD-214 is waiting on the export fix, BRD-198 needs design sign-off, and BRD-231 is stuck on API rate limits.';

export default function Demo() {
  const [working, setWorking] = useState(true);
  const [question, setQuestion] = useState('Summarise this week’s blocked tickets for the stand-up.');
  const [draft, setDraft] = useState('');
  const [look, setLook] = useState<Look>('band');
  const [reverse, setReverse] = useState(false);
  const [run, setRun] = useState(0);

  const lookProps = LOOKS.find((l) => l.id === look)?.props ?? {};

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setQuestion(text);
    setDraft('');
    setRun((n) => n + 1);
    setWorking(true);
  };

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-8">
      <section
        aria-labelledby="composer-title"
        className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-border-table bg-background-secondary-default"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-table bg-background-primary-default px-5 py-3.5">
          <div className="min-w-0">
            <h3 id="composer-title" className="text-headline-semibold text-text-primary">
              Boardly assistant
            </h3>
            <p className="text-caption-1-medium text-text-tertiary">Sprint 42 · Platform team</p>
          </div>
          <Switch size="sm" isSelected={working} onChange={setWorking}>
            Agent working
          </Switch>
        </header>

        <div className="flex min-h-[220px] flex-col gap-4 px-4 pt-5 sm:px-5">
          <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-background-primary-default px-3.5 py-2.5 text-body-regular text-text-primary shadow-xs">
            {question}
          </p>
          {working ? (
            <AgentThinking key={run} variant="wave" label="Reading 12 tickets" />
          ) : (
            <p className="max-w-[90%] text-body-regular text-text-primary">{ANSWER}</p>
          )}
        </div>

        <div className="px-4 pt-4 pb-3 sm:px-5">
          <ComposerLoader active={working} reverse={reverse} {...lookProps}>
            <form
              onSubmit={submit}
              className={
                working
                  ? 'flex h-[52px] w-full items-center gap-2.5 rounded-full bg-transparent p-2 ps-4'
                  : 'flex h-[52px] w-full items-center gap-2.5 rounded-full bg-background-primary-default p-2 ps-4 shadow-xs'
              }
            >
              <label className="sr-only" htmlFor="composer-loader-demo-input">
                Message
              </label>
              <input
                id="composer-loader-demo-input"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={working ? 'Reply when the agent is done' : 'Ask a follow-up'}
                autoComplete="off"
                className="h-5 min-w-0 flex-1 bg-transparent text-body-regular text-text-primary caret-text-primary outline-none placeholder:text-text-tertiary"
              />
              {working ? (
                <button
                  type="button"
                  onClick={() => setWorking(false)}
                  aria-label="Stop generating"
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background-secondary-default text-foreground-icon-secondary transition-colors hover:bg-background-secondary-hover"
                >
                  <RiStopFill className="size-5" aria-hidden />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={draft.trim().length === 0}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-button-primary text-text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RiArrowUpLine className="size-5" aria-hidden />
                </button>
              )}
            </form>
          </ComposerLoader>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 sm:px-5">
          <SegmentedControl
            aria-label="Light style"
            variant="plain"
            selectedKeys={[look]}
            onSelectionChange={(keys) => {
              const next = LOOKS.find((l) => keys.has(l.id));
              if (next) setLook(next.id);
            }}
          >
            {LOOKS.map((l) => (
              <SegmentedControlItem key={l.id} id={l.id}>
                {l.name}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <Switch size="sm" isSelected={reverse} onChange={setReverse}>
            Reverse
          </Switch>
        </div>
      </section>
    </div>
  );
}
