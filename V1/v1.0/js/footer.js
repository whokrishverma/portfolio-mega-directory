/* footer.js
   Footer behaviour: the view counter box and the shuffling emoji. */
(function (App) {
  'use strict';
  var $ = App.$;

  /* ---------- View counter (display only) ---------- */
  function setViews(n) {
    var text = n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
             : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
             : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    $('#viewCount').textContent = text;
    $('#views').setAttribute('aria-label', n + (n === 1 ? ' view' : ' views'));
  }
  setViews(App.config.viewCount);
  App.setViews = setViews;

  /* ---------- Emoji shuffle ----------
     Changes every 2-3.6 s on its own, every 80 ms while hovered or focused.
     A tap gives a short fast burst (touch screens have no hover). Reduced-motion users get no fast mode. */
  var EMOJIS = App.config.footerEmojis;
  var button = $('#emojiBtn');
  var el = $('#footEmoji');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var index = 0, hovering = false, burst = false, timer, burstTimer;

  function fast() { return !reduce && (hovering || burst); }

  function next() {
    var n;
    do { n = Math.floor(Math.random() * EMOJIS.length); } while (n === index);
    index = n;
    el.textContent = EMOJIS[n];
    if (!fast() && !reduce) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }

  function schedule() {
    clearTimeout(timer);
    var wait = fast() ? 80 : 2200 + Math.random() * 1400;
    timer = setTimeout(function () { if (!document.hidden) next(); schedule(); }, wait);
  }

  function refresh() { button.classList.toggle('fast', fast()); schedule(); }

  button.addEventListener('pointerenter', function () { hovering = true; refresh(); });
  button.addEventListener('pointerleave', function () { hovering = false; refresh(); });
  button.addEventListener('focus', function () { hovering = true; refresh(); });
  button.addEventListener('blur', function () { hovering = false; refresh(); });
  button.addEventListener('click', function () {
    burst = true; refresh();
    clearTimeout(burstTimer);
    burstTimer = setTimeout(function () { burst = false; refresh(); }, 1400);
  });
  schedule();
})(window.App);
