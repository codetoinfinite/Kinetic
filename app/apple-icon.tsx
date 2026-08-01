import { ImageResponse } from 'next/og';

/* ==========================================================================
   /apple-icon.png — the iOS home-screen icon.
   --------------------------------------------------------------------------
   Generated rather than committed as a binary, so the mark has exactly one
   source of truth. It is the same easing curve as `app/icon.svg` and the
   header wordmark, redrawn at 180 and with no corner radius: iOS applies its
   own mask and rounds a pre-rounded icon twice.

   `next/og` rasterises via Satori, which does not render inline `<svg>`
   children — it does render an `<img>` whose `src` is an SVG data URI, which
   is what the markup below is.
   ========================================================================== */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="120" height="120">
  <path d="M5 26C11 6 17 6 26 6" stroke="#FAFAFA" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="26" cy="6" r="3.5" fill="#54B3FF"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
        }}
      >
        <img
          width={120}
          height={120}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`}
          alt=""
        />
      </div>
    ),
    size,
  );
}
