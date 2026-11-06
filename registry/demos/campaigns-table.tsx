'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Campaigns Table" (boardui.com/templates/marketing).
 * No BoardUI source was used.
 */

import { CampaignsTable } from '@/registry/ui/campaigns-table';
import type { Campaign } from '@/registry/ui/campaigns-table';

const CAMPAIGNS: Campaign[] = [
  { id: 'c01', name: 'Founder story video · Global', channel: 'meta', objective: 'Awareness', status: 'active', budget: 40_000, spent: 34_800, impressions: 1_920_000, clicks: 26_880, updated: '2026-10-22' },
  { id: 'c02', name: 'Holiday gift guide · Global', channel: 'google', objective: 'Traffic', status: 'paused', budget: 40_000, spent: 30_884, impressions: 812_000, clicks: 37_350, updated: '2026-09-16' },
  { id: 'c03', name: 'Founder story video · US', channel: 'tiktok', objective: 'Conversions', status: 'active', budget: 12_000, spent: 1_330, impressions: 96_400, clicks: 1_640, updated: '2026-10-30' },
  { id: 'c04', name: 'Newsletter promo · EU', channel: 'email', objective: 'Leads', status: 'paused', budget: 32_000, spent: 34_445, impressions: 210_500, clicks: 11_790, updated: '2026-10-08' },
  { id: 'c05', name: 'Spring launch · UK', channel: 'linkedin', objective: 'Awareness', status: 'draft', budget: 18_000, spent: 0, impressions: 0, clicks: 0, updated: '2026-10-04' },
  { id: 'c06', name: 'Brand search · US', channel: 'google', objective: 'Leads', status: 'active', budget: 24_000, spent: 19_116, impressions: 402_300, clicks: 30_170, updated: '2026-10-27' },
  { id: 'c07', name: 'Cart retargeting · UK', channel: 'meta', objective: 'Retargeting', status: 'draft', budget: 8_000, spent: 0, impressions: 0, clicks: 0, updated: '2026-08-21' },
  { id: 'c08', name: 'Newsletter promo · US', channel: 'meta', objective: 'Awareness', status: 'active', budget: 30_000, spent: 28_095, impressions: 1_350_000, clicks: 17_550, updated: '2026-10-24' },
  { id: 'c09', name: 'Webinar signups · UK', channel: 'x', objective: 'Leads', status: 'active', budget: 30_000, spent: 25_305, impressions: 688_000, clicks: 6_190, updated: '2026-10-11' },
  { id: 'c10', name: 'Case study promo · UK', channel: 'linkedin', objective: 'Retargeting', status: 'active', budget: 6_000, spent: 333, impressions: 14_800, clicks: 129, updated: '2026-10-01' },
  { id: 'c11', name: 'Product Hunt day · Global', channel: 'x', objective: 'Traffic', status: 'paused', budget: 5_000, spent: 4_870, impressions: 241_000, clicks: 3_860, updated: '2026-09-02' },
  { id: 'c12', name: 'Free trial push · US', channel: 'google', objective: 'Conversions', status: 'active', budget: 50_000, spent: 41_220, impressions: 1_105_000, clicks: 61_880, updated: '2026-10-29' },
  { id: 'c13', name: 'Creator collab · EU', channel: 'tiktok', objective: 'Awareness', status: 'paused', budget: 15_000, spent: 9_410, impressions: 2_480_000, clicks: 19_840, updated: '2026-09-25' },
  { id: 'c14', name: 'Win-back series · Global', channel: 'email', objective: 'Retargeting', status: 'active', budget: 4_000, spent: 1_960, impressions: 88_200, clicks: 5_290, updated: '2026-10-18' },
  { id: 'c15', name: 'Hiring brand · US', channel: 'linkedin', objective: 'Awareness', status: 'draft', budget: 10_000, spent: 0, impressions: 0, clicks: 0, updated: '2026-10-14' },
  { id: 'c16', name: 'Partner launch · APAC', channel: 'meta', objective: 'Conversions', status: 'active', budget: 22_000, spent: 12_650, impressions: 730_000, clicks: 10_220, updated: '2026-10-06' },
];

/* Sort any column (CTR keeps campaigns without impressions at the bottom),
   filter by delivery status or channel, and page through the results. */
export default function Demo() {
  return (
    <div className="flex w-full justify-center">
      <CampaignsTable className="max-w-[1100px]" campaigns={CAMPAIGNS} pageSize={5} />
    </div>
  );
}
