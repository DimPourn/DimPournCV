#!/usr/bin/env python3
"""Local helpers for the CV site (not published: Pages serves docs/ only).

  python tools/site.py poster   render the Vanta globe and save docs/assets/img/globe.webp
  python tools/site.py og       render the 1200x630 share card to docs/assets/img/og.jpg
  python tools/site.py check    load the page at several sizes: console errors, CSP and
                                Trusted Types violations, overflow, screenshots in shots/
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


def poster():
    out_png = SHOTS / "globe.png"
    SHOTS.mkdir(exist_ok=True)
    with serve() as url, sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1.25, bypass_csp=True)
        pg.goto(url, wait_until="load")
        pg.wait_for_selector("html.globe-live", timeout=20000)
        pg.wait_for_timeout(3500)
        pg.add_style_tag(content=".hero__poster,.hero::before,.nav,.hero__pause{display:none!important}"
                                 ".hero__in{visibility:hidden!important}"
                                 ".hero__art{-webkit-mask-image:none!important;mask-image:none!important}"
                                 "html,body,.hero{background:transparent!important}")
        pg.mouse.move(720, 450)
        pg.wait_for_timeout(400)
        print(pg.evaluate("() => { const c = document.querySelector('.vanta-canvas').getBoundingClientRect(); return [c.x, c.y, c.width, c.height]; }"))
        pg.screenshot(path=str(out_png), omit_background=True, clip={"x": 0, "y": 0, "width": 1440, "height": 900})
        b.close()
    dst = DOCS / "assets/img/globe.webp"
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["magick", str(out_png), "-strip", "-define", "webp:lossless=false",
                    "-quality", "82", "-define", "webp:alpha-quality=90", str(dst)], check=True)
    # phone crop: a square around the globe (right part of the frame)
    sm = DOCS / "assets/img/globe-sm.webp"
    subprocess.run(["magick", str(out_png), "-gravity", "East", "-crop", "62%x100%+0+0", "+repage",
                    "-resize", "900x900>", "-strip", "-quality", "80", "-define", "webp:alpha-quality=90", str(sm)], check=True)
    print(f"phone poster {sm.relative_to(ROOT)} {sm.stat().st_size // 1024} KB")
    size = subprocess.run(["magick", "identify", "-format", "%wx%h", str(dst)], capture_output=True, text=True).stdout
    print(f"poster {dst.relative_to(ROOT)} {size} {dst.stat().st_size // 1024} KB")


def og():
    SHOTS.mkdir(exist_ok=True)
    png = SHOTS / "og.png"
    with serve() as url, sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        pg = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1, bypass_csp=True)
        pg.emulate_media(reduced_motion="reduce")
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(600)
        pg.add_style_tag(content=(
            ".nav,.hero__pause{display:none!important}"
            ".hero{min-height:630px!important;height:630px;padding:0!important;align-items:center}"
            ".hero__actions,.hero__lead{display:none!important}"
            ".hero__name{font-size:112px!important}"
            ".hero__globe{width:62%!important}"
        ))
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(png), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
        b.close()
    dst = DOCS / "assets/img/og.jpg"
    subprocess.run(["magick", str(png), "-strip", "-quality", "84", "-sampling-factor", "4:2:0", str(dst)], check=True)
    print(f"og {dst.relative_to(ROOT)} {dst.stat().st_size // 1024} KB")


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
            pg.goto(url, wait_until="load")
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
    elif cmd == "check-reduced":
        check(sys.argv[2:] or None, motion="reduce")
    else:
        sys.exit(__doc__)
