'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Patients Table" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */

import { useState } from "react";
import { PatientsTable, type Patient, type PatientAction } from "@/registry/ui/patients-table";

const PATIENTS: Patient[] = [
  { id: "p01", name: "John Clarkson", age: 34, avatarColor: "blue", admission: "outpatient", status: "recovering", conditions: ["Pregnancy", "Post-op"], lastVisit: "2026-03-02", nextAppointment: "2026-05-14" },
  { id: "p02", name: "Aspen Lubin", age: 52, avatarColor: "pink", admission: "inpatient", status: "treatment", conditions: ["Hypertension"], lastVisit: "2026-09-21", nextAppointment: "2026-10-15" },
  { id: "p03", name: "Michael Ekstrom", age: 41, avatarColor: "lime", admission: "inpatient", status: "observation", conditions: ["Asthma", "Migraine"], lastVisit: "2026-01-18", nextAppointment: "2026-03-25" },
  { id: "p04", name: "Kianna Vaccaro", age: 29, admission: "inpatient", status: "stable", conditions: ["Post-op"], lastVisit: "2026-08-30", nextAppointment: "2026-10-03" },
  { id: "p05", name: "Livia Saris", age: 67, avatarColor: "pink", admission: "emergency", status: "critical", conditions: ["Migraine", "Post-op"], lastVisit: "2026-11-02", nextAppointment: "2026-12-24" },
  { id: "p06", name: "Jaydon Aminoff", age: 45, avatarColor: "blue", admission: "outpatient", status: "stable", conditions: ["Diabetes"], lastVisit: "2026-01-09", nextAppointment: "2026-02-22" },
  { id: "p07", name: "Maria Lubin", age: 38, avatarColor: "lime", admission: "inpatient", status: "critical", conditions: ["Pregnancy"], lastVisit: "2026-03-28", nextAppointment: "2026-04-10" },
  { id: "p08", name: "Ann Press", age: 73, admission: "discharged", status: "stable", conditions: ["Hypertension"], lastVisit: "2026-07-15", nextAppointment: "2026-08-10" },
  { id: "p09", name: "Terry Vaccaro", age: 31, avatarColor: "blue", admission: "discharged", status: "recovering", conditions: ["Allergy", "Pregnancy"], lastVisit: "2026-10-27", nextAppointment: "2026-12-04" },
  { id: "p10", name: "Corey Herwitz", age: 58, avatarColor: "pink", admission: "outpatient", status: "treatment", conditions: ["Diabetes", "Asthma"], lastVisit: "2026-06-11", nextAppointment: "2026-07-01" },
  { id: "p11", name: "Hanna Dorwart", age: 24, avatarColor: "lime", admission: "outpatient", status: "stable", conditions: ["Allergy"], lastVisit: "2026-02-14", nextAppointment: "2026-06-19" },
  { id: "p12", name: "Ruben Geidt", age: 49, admission: "inpatient", status: "observation", conditions: ["Asthma"], lastVisit: "2026-09-03", nextAppointment: "2026-09-29" },
  { id: "p13", name: "Alena Calzoni", age: 36, avatarColor: "pink", admission: "emergency", status: "critical", conditions: ["Post-op"], lastVisit: "2026-10-30" },
  { id: "p14", name: "Desirae Rosser", age: 62, avatarColor: "blue", admission: "discharged", status: "recovering", conditions: ["Diabetes", "Post-op"], lastVisit: "2026-05-06", nextAppointment: "2026-11-18" },
  { id: "p15", name: "Wilson Mango", age: 27, avatarColor: "lime", admission: "outpatient", status: "stable", conditions: ["Migraine"], lastVisit: "2026-04-22", nextAppointment: "2026-07-09" },
  { id: "p16", name: "Kaylynn Bergson", age: 55, admission: "inpatient", status: "treatment", conditions: ["Asthma", "Allergy"], lastVisit: "2026-08-08", nextAppointment: "2026-08-28" },
  { id: "p17", name: "Phillip Torff", age: 81, avatarColor: "pink", admission: "inpatient", status: "observation", conditions: ["Hypertension"], lastVisit: "2026-10-12", nextAppointment: "2026-11-11" },
  { id: "p18", name: "Ahmad Septimus", age: 43, avatarColor: "blue", admission: "outpatient", status: "recovering", conditions: ["Post-op"], lastVisit: "2026-07-27", nextAppointment: "2026-09-08" },
  { id: "p19", name: "Gretchen Schleifer", age: 33, avatarColor: "lime", admission: "discharged", status: "stable", conditions: ["Pregnancy"], lastVisit: "2026-06-30", nextAppointment: "2026-10-21" },
  { id: "p20", name: "Craig Franci", age: 69, admission: "emergency", status: "critical", conditions: ["Diabetes", "Allergy"], lastVisit: "2026-11-01", nextAppointment: "2026-11-09" },
  { id: "p21", name: "Lydia Workman", age: 22, avatarColor: "pink", admission: "outpatient", status: "stable", conditions: ["Allergy"], lastVisit: "2026-03-16", nextAppointment: "2026-05-30" },
  { id: "p22", name: "Mira Botosh", age: 47, avatarColor: "blue", admission: "inpatient", status: "treatment", conditions: ["Migraine", "Asthma"], lastVisit: "2026-09-25", nextAppointment: "2026-10-09" },
  { id: "p23", name: "Cheyenne Siphron", age: 39, avatarColor: "lime", admission: "outpatient", status: "recovering", conditions: ["Post-op"], lastVisit: "2026-02-03", nextAppointment: "2026-04-17" },
  { id: "p24", name: "Roger Rhiel Madsen", age: 76, admission: "discharged", status: "stable", conditions: ["Hypertension"], lastVisit: "2026-05-20", nextAppointment: "2026-12-01" },
];

const ACTION_LABEL: Record<PatientAction, string> = {
  view: "Opened chart for",
  edit: "Editing",
  book: "Booking an appointment for",
  message: "Messaging",
  archive: "Archived",
};

export default function Demo() {
  const [lastAction, setLastAction] = useState("Select rows, sort, filter or use a row action.");

  return (
    <div className="flex w-full max-w-[1100px] min-w-0 flex-col gap-3">
      <PatientsTable
        patients={PATIENTS}
        pageSize={5}
        defaultSelectedKeys={["p02", "p03"]}
        onAction={(action, patient) => setLastAction(`${ACTION_LABEL[action]} ${patient.name}`)}
        onAdmissionChange={(id, admission) => {
          const name = PATIENTS.find((p) => p.id === id)?.name ?? id;
          setLastAction(`${name} moved to ${admission}`);
        }}
      />
      <p className="px-1 text-body-2-medium text-text-tertiary" aria-live="polite" data-testid="last-action">
        {lastAction}
      </p>
    </div>
  );
}
