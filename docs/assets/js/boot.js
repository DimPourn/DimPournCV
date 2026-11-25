/* Runs in <head> before first paint.
   - Picks the mode: the cyberdeck (default) or the plain page (no JavaScript, "Plain view", ?plain).
   - In plain mode, holds the hero's words back for app.js's entrance (released by CSS after 900 ms).
   - If deck.js never reports in (blocked or broken script), falls back to the plain page. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mode = 'deck';
  try { if (window.localStorage.getItem('dpcv-mode') === 'plain') mode = 'plain'; } catch (e) { /* storage blocked */ }
  if (/[?&]plain(=|&|$)/.test(window.location.search)) mode = 'plain';
  if (/[?&]deck(=|&|$)/.test(window.location.search)) mode = 'deck';

  if (mode === 'deck') {
    d.classList.add('deck-on');
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (d.getAttribute('data-deck') !== 'ready') d.classList.remove('deck-on');
      }, 2500);
    });
    return;
  }
  if (reduce) return;
  d.classList.add('m-enter');
  setTimeout(function () {
    if (!d.classList.contains('m-entering')) d.classList.add('m-enter-late');
  }, 900);
})();
