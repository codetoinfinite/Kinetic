'use client';

import { useState } from 'react';
import type { Key, Selection } from 'react-aria-components';
import { RiBookOpenLine, RiBugLine, RiFlashlightLine, RiRefreshLine, RiSparklingLine } from '@remixicon/react';
import { Button } from '@/registry/ui/button';
import type { ChipColor } from '@/registry/ui/chip';
import { Tag, TagGroup } from '@/registry/ui/tag-group';

/* BoardUI's tile: a topic filter with two picked, and coloured ticket labels
   with a removable one. Here the labels and recipients really remove, and
   the labels fall back to their empty state once the last one goes. */
const TOPICS = [
  { id: 'design', name: 'Design' },
  { id: 'engineering', name: 'Engineering' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'sales', name: 'Sales' },
  { id: 'support', name: 'Support' },
  { id: 'research', name: 'Research' },
];

type LabelItem = { id: string; name: string; color: ChipColor; icon: typeof RiBugLine };

const LABELS: LabelItem[] = [
  { id: 'bug', name: 'Bug', color: 'rose', icon: RiBugLine },
  { id: 'feature', name: 'Feature', color: 'lime', icon: RiSparklingLine },
  { id: 'performance', name: 'Performance', color: 'yellow', icon: RiFlashlightLine },
  { id: 'docs', name: 'Docs', color: 'blue', icon: RiBookOpenLine },
];

const RECIPIENTS = [
  { id: 'olivia', name: 'olivia@boardly.co' },
  { id: 'phoenix', name: 'phoenix@boardly.co' },
  { id: 'lana', name: 'lana@boardly.co' },
];

function without<T extends { id: string }>(list: T[], keys: Set<Key>) {
  return list.filter((item) => !keys.has(item.id));
}

export default function Demo() {
  const [topics, setTopics] = useState<Selection>(new Set(['design', 'engineering']));
  const [labels, setLabels] = useState(LABELS);
  const [recipients, setRecipients] = useState(RECIPIENTS);

  const picked = topics === 'all' ? TOPICS.length : topics.size;
  const changed = labels.length !== LABELS.length || recipients.length !== RECIPIENTS.length;

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-[860px] grid-cols-1 gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-2xl border border-border-table bg-background-primary-default p-5">
          <h3 className="text-headline-semibold text-text-primary">Filter boards</h3>
          <TagGroup
            label="Topics"
            hint={`${picked} of ${TOPICS.length} topics selected`}
            selectionMode="multiple"
            selectedKeys={topics}
            onSelectionChange={setTopics}
            items={TOPICS}
          >
            {(topic) => <Tag id={topic.id}>{topic.name}</Tag>}
          </TagGroup>
        </section>

        <section className="flex flex-col gap-5 rounded-2xl border border-border-table bg-background-primary-default p-5">
          <h3 className="text-headline-semibold text-text-primary">BRD-214 · Export fails on large boards</h3>
          <TagGroup
            label="Labels"
            items={labels}
            onRemove={(keys) => setLabels((prev) => without(prev, keys))}
            emptyState="No labels yet"
          >
            {(item) => (
              <Tag id={item.id} color={item.color} icon={item.icon} textValue={item.name}>
                {item.name}
              </Tag>
            )}
          </TagGroup>
          <TagGroup
            label="Notify"
            size="small"
            items={recipients}
            onRemove={(keys) => setRecipients((prev) => without(prev, keys))}
            emptyState="Nobody will be notified"
          >
            {(person) => <Tag id={person.id}>{person.name}</Tag>}
          </TagGroup>
          <div>
            <Button
              variant="ghost"
              size="xs"
              leadingIcon={RiRefreshLine}
              disabled={!changed}
              onClick={() => {
                setLabels(LABELS);
                setRecipients(RECIPIENTS);
              }}
            >
              Reset tags
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
