/* DP//OS — no dependencies, CSP-strict (no eval, no innerHTML, no inline handlers) */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scene = document.getElementById("scene");
  var phoneWrap = document.getElementById("phoneWrap");
  var phone = document.getElementById("phone");
  var screenEl = document.getElementById("screenEl");
  var os = document.getElementById("os");
  var pagesEl = document.getElementById("main");
  var pages = [].slice.call(pagesEl.querySelectorAll(".page"));
  var N = pages.length;

  /* live clocks */
  function tick() {
    var d = new Date();
    var t = d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2);
    var lt = document.getElementById("lsTime"), ot = document.getElementById("osTime");
    if (lt) { lt.textContent = t; }
    if (ot) { ot.textContent = t; }
    var ld = document.getElementById("lsDate");
    if (ld) {
      ld.textContent = d.toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" });
    }
  }
  tick(); setInterval(tick, 20000);

  /* phone tilt follows the pointer */
  if (!reduced && window.matchMedia("(hover:hover)").matches) {
    scene.addEventListener("pointermove", function (e) {
      if (unlocking) { return; }
      var x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      phone.style.transform =
        "rotateX(" + (7 - y * 7) + "deg) rotateY(" + (-16 + x * 10) + "deg) rotateZ(2deg)";
    });
  }

  /* ── unlock: press power → zoom into the screen ── */
  var unlocking = false;
  function unlock() {
    if (unlocking) { return; }
    unlocking = true;
    scene.classList.remove("float");
    document.getElementById("power").classList.add("pressed");
    document.getElementById("fp").classList.add("ok");
    var hint = document.getElementById("lsHint");
    hint.textContent = "identity verified — ";
    var b = document.createElement("b");
    b.textContent = "welcome";
    hint.appendChild(b);

    var openOS = function () {
      os.hidden = false;
      requestAnimationFrame(function () {
        os.classList.add("on");
        activate(0);
        var h = pages[0].querySelector("h1");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      });
    };
    var finish = function () {
      scene.classList.add("gone");
      document.body.classList.remove("locked");
      setTimeout(function () { scene.remove(); }, 550);
    };

    if (reduced) { openOS(); finish(); return; }

    setTimeout(function () {
      /* face the camera, then zoom until the screen fills the viewport */
      phone.style.transform = "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
      setTimeout(function () {
        var r = screenEl.getBoundingClientRect();
        var s = Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.12;
        var dx = window.innerWidth / 2 - (r.left + r.width / 2);
        var dy = window.innerHeight / 2 - (r.top + r.height / 2);
        phoneWrap.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + s + ")";
        document.getElementById("ls").classList.add("off");
        setTimeout(openOS, 620);
        setTimeout(finish, 1000);
      }, 520);
    }, 420);
  }
  document.getElementById("power").addEventListener("click", unlock);
  screenEl.addEventListener("click", unlock);
  screenEl.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); unlock(); } });
  window.addEventListener("keydown", function (e) {
    if (document.body.classList.contains("locked") && e.key === "Enter") { unlock(); }
  });

  /* deep link (#projects etc.) skips the lock screen */
  var hashIdx = -1;
  pages.forEach(function (p, i) { if ("#" + p.id === location.hash) { hashIdx = i; } });

  /* ── slideshow engine ── */
  var current = 0;
  var dockBtns = [].slice.call(document.querySelectorAll(".dock button"));
  var chevPrev = document.getElementById("chevPrev");
  var chevNext = document.getElementById("chevNext");
  var osWall = document.getElementById("osWall");

  function activate(i) {
    i = Math.max(0, Math.min(N - 1, i));
    current = i;
    pages[i].classList.add("seen");
    dockBtns.forEach(function (b, k) { b.classList.toggle("on", k === i); });
    chevPrev.disabled = i === 0;
    chevNext.disabled = i === N - 1;
    if (history.replaceState) { history.replaceState(null, "", "#" + pages[i].id); }
  }
  function goTo(i) {
    i = Math.max(0, Math.min(N - 1, i));
    pagesEl.scrollTo({ left: i * pagesEl.clientWidth, behavior: reduced ? "auto" : "smooth" });
    activate(i);
  }

  /* track native scroll (touch swipe / snap) */
  var scrollTick = false;
  pagesEl.addEventListener("scroll", function () {
    if (!scrollTick) {
      scrollTick = true;
      requestAnimationFrame(function () {
        scrollTick = false;
        var i = Math.round(pagesEl.scrollLeft / pagesEl.clientWidth);
        if (i !== current) { activate(i); }
        /* wallpaper parallax */
        var max = pagesEl.scrollWidth - pagesEl.clientWidth;
        if (max > 0 && !reduced) {
          osWall.style.transform = "translateX(" + (-(pagesEl.scrollLeft / max) * 6) + "%)";
        }
      });
    }
  }, { passive: true });

  /* wheel → page turns (only when the page can't scroll further vertically) */
  var wheelLock = 0, wheelAcc = 0;
  pagesEl.addEventListener("wheel", function (e) {
    var now = Date.now();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { return; }   /* trackpad horizontal: native */
    var pg = pages[current];
    var down = e.deltaY > 0;
    var canScroll = down
      ? pg.scrollTop + pg.clientHeight < pg.scrollHeight - 2
      : pg.scrollTop > 2;
    if (canScroll) { return; }                                  /* let inner content scroll */
    e.preventDefault();
    if (now < wheelLock) { return; }
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 50) {
      wheelLock = now + 750;
      goTo(current + (wheelAcc > 0 ? 1 : -1));
      wheelAcc = 0;
    }
  }, { passive: false });

  /* drag with mouse */
  var drag = null;
  pagesEl.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) { return; }
    if (e.target.closest("a,button")) { return; }
    drag = { x: e.clientX, left: pagesEl.scrollLeft, moved: false };
    pagesEl.classList.add("dragging");
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) { return; }
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) { drag.moved = true; }
    pagesEl.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", function (e) {
    if (!drag) { return; }
    pagesEl.classList.remove("dragging");
    var dx = e.clientX - drag.x;
    var target = current;
    if (drag.moved && Math.abs(dx) > 60) { target = current + (dx < 0 ? 1 : -1); }
    drag = null;
    goTo(target);
  });

  /* keys, chevrons, dock */
  window.addEventListener("keydown", function (e) {
    if (document.body.classList.contains("locked")) { return; }
    if (e.altKey || e.ctrlKey || e.metaKey) { return; }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
  });
  chevPrev.addEventListener("click", function () { goTo(current - 1); });
  chevNext.addEventListener("click", function () { goTo(current + 1); });
  dockBtns.forEach(function (b) {
    b.addEventListener("click", function () { goTo(+b.getAttribute("data-i")); });
  });

  /* keep alignment on resize; keep focused content in view */
  window.addEventListener("resize", function () {
    pagesEl.scrollLeft = current * pagesEl.clientWidth;
  }, { passive: true });
  pagesEl.addEventListener("focusin", function (e) {
    var pg = e.target.closest(".page");
    if (pg) {
      var i = pages.indexOf(pg);
      if (i !== -1 && i !== current) { goTo(i); }
    }
  });

  /* deep-linked visits skip the lock screen */
  if (hashIdx >= 0) {
    scene.remove();
    document.body.classList.remove("locked");
    os.hidden = false;
    os.classList.add("on");
    pagesEl.scrollLeft = hashIdx * pagesEl.clientWidth;
    activate(hashIdx);
  }
})();
