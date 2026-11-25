#!/usr/bin/env python3
"""Local helpers for the CV site (not published: Pages serves docs/ only).

  python tools/site.py poster   render the globe stills: globe.webp, globe-sm.webp (plain hero)
                                and wall-desk.webp, wall-phone.webp (the deck's wallpaper)
  python tools/site.py og       render the 1200x630 share card (the open deck) to docs/assets/img/og.jpg
  python tools/site.py check    load the plain view at several sizes: console errors, CSP and
                                Trusted Types violations, overflow, screenshots in shots/
  python tools/site.py deck     open the cyberdeck at each size, visit every app and run the terminal
  python tools/site.py check-reduced
                                the same check with prefers-reduced-motion: reduce

Needs Playwright (Chromium) and ImageMagick. Serves docs/ on 127.0.0.1 only.
"""
import contextlib
import functools
import http.server
import json
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SHOTS = ROOT / "shots"
GL_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


@contextlib.contextmanager
def serve():
    handler = functools.partial(Quiet, directory=str(DOCS))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        try:
            yield f"http://127.0.0.1:{httpd.server_address[1]}/"
        finally:
            httpd.shutdown()


PROBE = """() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', e =>
    window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || '')));
}"""


def render_globe(w, h, scale, color2, bg, alpha, out_png):
    """Vanta GLOBE rendered on its own page (no site CSS), so the still matches the live effect."""
    vendor = DOCS / "assets/js/vendor"
    with sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale)
        pg.set_content(f'<html><body style="margin:0;background:transparent"><div id="g" style="width:{w}px;height:{h}px"></div></body></html>')
        pg.add_script_tag(path=str(vendor / "three.r134.min.js"))
        pg.add_script_tag(path=str(vendor / "vanta.globe.min.js"))
        pg.evaluate("o => VANTA.GLOBE(Object.assign({el: '#g', THREE: window.THREE, mouseControls: false, touchControls: false,"
                    " gyroControls: false, minHeight: 200, minWidth: 200, scale: 1, scaleMobile: 1}, o))",
                    {"color": 0x1793d1 if bg else 0x1f2de6, "color2": color2, "size": 1.1 if bg else 1,
                     "backgroundColor": bg or 0xeef0f3, "backgroundAlpha": alpha})
        pg.wait_for_timeout(3500)
        pg.locator("#g").screenshot(path=str(out_png), omit_background=not bg)
        b.close()


def poster():
    """The stills: the plain hero's light globe and the deck's dark Arch-blue wallpaper."""
    SHOTS.mkdir(exist_ok=True)
    img = DOCS / "assets/img"
    light = SHOTS / "globe.png"
    render_globe(1440, 900, 1.25, 0x5d6470, None, 0, light)
    subprocess.run(["magick", str(light), "-strip", "-quality", "82", "-define", "webp:alpha-quality=90", str(img / "globe.webp")], check=True)
    subprocess.run(["magick", str(light), "-gravity", "East", "-crop", "62%x100%+0+0", "+repage", "-resize", "720x720>",
                    "-strip", "-quality", "72", "-define", "webp:alpha-quality=80", str(img / "globe-sm.webp")], check=True)
    for name, w, h in (("wall-desk", 1388, 726), ("wall-phone", 390, 760)):
        png = SHOTS / f"{name}.png"
        render_globe(w, h, 1.5, 0x5b6472, 0x0b0d12, 1, png)
        subprocess.run(["magick", str(png), "-strip", "-quality", "80", str(img / f"{name}.webp")], check=True)
    for f in ("globe.webp", "globe-sm.webp", "wall-desk.webp", "wall-phone.webp"):
        print(f"{f} {(img / f).stat().st_size // 1024} KB")


def og():
    """The link preview: the open deck (README and fastfetch), rendered with reduced motion."""
    SHOTS.mkdir(exist_ok=True)
    png = SHOTS / "og.png"
    with serve() as url, sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        pg = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1, reduced_motion="reduce", bypass_csp=True)
        pg.goto(url + "?deck", wait_until="load")
        pg.wait_for_timeout(1200)
        pg.add_style_tag(content=".deck-on .hero__actions,.deck-on .hero__deckhint{display:none!important}"
                                 ".deck-on .hero__lead{margin-bottom:0!important}.term__hints{display:none!important}")
        pg.evaluate("document.getElementById('termScroll').scrollTop = 0")
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(png))
        b.close()
    dst = DOCS / "assets/img/og.jpg"
    subprocess.run(["magick", str(png), "-strip", "-quality", "84", "-sampling-factor", "4:2:0", str(dst)], check=True)
    print(f"og {dst.relative_to(ROOT)} {dst.stat().st_size // 1024} KB")


