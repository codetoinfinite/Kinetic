'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Channel Tabs Bar List" (boardui.com/templates/marketing).
 * No BoardUI source was used.
 */

import {
  RiGlobalLine,
  RiGoogleFill,
  RiLinkedinBoxFill,
  RiMailLine,
  RiMetaFill,
  RiTiktokFill,
  RiTwitterXFill,
} from '@remixicon/react';
import { ChannelTabsBarList } from '@/registry/ui/channel-tabs-bar-list';
import type { BarListTab } from '@/registry/ui/channel-tabs-bar-list';

const TABS: BarListTab[] = [
  {
    id: 'channels',
    label: 'Channels',
    items: [
      { id: 'google', label: 'Google Ads', value: 18_954, icon: RiGoogleFill },
      { id: 'meta', label: 'Meta', value: 12_150, icon: RiMetaFill },
      { id: 'x', label: 'X Ads', value: 6_804, icon: RiTwitterXFill },
      { id: 'linkedin', label: 'LinkedIn', value: 3_888, icon: RiLinkedinBoxFill },
      { id: 'email', label: 'Email', value: 3_402, icon: RiMailLine },
      { id: 'tiktok', label: 'TikTok', value: 1_944, icon: RiTiktokFill },
      { id: 'referral', label: 'Referral', value: 1_458, icon: RiGlobalLine },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    items: [
      { id: 'c12', label: 'Free trial push · US', value: 9_820, icon: RiGoogleFill },
      { id: 'c06', label: 'Brand search · US', value: 7_410, icon: RiGoogleFill },
      { id: 'c01', label: 'Founder story video', value: 5_260, icon: RiMetaFill },
      { id: 'c09', label: 'Webinar signups · UK', value: 3_130, icon: RiTwitterXFill },
      { id: 'c14', label: 'Win-back series', value: 2_240, icon: RiMailLine },
      { id: 'c13', label: 'Creator collab · EU', value: 980, icon: RiTiktokFill },
    ],
  },
  {
    id: 'pages',
    label: 'Pages',
    items: [
      { id: 'pricing', label: '/pricing', value: 11_240 },
      { id: 'home', label: '/', value: 9_870 },
      { id: 'roadmap', label: '/blog/q4-roadmap', value: 4_410 },
      { id: 'signup', label: '/signup', value: 3_960 },
      { id: 'automations', label: '/features/automations', value: 2_730 },
      { id: 'customers', label: '/customers', value: 1_520 },
      { id: 'changelog', label: '/changelog', value: 860 },
    ],
  },
];

/* Switch tabs to re-rank the bars; the chevron reveals the rows past the top five. */
export default function Demo() {
  return (
    <div className="flex w-full justify-center">
      <ChannelTabsBarList className="max-w-[440px]" tabs={TABS} />
    </div>
  );
}
