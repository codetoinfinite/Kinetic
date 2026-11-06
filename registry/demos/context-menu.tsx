'use client';

import { useState } from 'react';
import type { Key, Selection } from 'react-aria-components';
import {
  RiDeleteBinLine,
  RiEyeLine,
  RiFileCopyLine,
  RiFilePdf2Line,
  RiFolderLine,
  RiFolderTransferLine,
  RiPencilLine,
} from '@remixicon/react';

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuSubmenu,
  ContextMenuTrigger,
} from '@/registry/ui/context-menu';

/* A file card as the target. Right-click it, long-press it on touch, or tab
   to it and press Shift+F10 (or the Menu key). The menu has shortcuts, a
   "Move to" submenu, a checkable "Sort by" section and a danger row; the
   last action is echoed under the card. The card highlights while open. */

const LABELS: Record<string, string> = {
  open: 'Opened',
  rename: 'Renamed',
  duplicate: 'Duplicated',
  'move-projects': 'Moved to Projects',
  'move-archive': 'Moved to Archive',
  'move-shared': 'Moved to Shared with me',
  delete: 'Deleted',
};

export default function Demo() {
  const [last, setLast] = useState('Right-click the file, or focus it and press Shift+F10.');
  const [sort, setSort] = useState<Selection>(new Set(['name']));

  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-3">
      <ContextMenuTrigger>
        {({ isOpen }) => (
          <>
            <div
              tabIndex={0}
              aria-label="Q3 report.pdf, 2.4 MB. Press Shift+F10 for actions."
              className={`flex w-full cursor-default items-center gap-3 rounded-2xl border bg-background-primary-default p-3 shadow-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-border-focus-ring ${
                isOpen ? 'border-border-button-hover bg-background-primary-hover' : 'border-border-button-default'
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-notification-error-background text-notification-error-foreground">
                <RiFilePdf2Line aria-hidden className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body-medium text-text-primary">Q3 report.pdf</span>
                <span className="text-body-2-regular text-text-tertiary">2.4 MB · Edited today</span>
              </span>
            </div>

            <ContextMenu aria-label="File actions" onAction={(key: Key) => setLast(LABELS[String(key)] ?? 'Done')}>
              <ContextMenuItem id="open" icon={RiEyeLine}>
                Open
              </ContextMenuItem>
              <ContextMenuItem id="rename" icon={RiPencilLine} shortcut="⌘R">
                Rename
              </ContextMenuItem>
              <ContextMenuItem id="duplicate" icon={RiFileCopyLine} shortcut="⌘D">
                Duplicate
              </ContextMenuItem>
              <ContextMenuSubmenu label="Move to" icon={RiFolderTransferLine}>
                <ContextMenuItem id="move-projects" icon={RiFolderLine}>
                  Projects
                </ContextMenuItem>
                <ContextMenuItem id="move-archive" icon={RiFolderLine}>
                  Archive
                </ContextMenuItem>
                <ContextMenuItem id="move-shared" icon={RiFolderLine}>
                  Shared with me
                </ContextMenuItem>
              </ContextMenuSubmenu>
              <ContextMenuSeparator />
              <ContextMenuSection
                title="Sort by"
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={sort}
                onSelectionChange={setSort}
              >
                <ContextMenuItem id="name">Name</ContextMenuItem>
                <ContextMenuItem id="modified">Date modified</ContextMenuItem>
                <ContextMenuItem id="size">Size</ContextMenuItem>
              </ContextMenuSection>
              <ContextMenuSeparator />
              <ContextMenuItem id="delete" icon={RiDeleteBinLine} variant="danger">
                Delete
              </ContextMenuItem>
            </ContextMenu>
          </>
        )}
      </ContextMenuTrigger>

      <p aria-live="polite" className="text-center text-body-2-regular text-text-tertiary">
        {last}
      </p>
    </div>
  );
}
