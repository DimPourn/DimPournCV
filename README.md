# Dimitris Pournatzis: CV

**Live CV site: [dimpourn.github.io/DimPournCV](https://dimpourn.github.io/DimPournCV/)** ·
**PDF: [Dimitris-Pournatzis-CV.pdf](docs/Dimitris-Pournatzis-CV.pdf)**

Computer Science student (cybersecurity path) at AUEB, Resilience and Intelligence Intern at
Alpha Bank in 2026, looking for a junior SOC, Blue Team or threat intelligence role. See also my
[homelab site](https://dimpourn.github.io/sh_lab/).

## The site

One page in plain HTML, CSS and JavaScript, served by GitHub Pages from `docs/`:

- a Vanta GLOBE (three.js) behind the name on desktop, with a still image on phones, under reduced
  motion and when WebGL is unavailable, plus a pause button;
- a GSAP entrance for the hero, played once on load;
- a HomeLab diagram that draws itself once when it comes into view; hovering or tapping a point
  in the list highlights its part of the diagram;
- everything readable without JavaScript and in print.

## Security posture

- **Strict Content Security Policy:** `default-src 'none'`, `script-src 'self'`, `style-src 'self'`,
  no inline scripts or styles.
- **Trusted Types enforced** (`require-trusted-types-for 'script'`). The only policy allowed,
  `cv-loader`, accepts exactly two same-origin script URLs (three.js and Vanta), and the code has
  no HTML injection sinks.
- **Subresource Integrity** (sha384) on every vendor script, including the two loaded on demand.
- **Zero third-party requests:** fonts, libraries and icons are self-hosted. No CDNs, trackers or
  analytics.
- **Pinned, verified dependencies:** GSAP 3.13.0, three.js r134 and Vanta 0.5.24, checked against
  their npm tarball hashes ([credits](docs/assets/CREDITS.md)).
- `Referrer-Policy: strict-origin-when-cross-origin`, `noopener noreferrer` on external links,
  `upgrade-insecure-requests`, and an
  [RFC 9116 `security.txt`](https://dimpourn.github.io/DimPournCV/.well-known/security.txt).

*(`frame-ancestors` and HSTS need HTTP headers, which GitHub Pages cannot set.)*

## Local tools

`tools/site.py` (Playwright) renders the hero still and the link preview, and checks the page at
ten screen sizes for console errors, CSP violations and overflow.
