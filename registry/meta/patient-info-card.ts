import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'patient-info-card',
  title: 'Patient Info Card',
  category: 'display',
  kit: 'boardui',
  tags: ['profile', 'card', 'medical', 'dashboard', 'avatar', 'boardui'],
  blurb:
    'A medical-dashboard profile card: a 66px avatar with an add-photo button, the patient\'s name and four icon label/value rows.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/patient-info-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The patient summary card from BoardUI\'s medical profile dashboard, built to the Figma frame\'s measurements. A centred initials avatar carries a small round "add photo" button on its corner, the name sits under it, and four inset rows list date of birth, gender, blood type and GP, each with a leading icon. The content is fixed sample copy. The card is a layout to copy and wire to your own record.',

  mechanism: [
    'The card is a fixed-height `section` (`h-[330px]`, `rounded-[20px]`, `bg-background-secondary-default`) laid out as a centred column with `gap-[15px]`, `pt-6` and `px-2.5 pb-2.5`. It stretches to its container with `w-full min-w-0`.',
    'The 15px gap is copied from the Figma absolute positions rather than rounded to a spacing step: avatar top 24 and bottom 90, name at 105, details at 146, as the source comment records.',
    'The kit\'s `Avatar` at `size="lg"` is enlarged with `size-[66px] text-[24.75px]` and shows initials. A `Button` (`variant="secondary"`, `size="xs"`, `iconOnly`, `RiAddLine`) is absolutely placed at `-top-0.5 -end-0.5` on a `relative` wrapper, so it overlaps the avatar\'s top corner and moves to the other side in RTL. It is labelled "Add profile photo".',
    'The details come from a module-level `DETAILS` array of `{ icon, label, value }`. Each row is a `justify-between` flex row with `rounded-2lg bg-background-inner-default px-2.5 py-2`: a 16px icon and the label in `text-body-regular text-text-secondary` on the start side, the value in `text-body-medium text-text-primary` on the end side. Both are `whitespace-nowrap`.',
    'The rows sit in a `flex-1 flex-col gap-2.5` block, so they take the space under the name. The whole tree goes through `useTemplateCopy()`, which returns it unchanged unless a `TemplateCopyProvider` translates the copy.',
  ],

  constants: [
    {
      name: 'vertical gap',
      value: 'gap-[15px]',
      why: 'Figma spaces avatar, name and details 15px apart (90 to 105, 131 to 146). Rounding to 16px would shift the stack by 2px against the design file.',
    },
    {
      name: 'avatar',
      value: 'size-[66px], text-[24.75px]',
      why: 'The Figma avatar is 66px. The initials keep the kit\'s lg ratio of 18px text on a 36px circle (0.375 of the size), so 66 × 0.375 = 24.75.',
    },
    {
      name: 'card frame',
      value: 'h-[330px], rounded-[20px], pt-6 px-2.5 pb-2.5',
      why: 'Frame 125\'s height and corner radius. The 24px top padding puts the avatar at Figma\'s y = 24, and the 10px sides let the inset rows nearly reach the edge.',
    },
  ],

  pitfalls: [
    'Letting a long value wrap. Labels and values are `whitespace-nowrap`, and a long GP name in a narrow column will push past the row. Give the card at least about 280px, or truncate the value.',
    'Rounding the 15px gaps to `gap-4`. The rhythm is copied from Figma on purpose.',
    'Expecting props for the patient. Only `className` is accepted. The name, initials and `DETAILS` rows are hard-coded sample content to replace with your data.',
    'Dropping the `aria-label` on the add-photo button. It is icon-only, so the label is its only accessible name.',
  ],

  notes: [
    'The add-photo button has no click handler. Wire it to your upload flow.',
    'The details use RemixIcon glyphs: asterisk for date of birth, a male figure for gender, a drop for blood type and a stethoscope for the GP.',
  ],

  apiSignature: 'function PatientInfoCard(props?: { className?: string }): JSX.Element',

  props: [
    { name: 'className', type: 'string', description: 'Merged onto the card section, for example to set its width or height.' },
  ],

  reducedMotion:
    'The card has no animation of its own. The add-photo button uses the kit\'s `button-press-motion`: a colour transition and a 0.98 press scale. It is small and only follows a direct press.',

  cleanup: 'Nothing to clean up. The card is static markup with no effects, timers or listeners.',

  acceptance:
    'A 330px card with 20px corners shows a 66px "JL" avatar with a small round plus button overlapping its top corner, "Jordan Lee" under it and four inset rows: Date of Birth 28 July, 1997; Gender Male; Blood Type A rh+; GP Doctor Mattheus Clarkson. Labels are secondary text on the start side and values primary text on the end side. In RTL the plus button and the row contents mirror.',

  criticalRegion: 'critical',
};

export default meta;
