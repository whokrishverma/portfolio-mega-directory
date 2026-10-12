/* footer.js
   Footer behaviour: the view counter box and the shuffling emoji. */
(function (App) {
  'use strict';
  var $ = App.$;

  /* ---------- View counter (display only) ---------- */
  function ordinalSuffix(n) {
    var rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  function formatNumber(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function setViews(n) {
    $('#visitorNumber').textContent = formatNumber(n) + ordinalSuffix(n);
    $('#views').setAttribute('aria-label', 'You are visitor number ' + n);
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
