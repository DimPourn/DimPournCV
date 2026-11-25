# Credits and licences

Everything below is served from this site. Nothing is loaded from a third-party origin.

## Libraries (`js/vendor/`)

| File | Version | Licence | Checked against |
| --- | --- | --- | --- |
| `gsap.min.js`, `ScrollTrigger.min.js`, `DrawSVGPlugin.min.js` | GSAP 3.13.0 | GSAP standard no-charge licence, https://gsap.com/standard-license | same files as the sh_lab site |
| `three.r134.min.js` | three.js r134 (npm `three@0.134.0`, `build/three.min.js`) | MIT, `LICENSE-three.txt` | npm tarball integrity sha512 |
| `vanta.globe.min.js` | Vanta 0.5.24 (npm `vanta@0.5.24`, `dist/`) | MIT, `LICENSE-vanta.txt` | npm tarball integrity sha512 |

Each script is pinned with a Subresource Integrity hash (sha384) in `index.html` and `js/app.js`.
three.js and Vanta load only on desktop, through the Trusted Types policy `cv-loader`.

## Fonts (`fonts/`)

Chivo and Chivo Mono, © The Chivo Project Authors, SIL Open Font License 1.1
(https://openfontlicense.org/). Latin subsets of the variable fonts from Google Fonts.

## Icons (`icons/`)

Product logos from SVG Logos by Gil Barbara (CC0) and Simple Icons (CC0), fetched and cropped
with the tasteskill icon resolver. The marks are trademarks of their owners and are used only to
name tools I have worked with.

## Images (`img/`)

`globe.webp`, `globe-sm.webp` (the hero's still) and `og.jpg` (the link preview) are rendered from
this page with `tools/site.py`.
