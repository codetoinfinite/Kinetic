import { ImageResponse } from 'next/og';

import { MANIFEST } from '@/__generated__/manifest';
import { site } from '@/site.config';

/* ==========================================================================
   /opengraph-image.png — the social card.
   --------------------------------------------------------------------------
   Every string is read from `site.config.ts`, so rebranding the site rebrands
   the card with no image editor involved. Next also serves this as the Twitter
   card image when no `twitter-image` file exists, which is why there is no
   second, near-identical file for that.

   Typeface is Satori's built-in sans rather than the site's Inter/JetBrains
   pair: loading two font binaries at build time to set forty characters is a
   poor trade, and a social card is read at thumbnail size.
   ========================================================================== */

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="72" height="72">
  <path d="M5 26C11 6 17 6 26 6" stroke="#FAFAFA" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="26" cy="6" r="3.5" fill="#54B3FF"/>
</svg>`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0A0A0A',
          color: '#FAFAFA',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img
            width={72}
            height={72}
            src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`}
            alt=""
          />
          <div style={{ fontSize: 34, letterSpacing: -1, color: '#8A8A8A' }}>
            {site.name.toLowerCase()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 86, lineHeight: 1.05, letterSpacing: -3 }}>{site.tagline}</div>
          <div style={{ display: 'flex', marginTop: 34, fontSize: 30, color: '#8A8A8A' }}>
            {MANIFEST.length} components · live previews · full source · agent prompts
          </div>
        </div>

        {/* The accent hairline that closes every band on the site itself. */}
        <div style={{ display: 'flex', height: 6, width: 220, background: '#54B3FF' }} />
      </div>
    ),
    size,
  );
}
