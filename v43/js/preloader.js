(function () {
  var root = document.documentElement;
  var pre = document.getElementById('preloader');
  if (!pre) { root.classList.remove('is-loading'); return; }

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var words = pre.querySelectorAll('.pl-word');
  var timers = [];
  var revealed = false;

  // Optional Lenis smooth-scroll hook: pause it while the preloader is up,
  // resume it right as the site is revealed. No-ops if Lenis isn't present.
  function getLenis() { return window.lenis || window.__lenis || null; }
  var lenis = getLenis();
  if (lenis && typeof lenis.stop === 'function') lenis.stop();

  function activate(i) {
    for (var k = 0; k < words.length; k++) words[k].classList.remove('is-active');
    if (words[i]) words[i].classList.add('is-active');
  }

  function schedule(fn, delay) { timers.push(setTimeout(fn, delay)); }
  function clearTimers() { for (var k = 0; k < timers.length; k++) clearTimeout(timers[k]); }

  function reveal() {
    if (revealed) return;
    revealed = true;
    clearTimers();

    root.classList.remove('is-loading');
    root.classList.add('pl-revealing');

    var l = getLenis();
    if (l && typeof l.start === 'function') l.start();

    schedule(function () {
      if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
      root.classList.remove('pl-revealing');
    }, reduced ? 260 : 950);
  }

  if (reduced) {
    schedule(reveal, 260);
  } else {
    var startDelay = 500;   // time before the first word snaps in
    var interval   = 280;   // gap between word snaps (lower = faster cycling)
    var holdLast   = 800;   // how long the final word stays before revealing

    for (var i = 0; i < words.length; i++) {
      (function (idx) {
        schedule(function () { activate(idx); }, startDelay + idx * interval);
      })(i);
    }

    var revealDelay = startDelay + (words.length - 1) * interval + holdLast;
    schedule(reveal, revealDelay);

    // Hard safety net: the loader must never be able to get stuck, but it
    // should always sit comfortably after the last word has had its turn.
    schedule(reveal, revealDelay + 1200);
  }
})();