def deck(only=None):
    """The cyberdeck at each size: closed, opening, boot, desktop, every app, the terminal."""
    SHOTS.mkdir(exist_ok=True)
    with serve() as url, sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        for w, h in SIZES:
            if only and f"{w}x{h}" not in only:
                continue
            mobile = w < 700
            ctx = b.new_context(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile)
            pg = ctx.new_page()
            errors = []
            pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            pg.add_init_script(f"({PROBE})()")
            pg.goto(url + "?deck", wait_until="load")
            pg.wait_for_timeout(600)
            tag = f"{w}x{h}"
            press = pg.tap if mobile else pg.click
            pg.screenshot(path=str(SHOTS / f"deck-{tag}-1closed.png"))
            press("#openDeck")
            pg.wait_for_timeout(4500)
            pg.screenshot(path=str(SHOTS / f"deck-{tag}-2desktop.png"))
            for n in range(2, 7):
                press(f".keys .key[data-ws='{n}']")
                pg.wait_for_timeout(2200 if n == 3 else 450)
                pg.screenshot(path=str(SHOTS / f"deck-{tag}-ws{n}.png"))
            if w < 1000:
                press("#termBtn")
                pg.wait_for_timeout(250)
            pg.click("#termIn")
            for c in ("help", "sudo !!", "nmap dp-deck", "ls -a", "cat .flag"):
                pg.fill("#termIn", c)
                pg.press("#termIn", "Enter")
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(SHOTS / f"deck-{tag}-term.png"))
            sw = pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            csp = pg.evaluate("window.__csp")
            ok = not errors and not csp and not sw
            print(("OK " if ok else "!! ") + tag, pg.get_attribute("#scene", "data-state"), "overflow" if sw else "")
            for e in errors + csp:
                print("   ", e)
            ctx.close()
        b.close()


SIZES = [(1440, 900), (1280, 800), (1024, 768), (820, 1180), (768, 1024), (390, 658), (390, 844), (375, 553), (360, 584), (320, 568)]


def check(only=None, motion="no-preference"):
    SHOTS.mkdir(exist_ok=True)
    report = []
    with serve() as url, sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        for w, h in SIZES:
            if only and f"{w}x{h}" not in only:
                continue
            mobile = w < 600
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                is_mobile=mobile, has_touch=mobile, reduced_motion=motion)
            pg = ctx.new_page()
            errors = []
            pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            pg.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url}"))
            pg.add_init_script(f"({PROBE})()")
            pg.goto(url + "?plain", wait_until="load")
            pg.wait_for_timeout(2600 if w >= 900 else 1400)
            info = pg.evaluate("""() => {
              const de = document.documentElement;
              const secs = [...document.querySelectorAll('main > section')].map(s => {
                const r = s.getBoundingClientRect();
                return { id: s.id, h: Math.round(r.height) };
              });
              const wide = [...document.querySelectorAll('body *')].filter(el => {
                const r = el.getBoundingClientRect();
                return r.width && (r.right > de.clientWidth + 1 || r.left < -1) && !el.closest('.hero__globe') && getComputedStyle(el).position !== 'fixed';
              }).slice(0, 5).map(el => el.tagName.toLowerCase() + '.' + [...el.classList].join('.'));
              return { scrollW: de.scrollWidth, clientW: de.clientWidth, secs, wide,
                       live: de.classList.contains('globe-live'), csp: window.__csp };
            }""")
            pg.screenshot(path=str(SHOTS / f"top-{w}x{h}.png"))
            for sid in ("experience", "homelab", "skills", "education", "contact"):
                pg.evaluate(f"document.getElementById('{sid}').scrollIntoView()")
                pg.wait_for_timeout(2700 if sid == "homelab" else 350)
                pg.screenshot(path=str(SHOTS / f"{sid}-{w}x{h}.png"))
            report.append({"size": f"{w}x{h}", **info, "errors": errors})
            ctx.close()
        b.close()
    for r in report:
        flag = "OK " if not r["errors"] and not r["csp"] and r["scrollW"] <= r["clientW"] and not r["wide"] else "!! "
        print(flag + r["size"], "globe-live" if r["live"] else "poster",
              "sections:", " ".join(f"{s['id'] or 'hero'}={s['h']}" for s in r["secs"]))
        if r["scrollW"] > r["clientW"] or r["wide"]:
            print("   overflow:", r["scrollW"], ">", r["clientW"], r["wide"])
        for e in r["errors"] + r["csp"]:
            print("   ", e)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    if cmd == "poster":
        poster()
    elif cmd == "og":
        og()
    elif cmd == "check":
        check(sys.argv[2:] or None)
    elif cmd == "deck":
        deck(sys.argv[2:] or None)
    elif cmd == "check-reduced":
        check(sys.argv[2:] or None, motion="reduce")
    else:
        sys.exit(__doc__)
