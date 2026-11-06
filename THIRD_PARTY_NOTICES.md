# Third-party notices

Kinetic's own code is MIT licensed (see `LICENSE`). This file covers code in
this repository that was written by someone else, and the npm packages the
registry components depend on.

## BoardUI

The 73 components in the **BoardUI kit** (`kit: 'boardui'` in
`registry/meta/*.ts`) and the files they ship are adapted from the free source
of BoardUI, which is published under the MIT License:

- `registry/ui/*` files whose header reads "Adapted from BoardUI"
- `registry/lib/*` and `registry/hooks/*` files whose header reads "Adapted from BoardUI"
- `registry/styles/boardui-theme.css`
- the template routes under `app/templates/chat-starter/`

Source: https://github.com/BoardUI/boardui (free components only; BoardUI Pro
source is not included).

Each adapted file keeps the copyright line and an SPDX identifier in its header.
`registry/styles/boardui-theme.css` is installed with every BoardUI-kit
component, and it carries the full licence text below. Please keep both when
you install or copy these files.

```
MIT License

Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

BoardUI's licence page (https://www.boardui.com/license) says that the free
source "may be used under MIT terms wherever it came from". It also says the
rest of that page, including its restrictions on building competing component
libraries and on tools that let other people browse or preview the source,
applies to the free source "only where MIT is silent". If you publish this
registry, read that page yourself before you do.

## npm dependencies

These packages are not redistributed here. Components declare them, and the
CLI installs them from npm under their own licences. The licence values are
read from each package's `license` field.

| Package | Licence | Used by |
| --- | --- | --- |
| `react-aria-components` | Apache-2.0 | BoardUI form, overlay and navigation components |
| `react-aria` | Apache-2.0 | BoardUI notification and settings components, and the overlay portal in the preview stage |
| `@internationalized/date` | Apache-2.0 | BoardUI date and time components |
| `@remixicon/react` | Remix Icon License 1.0 | BoardUI icons |
| `motion` | MIT | BoardUI animated components |
| `recharts` | MIT | BoardUI chart cards |
| `@tanstack/react-table` | MIT | BoardUI data table |
| `tailwind-merge` | MIT | BoardUI class merging (`cx`) |
| `ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` | Apache-2.0 | BoardUI agent chat and its `/api/chat` route |
| `gsap` | GSAP Standard "no charge" licence | Kinetic motion components |
| `three` | MIT | Kinetic WebGL components |
| `ogl` | Unlicense | Kinetic WebGL components |
| `lenis` | MIT | Kinetic smooth scroll |

The Remix Icon License 1.0 allows commercial use and modification, and does
not require attribution. It forbids selling or distributing the icons as a
standalone product, building a competing icon set from them, and using them as
a logo or trademark.
