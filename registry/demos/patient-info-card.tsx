'use client';

import { PatientInfoCard } from '@/registry/ui/patient-info-card';

/* The card at the width of the medical dashboard's profile column: initials
   avatar with its add-photo button, the patient's name and the four detail
   rows. The content is the component's own sample record. */
export default function Demo() {
  return (
    <div className="w-full max-w-[320px]">
      <PatientInfoCard />
    </div>
  );
}
