'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Profile Cover Header" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiCalendarLine, RiLink, RiMapPin2Line } from '@remixicon/react';

import { Chip } from '@/registry/ui/chip';
import { ProfileCoverHeader } from '@/registry/ui/profile-cover-header';
import type { ProfileTab } from '@/registry/ui/profile-cover-header';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

const TABS: ProfileTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'agents', label: 'Agents', count: 32 },
  { id: 'images', label: 'Images', count: 128 },
  { id: 'activity', label: 'Activity' },
];

const AGENTS = ['Release notes', 'Changelog bot', 'Design QA', 'Inbox triage', 'Data pull'];

const SWATCHES = [
  'linear-gradient(135deg,#2f7fd0,#9fd0f3)',
  'linear-gradient(135deg,#5b3fa8,#f3a77f)',
  'linear-gradient(135deg,#0d2537,#2c9d8f)',
  'linear-gradient(135deg,#f6c453,#ef6f6c)',
  'linear-gradient(135deg,#7b61ff,#c7b8ff)',
  'linear-gradient(135deg,#1f3b2d,#9ccf7a)',
];

function Panel({ id }: { id: string }) {
  if (id === 'overview') {
    return (
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-regular text-text-secondary">
        <li className="flex items-center gap-1.5">
          <RiMapPin2Line aria-hidden className="size-4 text-foreground-icon-tertiary" />
          Lisbon, Portugal
        </li>
        <li className="flex items-center gap-1.5">
          <RiLink aria-hidden className="size-4 text-foreground-icon-tertiary" />
          mira.studio
        </li>
        <li className="flex items-center gap-1.5">
          <RiCalendarLine aria-hidden className="size-4 text-foreground-icon-tertiary" />
          Joined March 2024
        </li>
      </ul>
    );
  }
  if (id === 'agents') {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {AGENTS.map((agent) => (
          <li key={agent}>
            <Chip variant="caption" color="purple">
              {agent}
            </Chip>
          </li>
        ))}
      </ul>
    );
  }
  if (id === 'images') {
    return (
      <ul className="flex gap-2" aria-label="Latest images">
        {SWATCHES.map((bg, i) => (
          <li key={bg} className="shrink-0">
            <span
              role="img"
              aria-label={`Generated image ${i + 1}`}
              className="block size-10 rounded-lg"
              style={{ backgroundImage: bg }}
            />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-1 text-body-regular text-text-secondary">
      <li>
        <span className="text-text-primary">Ran Design QA</span> on 14 screens · 2h ago
      </li>
      <li>
        <span className="text-text-primary">Generated 8 images</span> for the spring launch · yesterday
      </li>
    </ul>
  );
}

export default function Demo() {
  const [view, setView] = useState<'visitor' | 'owner'>('visitor');
  const [following, setFollowing] = useState(false);
  const [status, setStatus] = useState('Viewing as a visitor');

  const followers = 1284 + (following ? 1 : 0);

  return (
    <div className="flex w-full max-w-[680px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          aria-label="Profile view"
          selectedKeys={new Set([view])}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next === 'visitor' || next === 'owner') {
              setView(next);
              setStatus(next === 'owner' ? 'Viewing your own profile' : 'Viewing as a visitor');
            }
          }}
        >
          <SegmentedControlItem id="visitor">Visitor</SegmentedControlItem>
          <SegmentedControlItem id="owner">Owner</SegmentedControlItem>
        </SegmentedControl>
        <p aria-live="polite" data-testid="profile-status" className="text-caption-1-medium text-text-tertiary">
          {status}
        </p>
      </div>

      <ProfileCoverHeader
        name="Mira Okafor"
        handle="@miraok"
        badges={[{ label: 'PRO' }]}
        stats={[
          { label: 'followers', value: followers.toLocaleString('en-US') },
          { label: 'following', value: 312 },
        ]}
        isOwner={view === 'owner'}
        isFollowing={following}
        onFollowingChange={(next) => {
          setFollowing(next);
          setStatus(next ? 'You follow Mira' : 'Unfollowed Mira');
        }}
        onShare={() => setStatus('Profile link copied')}
        onEdit={() => setStatus('Edit profile opened')}
        tabs={TABS}
        renderPanel={(id) => <Panel id={id} />}
      />
    </div>
  );
}
