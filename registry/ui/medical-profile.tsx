/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Medical Profile" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState, type MouseEvent } from "react";
import type { CalendarDate } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import {
  RiAsterisk,
  RiCalendarCheckLine,
  RiFileList3Line,
  RiHeartPulseLine,
  RiMedicineBottleLine,
  RiTestTubeLine,
} from "@remixicon/react";

import { DASHBOARD_NAV, DashboardSidebar } from "@/registry/ui/dashboard-sidebar";
import { DashboardPageHeader } from "@/registry/ui/dashboard-page-header";
import { NotificationBellBadge, type BellNotification } from "@/registry/ui/notification-bell-badge";
import { StepsCard } from "@/registry/ui/steps-card";
import { SleepScoreCard } from "@/registry/ui/sleep-score-card";
import { MostActiveDaysCard, formatLongDate, sampleDayActivity } from "@/registry/ui/most-active-days-card";
import { ActivityRingsCard } from "@/registry/ui/activity-rings-card";
import { ImportantAlertsCard } from "@/registry/ui/important-alerts-card";
import { PatientsTable, type Patient, type PatientAction } from "@/registry/ui/patients-table";
import { Toaster, toast } from "@/registry/ui/toast";
import { cx } from "@/registry/lib/cx";
import {
  FileReportDialog,
  PatientProfileCard,
  REPORT_KINDS,
  SectionFilter,
  WorkspacePlaceholder,
  type DashboardSection,
  type FiledReport,
} from "@/registry/ui/medical-profile-parts";

/* -------------------------------------------------------------------- data */

export const MEDICAL_PATIENTS: Patient[] = [
  { id: "p1", name: "John Clarkson", avatarColor: "blue", admission: "outpatient", status: "recovering", conditions: ["Pregnancy", "Post-op"], nextAppointment: "2026-05-14" },
  { id: "p2", name: "Aspen Lubin", avatarColor: "lime", admission: "inpatient", status: "treatment", conditions: ["Hypertension"], nextAppointment: "2026-10-15" },
  { id: "p3", name: "Michael Ekstrom", avatarColor: "pink", admission: "inpatient", status: "observation", conditions: ["Asthma", "Migraine"], nextAppointment: "2026-03-25" },
  { id: "p4", name: "Kianna Vaccaro", avatarColor: "neutral", admission: "inpatient", status: "stable", conditions: ["Post-op"], nextAppointment: "2026-10-03" },
  { id: "p5", name: "Livia Saris", avatarColor: "pink", admission: "emergency", status: "critical", conditions: ["Migraine", "Post-op"], nextAppointment: "2026-12-24" },
  { id: "p6", name: "Jaydon Aminoff", avatarColor: "lime", admission: "outpatient", status: "stable", conditions: ["Diabetes"], nextAppointment: "2026-02-22" },
  { id: "p7", name: "Maria Lubin", avatarColor: "blue", admission: "inpatient", status: "critical", conditions: ["Pregnancy"], nextAppointment: "2026-04-10" },
  { id: "p8", name: "Ann Press", avatarColor: "neutral", admission: "discharged", status: "stable", conditions: ["Hypertension"], nextAppointment: "2026-08-10" },
  { id: "p9", name: "Terry Vaccaro", avatarColor: "blue", admission: "discharged", status: "recovering", conditions: ["Allergy", "Pregnancy"], nextAppointment: "2026-12-04" },
  { id: "p10", name: "Ruben Rosser", avatarColor: "blue", admission: "outpatient", status: "treatment", conditions: ["Migraine", "Post-op"], nextAppointment: "2026-10-01" },
  { id: "p11", name: "Ruben Curtis", avatarColor: "neutral", admission: "discharged", status: "recovering", conditions: ["Allergy", "Fracture"], nextAppointment: "2026-08-21" },
  { id: "p12", name: "Wilson Vetrovs", avatarColor: "blue", admission: "discharged", status: "stable", conditions: ["Pregnancy", "Diabetes"], nextAppointment: "2026-08-17" },
];

export const MEDICAL_NOTIFICATIONS: BellNotification[] = [
  { id: "n1", title: "High heart rate", description: "Above 120 BPM for 10 minutes while inactive.", time: "8m ago", icon: RiHeartPulseLine, tone: "error" },
  { id: "n2", title: "Lab results ready", description: "Cholesterol and glucose are in the normal range.", time: "1h ago", icon: RiTestTubeLine, tone: "success" },
  { id: "n3", title: "Medication reminder", description: "You missed your 9:00 AM dose of Metoprolol.", time: "3h ago", icon: RiMedicineBottleLine, tone: "information" },
  { id: "n4", title: "Appointment confirmed", description: "Dr. Clarkson, Thursday at 10:30.", time: "Yesterday", icon: RiCalendarCheckLine },
  { id: "n5", title: "Medical ID updated", description: "Emergency contact and allergies were changed.", time: "2d ago", icon: RiAsterisk },
];

const SECTIONS: DashboardSection[] = [
  { id: "profile", label: "Patient details" },
  { id: "steps", label: "Steps" },
  { id: "sleep", label: "Sleep score" },
  { id: "days", label: "Most active days" },
  { id: "activity", label: "Activity rings" },
  { id: "alerts", label: "Important alerts" },
  { id: "patients", label: "Patients table" },
];

const ACTION_COPY: Record<Exclude<PatientAction, "archive">, (name: string) => string> = {
  view: (name) => `Opened ${name}'s chart`,
  edit: (name) => `Editing ${name}'s record`,
  book: (name) => `Appointment request sent to ${name}`,
  message: (name) => `Message thread with ${name} opened`,
};

