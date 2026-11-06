'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Appointments List Card" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */

import { useState } from "react";

import { AppointmentsListCard } from "@/registry/ui/appointments-list-card";
import type { Appointment } from "@/registry/ui/appointments-list-card";

/* Fixed July 2026 visits for one patient. */
const APPOINTMENTS: Appointment[] = [
  {
    id: "a1",
    date: "2026-07-07",
    time: "09:30",
    durationMinutes: 30,
    type: "Cardiology follow-up",
    doctor: "Dr. Amelia Hart",
    doctorColor: "pink",
    mode: "in-person",
    status: "confirmed",
  },
  {
    id: "a2",
    date: "2026-07-09",
    time: "11:00",
    durationMinutes: 20,
    type: "Blood panel review",
    doctor: "Dr. Kenji Mori",
    doctorColor: "blue",
    mode: "video",
    status: "pending",
  },
  {
    id: "a3",
    date: "2026-07-14",
    time: "15:15",
    durationMinutes: 45,
    type: "Physiotherapy session",
    doctor: "Dr. Lena Okafor",
    doctorColor: "lime",
    mode: "in-person",
    status: "confirmed",
  },
  {
    id: "a4",
    date: "2026-07-21",
    time: "08:45",
    durationMinutes: 15,
    type: "Medication check-in",
    doctor: "Dr. Samuel Reyes",
    mode: "phone",
    status: "pending",
  },
];

export default function Demo() {
  const [lastAction, setLastAction] = useState("No changes yet");
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-2">
      <AppointmentsListCard
        defaultAppointments={APPOINTMENTS}
        countLabel="in July"
        className="max-h-[500px]"
        onReschedule={(a, slot) => setLastAction(`Rescheduled ${a.type} to ${slot.date} ${slot.time}`)}
        onCancel={(a) => setLastAction(`Cancelled ${a.type}`)}
        onRestore={(a) => setLastAction(`Restored ${a.type}`)}
      />
      <p data-testid="last-action" className="px-2 text-caption-1-medium text-text-tertiary">
        {lastAction}
      </p>
    </div>
  );
}
