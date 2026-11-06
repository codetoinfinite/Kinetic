'use client';

import { Focusable } from 'react-aria-components';
import { RiArchiveLine, RiDeleteBinLine, RiDownloadLine, RiPencilLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { Tooltip, TooltipTrigger } from '@/registry/ui/tooltip';

/* One trigger per side, so each caret variant can be seen pointing back at
   its button, then a toolbar of icon buttons where the tooltip is the
   label a sighted mouse user would otherwise miss. Hover or tab to a
   button; Escape closes. Button is a plain <button>, so each one sits in
   React Aria's Focusable to receive the trigger's hover and focus wiring. */

const SIDES = [
  { placement: 'top', label: 'Top' },
  { placement: 'bottom', label: 'Bottom' },
  { placement: 'left', label: 'Left' },
  { placement: 'right', label: 'Right' },
] as const;

const TOOLS = [
  { icon: RiPencilLine, label: 'Rename' },
  { icon: RiDownloadLine, label: 'Download' },
  { icon: RiArchiveLine, label: 'Archive' },
  { icon: RiDeleteBinLine, label: 'Delete' },
] as const;

export default function Demo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SIDES.map((side) => (
          <TooltipTrigger key={side.placement}>
            <Focusable>
              <Button variant="secondary" size="small" className="w-24">
                {side.label}
              </Button>
            </Focusable>
            <Tooltip placement={side.placement}>Opens {side.label.toLowerCase()}</Tooltip>
          </TooltipTrigger>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-xs">
        {TOOLS.map((tool) => (
          <TooltipTrigger key={tool.label} delay={300}>
            <Focusable>
              <Button variant="ghost" size="small" iconOnly leadingIcon={tool.icon} aria-label={tool.label} />
            </Focusable>
            <Tooltip size="md">{tool.label}</Tooltip>
          </TooltipTrigger>
        ))}
      </div>
    </div>
  );
}