/* --------------------------------------------------------------- component */

export interface MedicalProfileProps {
  /** Rows of the patients table. */
  patients?: Patient[];
  /** Bell contents; the unread count drives the badge. */
  defaultNotifications?: BellNotification[];
  /** Sidebar key of the view shown first. "medical" is the dashboard. */
  defaultView?: string;
  /** Last day with data; later days in the activity calendar are empty. */
  today?: CalendarDate;
  className?: string;
}

const HOME_VIEW = "medical";

export function MedicalProfile({
  patients: initialPatients = MEDICAL_PATIENTS,
  defaultNotifications = MEDICAL_NOTIFICATIONS,
  defaultView = HOME_VIEW,
  today = parseDate("2026-07-10"),
  className,
}: MedicalProfileProps) {
  const [view, setView] = useState(defaultView);
  const [visible, setVisible] = useState<Set<string>>(() => new Set(SECTIONS.map((s) => s.id)));
  const [notifications, setNotifications] = useState<BellNotification[]>(defaultNotifications);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [day, setDay] = useState<CalendarDate>(today);
  const activity = useMemo(() => sampleDayActivity(day), [day]);
  const navItem = DASHBOARD_NAV.find((item) => item.key === view);
  const show = (id: string) => visible.has(id);

  // #region critical
  // The sidebar's rows are `href="#"` links. One capture listener turns a
  // click on any of them into a view switch, so the host URL never changes.
  const onNavClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href="#"]');
    if (!link) return;
    event.preventDefault();
    const item = DASHBOARD_NAV.find((entry) => entry.label === link.getAttribute("aria-label"));
    if (item) setView(item.key);
  };

  const fileReport = (report: FiledReport) => {
    const kind = REPORT_KINDS.find((k) => k.id === report.kind)?.label ?? "Report";
    setNotifications((list) => [
      { id: `report-${list.length + 1}`, title: `${kind} filed`, description: report.details, time: "Just now", icon: RiFileList3Line, tone: "success" },
      ...list,
    ]);
    toast.success("Report filed", { description: `${kind} sent to Dr. Clarkson.` });
  };

  const onPatientAction = (action: PatientAction, patient: Patient) => {
    if (action !== "archive") {
      toast(ACTION_COPY[action](patient.name));
      return;
    }
    const index = patients.findIndex((p) => p.id === patient.id);
    setPatients((list) => list.filter((p) => p.id !== patient.id));
    toast(`${patient.name} archived`, {
      actions: [
        {
          label: "Undo",
          onClick: () =>
            setPatients((list) => {
              if (list.some((p) => p.id === patient.id)) return list;
              const next = [...list];
              next.splice(Math.max(index, 0), 0, patient);
              return next;
            }),
        },
      ],
    });
  };
  // #endregion

  const isHome = view === HOME_VIEW;
  const title = isHome ? "Medical Profile" : (navItem?.label ?? "Medical Profile");

  return (
    <div
      className={cx("relative flex h-full w-full gap-3 overflow-hidden bg-background-full p-3", className)}
      onClickCapture={onNavClickCapture}
    >
      <DashboardSidebar selected={view} showThemeToggle={false} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-1 pt-1.5 pb-3">
        <DashboardPageHeader
          title={title}
          breadcrumbs={[
            { label: "Acme team", initials: "A", tone: "blue", onPress: () => setView("home") },
            { label: "Jordan", initials: "J", onPress: () => setView("profile") },
            { label: title, icon: navItem?.icon ?? RiAsterisk },
          ]}
          notifications={
            <NotificationBellBadge notifications={notifications} onNotificationsChange={(next) => setNotifications([...next])} />
          }
          actions={
            isHome ? (
              <>
                <SectionFilter sections={SECTIONS} visible={visible} onVisibleChange={setVisible} />
                <FileReportDialog onSubmit={fileReport} />
              </>
            ) : null
          }
        />

        {isHome ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              {show("profile") ? <PatientProfileCard /> : null}
              {show("steps") ? <StepsCard chartHeight={196} /> : null}
              {show("sleep") ? <SleepScoreCard /> : null}
              {show("days") ? (
                <MostActiveDaysCard today={today} selected={day} onSelectedChange={setDay} height={232} />
              ) : null}
              {show("activity") ? (
                <ActivityRingsCard title={`Activity for ${formatLongDate(day)}`} rings={activity.rings} />
              ) : null}
              {show("alerts") ? (
                // Out of flow so its long list cannot stretch the row; it takes
                // the row height set by its neighbours and scrolls inside.
                <div className="relative min-h-[330px]">
                  <ImportantAlertsCard className="absolute inset-0 h-auto" />
                </div>
              ) : null}
            </div>
            {show("patients") ? (
              <PatientsTable patients={patients} pageSize={8} onAction={onPatientAction} aria-label="Patients" />
            ) : null}
            {visible.size === 0 ? (
              <p className="py-16 text-center text-body-regular text-text-secondary">
                Every card is hidden. Turn some back on from Filters.
              </p>
            ) : null}
          </>
        ) : (
          <WorkspacePlaceholder
            icon={navItem?.icon ?? RiAsterisk}
            label={navItem?.label ?? title}
            homeLabel="Medical Report"
            onBack={() => setView(HOME_VIEW)}
          />
        )}
      </main>
      <Toaster position="bottom-end" />
    </div>
  );
}
