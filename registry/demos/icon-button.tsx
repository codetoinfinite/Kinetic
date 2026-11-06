'use client';

import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiMoreLine,
  RiNotification3Line,
  RiPencilLine,
  RiSearchLine,
  RiSettings3Line,
} from '@remixicon/react';

import { IconButton, IconLinkButton } from '@/registry/ui/icon-button';

/* The BoardUI trio at medium, then the small tier as it appears in table
   rows, then the edge cases: paging arrows (which mirror in RTL), a link
   variant, and a disabled button. */
export default function Demo() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        <IconButton icon={RiAddLine} aria-label="Add" />
        <IconButton icon={RiSearchLine} aria-label="Search" />
        <IconButton icon={RiNotification3Line} aria-label="Notifications" />
        <IconButton icon={RiSettings3Line} aria-label="Settings" />
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton size="small" icon={RiPencilLine} aria-label="Edit row" />
        <IconButton size="small" icon={RiDeleteBinLine} aria-label="Delete row" />
        <IconButton size="small" icon={RiMoreLine} aria-label="More actions" />
      </div>

      <div className="flex items-center gap-2">
        <IconButton icon={RiArrowLeftSLine} aria-label="Previous month" />
        <IconButton icon={RiArrowRightSLine} aria-label="Next month" />
        <IconLinkButton
          icon={RiExternalLinkLine}
          href="#"
          aria-label="Open in new tab"
          onClick={(event) => event.preventDefault()}
        />
        <IconButton icon={RiDeleteBinLine} aria-label="Delete (no permission)" disabled />
      </div>
    </div>
  );
}
