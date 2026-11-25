/* Runs in <head> before first paint. Marks the page as scripted and, when motion is allowed,
   holds the hero's words back for app.js's entrance. If app.js has not started by 900 ms
   (slow network, blocked script), the words are released by CSS alone. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  d.classList.add('m-enter');
  setTimeout(function () {
    if (!d.classList.contains('m-entering')) d.classList.add('m-enter-late');
  }, 900);
})();
