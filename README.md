# Dimitris Pournatzis — CV

**🌐 Live CV site: [dimpourn.github.io/DimPournCV](https://dimpourn.github.io/DimPournCV/)**

An interactive CV that runs like a secure phone OS: the site opens on a 3D phone lock
screen — press the power button and it zooms into the screen, where each CV section is
an app page in a horizontal swipeable slideshow (dock, status bar, the works).

Cybersecurity-focused Information Science student — see also my
[homelab write-up](https://dimpourn.github.io/sh_lab/).

## Security posture

The site practices what the CV preaches:

- **Strict Content-Security-Policy** — `default-src 'none'`, `script-src 'self'`,
  `style-src 'self'`; no inline scripts or styles anywhere
- **Trusted Types enforced** (`require-trusted-types-for 'script'`) — no DOM-XSS
  injection sinks in the codebase
- **Zero third-party requests** — fonts are self-hosted (also GDPR-friendly);
  no CDNs, no trackers, no analytics
- **No dependencies** — hand-written vanilla JS/CSS; nothing to supply-chain-attack
- **`Referrer-Policy: strict-origin-when-cross-origin`**, `noopener noreferrer`
  on all external links, `upgrade-insecure-requests`
- **[RFC 9116 `security.txt`](https://dimpourn.github.io/DimPournCV/.well-known/security.txt)**

*(`frame-ancestors`/HSTS require HTTP headers, which GitHub Pages cannot set;
everything enforceable without headers is applied via `<meta>`.)*
