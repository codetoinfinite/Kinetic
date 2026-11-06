'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "GitHub Stars CTA" (boardui.com/).
 * No BoardUI source was used.
 */

import { GithubStarsCta } from '@/registry/ui/github-stars-cta';

export default function Demo() {
  return (
    <div className="flex h-full w-full items-center overflow-y-auto bg-background-full">
      <GithubStarsCta
        repo={{
          owner: 'kinetic-ui',
          name: 'kinetic',
          href: '#kinetic-repo',
          description: 'Free, MIT-licensed React components built on React Aria and Tailwind v4.',
          stars: 12480,
          forks: 642,
          license: 'MIT',
          language: 'TypeScript',
        }}
        points={[
          'Every free component and its demo, MIT licensed',
          'Light and dark tokens with React Aria underneath',
          'Copy the file or install it with the CLI',
        ]}
        secondaryAction={{ label: 'Browse free components', href: '#components' }}
      />
    </div>
  );
}
