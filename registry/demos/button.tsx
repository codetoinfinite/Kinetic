'use client';

import { RiAddLine, RiArrowRightLine, RiDeleteBinLine, RiDownloadLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';

/* The variant matrix as a reader meets it: the four variants at full size,
   then the three size tiers side by side (labelled and icon-only), then the
   disabled state, so every row can be compared at a glance. */
export default function Demo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button leadingIcon={RiAddLine}>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" leadingIcon={RiDeleteBinLine}>
          Delete
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" size="medium" trailingIcon={RiArrowRightLine}>
          Medium
        </Button>
        <Button variant="secondary" size="small" trailingIcon={RiArrowRightLine}>
          Small
        </Button>
        <Button variant="secondary" size="xs">
          Xs
        </Button>
        <Button variant="secondary" size="medium" iconOnly leadingIcon={RiDownloadLine} aria-label="Download" />
        <Button variant="secondary" size="small" iconOnly leadingIcon={RiDownloadLine} aria-label="Download" />
        <Button variant="secondary" size="xs" iconOnly leadingIcon={RiDownloadLine} aria-label="Download" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button disabled>Disabled</Button>
        <Button variant="secondary" aria-disabled="true">
          Aria-disabled
        </Button>
      </div>
    </div>
  );
}
