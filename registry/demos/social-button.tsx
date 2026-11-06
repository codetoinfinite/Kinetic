'use client';

import { SocialButton, type SocialProvider } from '@/registry/ui/social-button';

const OUTLINED: SocialProvider[] = ['google', 'apple', 'github'];
const ICON_ONLY: SocialProvider[] = ['github', 'x', 'figma', 'slack', 'microsoft', 'linkedin'];

/* BoardUI's outlined sign-in stack (full-colour marks) beside the filled
   treatments, then a row of logo-only squares for a compact "or sign in
   with" strip. Buttons are inert here: a real one would get an OAuth href. */
export default function Demo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap justify-center gap-6">
        <div className="flex w-[250px] flex-col gap-2">
          {OUTLINED.map((brand) => (
            <SocialButton key={brand} brand={brand} size="small" appearance="white" fullWidth />
          ))}
        </div>
        <div className="flex w-[250px] flex-col gap-2">
          <SocialButton brand="google" size="small" fullWidth />
          <SocialButton brand="discord" size="small" fullWidth />
          <SocialButton brand="apple" size="small" appearance="black" fullWidth />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {ICON_ONLY.map((brand) => (
          <SocialButton key={brand} brand={brand} appearance="white" iconOnly />
        ))}
      </div>
    </div>
  );
}
