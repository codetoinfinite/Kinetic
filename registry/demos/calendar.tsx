'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */

import { CalendarTemplate } from '@/registry/ui/calendar';

/* The whole calendar as one page: switch Day, Week and Month, step through
   time, press an event for its details (guests, meeting code, RSVP, join,
   delete), click an empty day or hour to add an event, accept invitations
   from the inbox, or switch the sidebar to another workspace and come back. */
export default function Demo() {
  return <CalendarTemplate />;
}
