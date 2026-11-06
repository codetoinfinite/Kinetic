'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Questionnaire" (boardui.com/components/questionnaire).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiArrowGoBackLine, RiRestartLine } from '@remixicon/react';
import { Questionnaire } from '@/registry/ui/questionnaire';
import type { QuestionnaireAnswers, QuestionnaireQuestion } from '@/registry/ui/questionnaire';
import { Button } from '@/registry/ui/button';

/* The questions an agent asks before it plans a change to the chat harness.
   Steps 1 and 3 are checkbox questions; 2 and 4 are single select, so a click
   or its number key moves on by itself. Done shows what the agent will plan
   with; Edit answers goes back with every pick intact. */

const QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: 'controls',
    question: 'Which harness controls should stay in the top bar?',
    options: [
      { value: 'upsell', label: 'Show up sell toggle', description: 'Forces the upsell card up without spending the 4-turn allowance first.' },
      { value: 'wallpaper', label: 'Wallpaper picker', description: 'The chat wallpaper choices.' },
      { value: 'levelup', label: 'Play level-up', description: 'Replays the free and premium animations' },
    ],
    other: true,
  },
  {
    id: 'permission',
    select: 'single',
    question: 'How should the permission pill behave while an agent is running?',
    options: [
      { value: 'lock', label: 'Lock it', description: 'Changes wait until the run finishes.' },
      { value: 'queue', label: 'Queue the change', description: 'Applies from the next turn.' },
      { value: 'apply', label: 'Apply immediately', description: 'Interrupts the current tool call.' },
    ],
    other: { placeholder: 'Describe the behaviour' },
  },
  {
    id: 'alerts',
    question: 'Which events should ping you during a run?',
    options: [
      { value: 'finished', label: 'Run finished', description: 'When the agent stops, whether it succeeded or not.' },
      { value: 'approval', label: 'Needs approval', description: 'A tool call is waiting on you.' },
      { value: 'budget', label: 'Budget at 80%', description: 'Most of the token allowance is spent.' },
    ],
    other: true,
  },
  {
    id: 'summary',
    select: 'single',
    question: 'Where should the end-of-run summary go?',
    options: [
      { value: 'thread', label: 'In the thread', description: "Posted as the agent's last reply." },
      { value: 'pinned', label: 'Pinned note', description: 'Kept above the thread for everyone.' },
      { value: 'none', label: 'Nowhere', description: 'Skip the summary for this run.' },
    ],
  },
];

function describe(q: QuestionnaireQuestion, answers: QuestionnaireAnswers) {
  const a = answers[q.id];
  const picked = q.options.filter((o) => a?.values.includes(o.value)).map((o) => o.label);
  if (a?.other?.trim()) picked.push(`“${a.other.trim()}”`);
  return picked.length ? picked.join(', ') : 'Skipped';
}

export default function Demo() {
  const [run, setRun] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'asking' | 'done' | 'dismissed'>('asking');

  const restart = () => {
    setAnswers({});
    setStep(0);
    setPhase('asking');
    setRun((r) => r + 1);
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div data-demo className="w-full max-w-[640px]">
        {phase === 'asking' ? (
          <Questionnaire
            key={run}
            questions={QUESTIONS}
            answers={answers}
            onAnswersChange={setAnswers}
            step={step}
            onStepChange={setStep}
            onComplete={() => setPhase('done')}
            onDismiss={() => setPhase('dismissed')}
          />
        ) : (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-2xl bg-background-primary-default p-4 shadow-sm ring-1 ring-border-button-default"
          >
            {phase === 'done' ? (
              <>
                <p className="text-body-medium text-text-primary">Got it. Planning with these answers:</p>
                <dl className="flex flex-col gap-2">
                  {QUESTIONS.map((q) => (
                    <div key={q.id} className="flex flex-col">
                      <dt className="text-body-2-regular text-text-tertiary">{q.question}</dt>
                      <dd className="text-body-regular text-text-primary">{describe(q, answers)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-body-regular text-text-secondary">Questions dismissed. The agent will plan with its defaults.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {phase === 'done' ? (
                <Button variant="secondary" size="small" leadingIcon={RiArrowGoBackLine} onClick={() => setPhase('asking')}>
                  Edit answers
                </Button>
              ) : null}
              <Button variant="secondary" size="small" leadingIcon={RiRestartLine} onClick={restart}>
                Start over
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
