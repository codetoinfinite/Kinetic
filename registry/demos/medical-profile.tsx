'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Medical Profile" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */

import { MedicalProfile } from '@/registry/ui/medical-profile';

/* The whole patient dashboard as one page: pick a day in Most active days and
   the rings follow it, step the week on Steps or Sleep, filter and page the
   patients table, hide cards from Filters, file a report (it lands in the
   bell), or switch the sidebar to another workspace and come back. */
export default function Demo() {
  return <MedicalProfile />;
}
