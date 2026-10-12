/* scroll-mask.js
   Only job: when the visitor reaches the very end of the page, tell CSS (class .at-page-bottom)
   so the bottom fade can disappear and the footer stays fully readable.
   Controlled by --scroll-mask-hide-at-bottom in css/scroll-mask.css (1 = on, 0 = off). */
(function () {
  'use strict';
  var root = document.documentElement;
  var ticking = false;

  function enabled() {
    return getComputedStyle(root).getPropertyValue('--scroll-mask-hide-at-bottom').trim() === '1';
  }
  function update() {
    ticking = false;
    var on = enabled();
    root.classList.toggle('scroll-mask-hides', on);
    var atEnd = window.innerHeight + window.scrollY >= root.scrollHeight - 24;   // 24px tolerance
    root.classList.toggle('at-page-bottom', on && atEnd);
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('hashchange', function () { setTimeout(update, 60); });  // page changes via the router
  if (window.ResizeObserver) new ResizeObserver(request).observe(document.body);    // content height changes
  update();
})();
