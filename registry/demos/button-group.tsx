'use client';

import { useState } from 'react';
import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiBold,
  RiDownloadLine,
  RiFileCopyLine,
  RiItalic,
  RiShareLine,
  RiUnderline,
} from '@remixicon/react';

import { ButtonGroup, ButtonGroupItem } from '@/registry/ui/button-group';

const RANGES = ['Day', 'Week', 'Month'] as const;

const ALIGNMENTS = [
  { id: 'left', label: 'Align left', icon: RiAlignLeft },
  { id: 'center', label: 'Align center', icon: RiAlignCenter },
  { id: 'right', label: 'Align right', icon: RiAlignRight },
] as const;

const MARKS = [
  { id: 'bold', label: 'Bold', icon: RiBold },
  { id: 'italic', label: 'Italic', icon: RiItalic },
  { id: 'underline', label: 'Underline', icon: RiUnderline },
] as const;

type Alignment = (typeof ALIGNMENTS)[number]['id'];
type Mark = (typeof MARKS)[number]['id'];

/* Three ways the same strip is used: a single-select range picker, a small
   formatting toolbar (multi-select marks beside single-select alignment),
   and a plain action row where nothing stays pressed. */
export default function Demo() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('Week');
  const [align, setAlign] = useState<Alignment>('left');
  const [marks, setMarks] = useState<ReadonlySet<Mark>>(() => new Set<Mark>(['bold']));

  const toggleMark = (id: Mark) =>
    setMarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col items-center gap-5">
      <ButtonGroup aria-label="Range">
        {RANGES.map((r) => (
          <ButtonGroupItem key={r} selected={range === r} onClick={() => setRange(r)}>
            {r}
          </ButtonGroupItem>
        ))}
      </ButtonGroup>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <ButtonGroup size="small" aria-label="Text style">
          {MARKS.map((m) => (
            <ButtonGroupItem
              key={m.id}
              size="small"
              iconOnly
              leadingIcon={m.icon}
              aria-label={m.label}
              selected={marks.has(m.id)}
              onClick={() => toggleMark(m.id)}
            />
          ))}
        </ButtonGroup>
        <ButtonGroup size="small" aria-label="Text alignment">
          {ALIGNMENTS.map((a) => (
            <ButtonGroupItem
              key={a.id}
              size="small"
              iconOnly
              leadingIcon={a.icon}
              aria-label={a.label}
              selected={align === a.id}
              onClick={() => setAlign(a.id)}
            />
          ))}
        </ButtonGroup>
      </div>

      <ButtonGroup aria-label="Report actions">
        <ButtonGroupItem leadingIcon={RiFileCopyLine}>Copy</ButtonGroupItem>
        <ButtonGroupItem leadingIcon={RiDownloadLine}>Export</ButtonGroupItem>
        <ButtonGroupItem leadingIcon={RiShareLine}>Share</ButtonGroupItem>
      </ButtonGroup>
    </div>
  );
}
