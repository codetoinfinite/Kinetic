'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Project Board" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */

import { ProjectBoard } from '@/registry/ui/project-board';

/* The whole board as one page: drag tickets between columns (or focus one and
   press Alt with an arrow), open a card for its side panel, create tickets,
   sort, filter, check the activity inbox, or switch the sidebar to another
   workspace and come back. */
export default function Demo() {
  return <ProjectBoard />;
}
