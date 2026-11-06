'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Task List" (boardui.com/components/task-list).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  RiAddLine,
  RiCss3Line,
  RiEdit2Line,
  RiListCheck3,
  RiReactjsLine,
  RiRestartLine,
  RiSearchLine,
  RiTerminalBoxLine,
} from '@remixicon/react';
import { TaskList } from '@/registry/ui/task-list';
import type { TaskItem } from '@/registry/ui/task-list';
import { Button } from '@/registry/ui/button';
import { Input } from '@/registry/ui/input';

/* One agent turn: the user asks for a dark mode toggle, the log streams the
   three tasks the agent ran (each folds once its steps land), and the reply
   appears on onComplete. Add task queues a follow-up onto the same run;
   Replay remounts the log for a fresh run. Click any header to reopen it. */

const react = <RiReactjsLine className="text-status-cyan-text" />;
const css = <RiCss3Line className="text-status-blue-text" />;

const INITIAL: TaskItem[] = [
  {
    id: 'search',
    icon: RiSearchLine,
    title: 'Searching project files',
    doneTitle: 'Found project files',
    steps: [
      { label: 'Searching "app/page.tsx, components structure"' },
      { label: 'Read', chips: [{ label: 'page.tsx', icon: react }] },
      { label: 'Scanning 52 files' },
      { label: 'Reading files', chips: [{ label: 'layout.tsx', icon: react }] },
    ],
  },
  {
    id: 'edit',
    icon: RiEdit2Line,
    title: 'Adding the theme toggle',
    doneTitle: 'Added the theme toggle',
    steps: [
      { label: 'Created', chips: [{ label: 'theme-toggle.tsx', icon: react }] },
      { label: 'Added dark tokens to', chips: [{ label: 'globals.css', icon: css }] },
      { label: 'Mounted it in', chips: [{ label: 'dashboard-header.tsx', icon: react }] },
    ],
  },
  {
    id: 'checks',
    icon: RiTerminalBoxLine,
    title: 'Running checks',
    doneTitle: 'Checks passed',
    steps: [{ label: 'pnpm lint: 0 problems' }, { label: 'pnpm build: compiled in 8.2s' }],
  },
];

function followUp(text: string, n: number): TaskItem {
  return {
    id: `queued-${n}`,
    icon: RiListCheck3,
    title: text,
    doneTitle: `Done: ${text}`,
    steps: [{ label: 'Planning the change' }, { label: 'Edited 2 files' }, { label: 'Checks passed' }],
  };
}

export default function Demo() {
  const [run, setRun] = useState(0);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL);
  const [draft, setDraft] = useState('Persist the theme choice');
  const [answered, setAnswered] = useState(false);

  const addTask = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setTasks((prev) => [...prev, followUp(text, prev.length)]);
    setAnswered(false);
    setDraft('');
  };

  const replay = () => {
    setTasks(INITIAL);
    setAnswered(false);
    setRun((r) => r + 1);
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div data-demo className="flex w-full max-w-[440px] flex-col gap-4">
        <p className="ms-auto max-w-[85%] rounded-2xl bg-background-secondary-default px-3.5 py-2 text-body-regular text-text-primary">
          Add a dark mode toggle to the dashboard
        </p>

        <TaskList
          key={run}
          tasks={tasks}
          startDelay={320}
          stepInterval={700}
          collapseOnComplete
          onComplete={() => setAnswered(true)}
        />

        <p role="status" className={answered ? 'text-body-regular text-text-primary' : 'sr-only'}>
          {answered
            ? 'Done. The dashboard header now has a light and dark toggle, both token sets are in globals.css, and lint and build are clean.'
            : ''}
        </p>

        <form onSubmit={addTask} className="flex items-end gap-2 border-t border-border-button-default pt-3">
          <Input
            aria-label="Follow-up task"
            placeholder="Queue a follow-up task"
            value={draft}
            onChange={setDraft}
            size="small"
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="secondary" size="small" leadingIcon={RiAddLine} disabled={!draft.trim()}>
            Add task
          </Button>
          <Button type="button" variant="secondary" size="small" iconOnly leadingIcon={RiRestartLine} aria-label="Replay run" onClick={replay} />
        </form>
      </div>
    </div>
  );
}
