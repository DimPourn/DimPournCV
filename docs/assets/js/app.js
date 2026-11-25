/* Dimitris Pournatzis · interactive CV: shared behaviour and the plain view.
   No innerHTML or any other HTML sink anywhere: the page enforces Trusted Types.
   deck.js (loaded after this file) runs the cyberdeck and uses window.DPCV. */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGSAP = !!(window.gsap && window.ScrollTrigger && window.DrawSVGPlugin);
  if (hasGSAP) window.gsap.registerPlugin(window.ScrollTrigger, window.DrawSVGPlugin);
  var gsap = window.gsap;
  function isDeck() { return root.classList.contains('deck-on'); }
  function debounce(fn, ms) { var t = 0; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function setPauseUI(btn, paused, noun) {
    btn.setAttribute('aria-pressed', String(paused));
    btn.querySelector('.pause__txt').textContent = (paused ? 'Play the ' : 'Pause the ') + noun;
  }

  /* ── Nav (plain view): solid once scrolled, inverted over dark bands, current section ── */
  var nav = d.getElementById('nav');
  var navLinks = Array.prototype.slice.call(d.querySelectorAll('.nav__links a'));
  var navTargets = navLinks.map(function (a) { return d.querySelector(a.getAttribute('href')); });
  var darkBands = Array.prototype.slice.call(d.querySelectorAll('[data-theme="dark"]'));
  var navTicking = false;
  function updateNav() {
    navTicking = false;
    if (isDeck()) return;
    var probe = nav.offsetHeight / 2;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
    nav.classList.toggle('is-inv', darkBands.some(function (s) {
      var r = s.getBoundingClientRect();
      return r.top <= probe && r.bottom > probe;
    }));
    var mid = window.innerHeight * 0.45;
    var current = -1;
    navTargets.forEach(function (s, i) {
      if (!s) return;
      var r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) current = i;
    });
    navLinks.forEach(function (a, i) {
      var on = i === current;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!navTicking) { navTicking = true; window.requestAnimationFrame(updateNav); }
  }, { passive: true });
  window.addEventListener('resize', updateNav);
  updateNav();

  /* ── Phone menu (plain view) ── */
  var toggle = d.getElementById('menuToggle');
  var menu = d.getElementById('menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    menu.hidden = !open;
    root.classList.toggle('menu-open', open);
    if (open) { var first = menu.querySelector('a'); if (first) first.focus(); }
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a, button')) setMenu(false); });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ── Copy the email address ── */
  var copyBtn = d.getElementById('copyMail');
  if (copyBtn) {
    var copyTxt = copyBtn.querySelector('.copy__txt');
    var copyLabel = copyTxt.textContent;
    var copyTimer = 0;
    copyBtn.addEventListener('click', function () {
      var value = copyBtn.getAttribute('data-copy');
      var done = function (msg, ok) {
        copyTxt.textContent = msg;
        copyBtn.classList.toggle('is-done', ok);
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () { copyTxt.textContent = copyLabel; copyBtn.classList.remove('is-done'); }, 1800);
      };
      var selectIt = function () {
        var range = d.createRange();
        range.selectNodeContents(d.querySelector('.close__addr'));
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done('Address selected', false);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { done('Copied', true); }, selectIt);
      } else {
        selectIt();
      }
    });
  }

  /* ── Plain-view hero entrance: once on load ── */
  function scramble(el, duration) {
    var finalText = el.textContent;
    var pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    var keep = ' ·,.-';
    var start = performance.now();
    var last = 0;
    function frame(now) {
      var p = Math.min(1, (now - start) / duration);
      if (p < 1 && now - last < 48) { window.requestAnimationFrame(frame); return; }
      last = now;
      var shown = Math.floor(p * finalText.length);
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        var c = finalText.charAt(i);
        out += (i < shown || keep.indexOf(c) !== -1) ? c : pool.charAt((Math.random() * pool.length) | 0);
      }
      el.textContent = p < 1 ? out : finalText;
      if (p < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }
  function heroEnter() {
    if (!hasGSAP || mqReduce.matches || isDeck()) return;
    if (!root.classList.contains('m-enter') || root.classList.contains('m-enter-late')) return;
    root.classList.add('m-entering');
    var lines = d.querySelectorAll('.hero__name .ln__i');
    var notice = d.querySelector('.hero__notice');
    var rest = d.querySelectorAll('.hero .enter-fade:not(.hero__notice)');
    var poster = d.querySelector('.hero__poster');
    var noticeTxt = d.querySelector('[data-scramble]');
    var tl = gsap.timeline({
      onComplete: function () {
        gsap.set([lines, notice, rest], { clearProps: 'transform,opacity,visibility' });
        root.classList.add('m-entered');
      }
    });
    tl.from(lines, { yPercent: 108, duration: 0.7, stagger: 0.08, ease: 'power4.out' }, 0);
    tl.from(notice, { y: 12, autoAlpha: 0, duration: 0.52, ease: 'power3.out' }, 0);
    if (noticeTxt) tl.call(function () { scramble(noticeTxt, 720); }, null, 0.05);
    tl.from(rest, { y: 12, autoAlpha: 0, duration: 0.52, stagger: 0.06, ease: 'power3.out' }, 0.42);
    if (poster) tl.from(poster, { scale: 0.98, duration: 0.9, ease: 'power3.out', clearProps: 'transform' }, 0);
  }
  heroEnter();

  /* ── HomeLab diagram: the words point at the picture; it assembles once, then packets run ── */
  var Lab = (function () {
    var lab = d.getElementById('lab');
    var app = lab.closest('section');
    var points = Array.prototype.slice.call(lab.querySelectorAll('.lab__pt'));
    var pauseBtn = d.getElementById('labPause');
    var pinned = null;
    var paused = false;
    var pulseTl = null;
    var mm = null;
    var cur = null;
    var played = false;

    function focusLab(k) {
      if (k) lab.setAttribute('data-focus', k); else lab.removeAttribute('data-focus');
      points.forEach(function (p) { p.classList.toggle('is-on', !!k && p.getAttribute('data-focus') === k); });
    }
    points.forEach(function (p) {
      var k = p.getAttribute('data-focus');
      p.addEventListener('mouseenter', function () { focusLab(k); });
      p.addEventListener('mouseleave', function () { focusLab(pinned); });
      p.addEventListener('click', function () { pinned = pinned === k ? null : k; focusLab(pinned); });
    });
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      setPauseUI(pauseBtn, paused, 'diagram');
      if (pulseTl) { if (paused) pulseTl.pause(); else pulseTl.play(); }
    });

    var PULSE = { dev: [0, 0.8], svc: [0.8, 0.6], mon: [0.8, 0.6], alr: [1.4, 0.45], net: [0.3, 0.7], test: [1.9, 0.75] };
    var CYCLE = 3.2;

    /* how: 'scroll' (plain view: assembles when it scrolls in), 'now' (deck: assembles at once), 'still' (drawn, packets only) */
    function build(svg, how, ctx) {
      var q = function (s) { return Array.prototype.slice.call(svg.querySelectorAll(s)); };
      var hub = svg.querySelector('.dg-node--hub');
      var nodes = q('.dg-node:not(.dg-node--hub)');
      var solid = q('.dg-edge:not(.dg-edge--dash)');
      var dashed = q('.dg-edge--dash');
      var zone = svg.querySelector('.dg-zone');
      var labels = q('.dg-lab');
      var blocks = q('.dg-block');
      var pulses = q('.pulse');
      var faded = [hub].concat(nodes, dashed, [zone], labels, blocks);
      var later = ctx ? function (fn) { ctx.add(fn); } : function (fn) { fn(); };
      var inView = how !== 'scroll';
      var tl = null, st = null, viewST = null, myPulse = null;

      function startPulses() {
        var p = gsap.timeline({ repeat: -1, paused: true });
        pulses.forEach(function (c) {
          var id = c.getAttribute('data-path');
          var path = svg.querySelector('#' + id);
          var t = PULSE[id.slice(2)];
          if (!path || !t) return;
          var len = path.getTotalLength();
          var o = { p: 0 };
          var place = function () {
            var pt = path.getPointAtLength(o.p * len);
            c.setAttribute('cx', pt.x.toFixed(1));
            c.setAttribute('cy', pt.y.toFixed(1));
          };
          place();
          p.fromTo(o, { p: 0 }, { p: 1, duration: t[1], ease: 'none', onUpdate: place }, t[0]);
          p.fromTo(c, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' }, t[0]);
          p.to(c, { autoAlpha: 0, duration: 0.18, ease: 'none' }, t[0] + t[1] - 0.04);
          if (c.hasAttribute('data-blocked')) {
            p.fromTo(blocks, { scale: 1 }, { scale: 1.22, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: '50% 50%' }, t[0] + t[1]);
          }
        });
        p.set({}, {}, CYCLE);
        myPulse = pulseTl = p;
        pauseBtn.hidden = false;
        if (!paused && inView) p.play();
      }

      if (how === 'scroll') {
        viewST = window.ScrollTrigger.create({
          trigger: svg, start: 'top bottom', end: 'bottom top',
          onToggle: function (self) {
            inView = self.isActive;
            if (!myPulse) return;
            if (inView && !paused) myPulse.play(); else myPulse.pause();
          }
        });
      }
      if (how === 'still') {
        startPulses();
      } else {
        gsap.set([hub].concat(nodes), { autoAlpha: 0, y: 8 });
        gsap.set([zone].concat(dashed, labels), { autoAlpha: 0 });
        gsap.set(blocks, { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' });
        gsap.set(solid, { drawSVG: '0%' });
        tl = gsap.timeline({
          paused: true,
          defaults: { ease: 'power3.out' },
          onComplete: function () {
            gsap.set(faded, { clearProps: 'opacity,visibility,transform' });
            later(startPulses);
          }
        });
        tl.to(hub, { autoAlpha: 1, y: 0, duration: 0.5 }, 0)
          .to(zone, { autoAlpha: 1, duration: 0.5 }, 0.2)
          .to(solid, { drawSVG: '100%', duration: 0.5, stagger: 0.12, ease: 'power2.inOut' }, 0.45)
          .to(nodes, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06 }, 0.55)
          .to(dashed, { autoAlpha: 1, duration: 0.4, stagger: 0.1, ease: 'none' }, 0.85)
          .to(labels, { autoAlpha: 1, duration: 0.4, stagger: 0.06, ease: 'none' }, 1.0)
          .to(blocks, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, 1.2);
        if (how === 'scroll') {
          st = window.ScrollTrigger.create({ trigger: svg, start: 'top 80%', once: true, onEnter: function () { tl.play(); } });
        } else {
          tl.play();
        }
      }
      return {
        svg: svg,
        kill: function () {
          if (viewST) viewST.kill();
          if (st) st.kill();
          if (tl) tl.kill();
          if (myPulse) { myPulse.kill(); if (pulseTl === myPulse) pulseTl = null; }
          pauseBtn.hidden = true;
          gsap.set(faded.concat(pulses, solid), { clearProps: 'all' });
        },
        pause: function () { if (myPulse) myPulse.pause(); },
        resume: function () { if (myPulse && !paused) myPulse.play(); }
      };
    }

    function visibleSvg() {
      var all = lab.querySelectorAll('.dg');
      for (var i = 0; i < all.length; i++) if (all[i].getBoundingClientRect().width > 0) return all[i];
      return null;
    }
    function off() {
      if (mm) { mm.revert(); mm = null; }
      if (cur) { cur.kill(); cur = null; }
    }
    function plainOn() {
      off();
      if (!hasGSAP) return;
      mm = gsap.matchMedia();
      mm.add({
        wide: '(min-width: 900px)', tall: '(max-width: 899.98px)', motion: '(prefers-reduced-motion: no-preference)'
      }, function (ctx) {
        if (!ctx.conditions.motion) return;
        var c = build(lab.querySelector(ctx.conditions.wide ? '.dg--wide' : '.dg--tall'), 'scroll', ctx);
        return function () { c.kill(); };
      });
    }
    function deckOn() {
      if (!hasGSAP || mqReduce.matches) return;
      var svg = visibleSvg();
      if (!svg) return;
      if (cur && cur.svg === svg) { cur.resume(); return; }
      if (cur) cur.kill();
      cur = build(svg, played ? 'still' : 'now');
      played = true;
    }
    function deckOff() { if (cur) cur.pause(); }
    window.addEventListener('resize', debounce(function () {
      if (!isDeck() || !cur || !app.classList.contains('is-active')) return;
      var svg = visibleSvg();
      if (svg && svg !== cur.svg) deckOn();
    }, 160));
    return { plainOn: plainOn, deckOn: deckOn, deckOff: deckOff, off: off };
  })();

  /* ── Vendor scripts on demand (three.js r134 + Vanta GLOBE) ──
     A Trusted Types policy that accepts only these two same-origin URLs, each pinned with SRI. */
  var VENDOR = [
    { src: 'assets/js/vendor/three.r134.min.js', sri: 'sha384-9EQoUIJYrv09/oYhSxnw1VpLcfPw3BM9dE7+D/3wGUPeLLa7F9Z6OAoD+i/M6FK9' },
    { src: 'assets/js/vendor/vanta.globe.min.js', sri: 'sha384-HiLexGd74hcQ6g/RxA2NsDBwbmX+PmKsMBVLRsUWFwFJth+ybhAQ6N90hz80HeSD' }
  ];
  var allowed = VENDOR.map(function (v) { return v.src; });
  var ttPolicy = null;
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      ttPolicy = window.trustedTypes.createPolicy('cv-loader', {
        createScriptURL: function (u) {
          if (allowed.indexOf(u) !== -1) return u;
          throw new TypeError('cv-loader refused ' + u);
        }
      });
    } catch (e) { ttPolicy = null; }
  }
  function loadScript(v) {
    return new Promise(function (resolve, reject) {
      var s = d.createElement('script');
      s.src = ttPolicy ? ttPolicy.createScriptURL(v.src) : v.src;
      s.integrity = v.sri;
      s.async = false;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('could not load ' + v.src)); };
      d.head.appendChild(s);
    });
  }
  var vantaReady = null;
  function loadVanta() {
    vantaReady = vantaReady || loadScript(VENDOR[0]).then(function () { return loadScript(VENDOR[1]); });
    return vantaReady;
  }
  function hasWebGL() {
    try {
      var c = d.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }

  window.DPCV = {
    lab: Lab,
    loadVanta: loadVanta,
    hasWebGL: hasWebGL,
    onMode: function (mode) {
      if (mode === 'plain') {
        Lab.plainOn();
        updateNav();
        if (hasGSAP) window.ScrollTrigger.refresh();
      } else {
        Lab.off();
        setMenu(false);
      }
    }
  };
  if (!isDeck()) Lab.plainOn();

  if (window.console && console.info) {
    console.info('Dimitris Pournatzis, interactive CV. Source: https://github.com/DimPourn/DimPournCV · security contact: .well-known/security.txt');
  }
})();
