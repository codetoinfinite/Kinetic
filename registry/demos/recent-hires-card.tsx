'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Recent Hires Card" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */

import { parseDate } from '@internationalized/date';
import { RecentHiresCard } from '@/registry/ui/recent-hires-card';
import type { Hire } from '@/registry/ui/recent-hires-card';

const TODAY = parseDate('2026-11-05');

const HIRES: Hire[] = [
  { id: 'h1', name: 'Maya Okafor', role: 'Product Designer', startDate: parseDate('2026-11-05'), status: 'onboarding', team: 'design' },
  { id: 'h2', name: 'Lucas Brandt', role: 'Frontend Engineer', startDate: parseDate('2026-11-04'), status: 'onboarding', team: 'engineering' },
  { id: 'h3', name: 'Priya Raman', role: 'Data Analyst', startDate: parseDate('2026-11-02'), status: 'active', team: 'research' },
  { id: 'h4', name: 'Tomás Vidal', role: 'Backend Engineer', startDate: parseDate('2026-10-29'), status: 'active', team: 'engineering' },
  { id: 'h5', name: 'Hana Sato', role: 'UX Researcher', startDate: parseDate('2026-11-12'), status: 'pending', team: 'research' },
  { id: 'h6', name: 'Elijah Moore', role: 'Brand Designer', startDate: parseDate('2026-10-27'), status: 'active', team: 'design' },
  { id: 'h7', name: 'Ines Duarte', role: 'Platform Engineer', startDate: parseDate('2026-10-20'), status: 'active', team: 'engineering' },
  { id: 'h8', name: 'Noah Fischer', role: 'Design Systems Lead', startDate: parseDate('2026-10-14'), status: 'active', team: 'design' },
  { id: 'h9', name: 'Amara Lewis', role: 'QA Engineer', startDate: parseDate('2026-11-06'), status: 'pending', team: 'engineering' },
  { id: 'h10', name: 'Kenji Mori', role: 'Research Ops', startDate: parseDate('2026-10-08'), status: 'active', team: 'research' },
  { id: 'h11', name: 'Sofia Rossi', role: 'Motion Designer', startDate: parseDate('2026-09-30'), status: 'active', team: 'design' },
  { id: 'h12', name: 'Ravi Patel', role: 'Mobile Engineer', startDate: parseDate('2026-09-22'), status: 'active', team: 'engineering' },
];

const TEAMS = [
  { value: null, label: 'All teams' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'design', label: 'Design' },
  { value: 'research', label: 'Research' },
];

/* Uncontrolled: the card owns team + page state. Switch teams from the
   header menu (the headline count follows), page with Previous / Next. */
export default function Demo() {
  return (
    <div className="flex w-full justify-center">
      <RecentHiresCard
        className="max-w-[620px]"
        hires={HIRES}
        today={TODAY}
        teams={TEAMS}
        viewAllHref="#recent-hires"
      />
    </div>
  );
}
