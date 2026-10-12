/* stars.js
   Builds the ambient star field that frames the page on the left and right.
   Light theme only, purely decorative, pointer-events: none (see stars.css). */
(function (App) {
  'use strict';

  /* ---------------- Tuning ---------------- */
  var CONFIG = {
    DENSITY: 9500,       // one star per N px2 of zone area. LOWER = MORE STARS.
    MAX_PER_ZONE: 90,    // hard cap per side, so huge screens stay cheap
    MIN_PER_ZONE: 10,

    SIZE_MIN: 2,         // px
    SIZE_MAX: 5.5,       // px. Only ~12% of stars get near the top of this range.
    BIG_CHANCE: 0.12,

    OPACITY_MIN: 0.18,   // per-star base opacity (the CSS mask fades on top of this)
    OPACITY_MAX: 0.62,
    TWINKLE: 0.35,       // how much opacity swings during the animation

    DUR_MIN: 7,          // seconds per drift cycle. HIGHER = SLOWER.
    DUR_MAX: 16,
    DELAY_MAX: 12,       // random start offset, so nothing pulses in sync

    DRIFT: 9,            // max px a star wanders from its origin
    EDGE_BIAS: 1.7,      // >1 packs more stars toward the outer edge
    FIVE_POINT_CHANCE: 0.25,

    MIN_ZONE_WIDTH: 60   // px: below this a zone is left empty
  };

  var rand = function (min, max) { return min + Math.random() * (max - min); };

  /* ---------------- Build ---------------- */
  var field = document.createElement('div');
  field.className = 'starfield';
  field.setAttribute('aria-hidden', 'true');

  var zones = [
    { el: document.createElement('div'), side: 'left' },
    { el: document.createElement('div'), side: 'right' }
  ];
  zones.forEach(function (z) {
    z.el.className = 'star-zone star-zone--' + z.side;
    field.appendChild(z.el);
  });
  document.body.appendChild(field);

  function fill(zone) {
    var box = zone.el.getBoundingClientRect();
    zone.el.textContent = '';
    if (box.width < CONFIG.MIN_ZONE_WIDTH || box.height < 1) return;

    var count = Math.round((box.width * box.height) / CONFIG.DENSITY);
    count = Math.max(CONFIG.MIN_PER_ZONE, Math.min(CONFIG.MAX_PER_ZONE, count));

    var frag = document.createDocumentFragment();

    for (var i = 0; i < count; i++) {
      var star = document.createElement('i');
      star.className = 'star' + (Math.random() < CONFIG.FIVE_POINT_CHANCE ? ' star--five' : '');

      // Horizontal position, biased toward the OUTER edge of this zone.
      var t = Math.pow(Math.random(), CONFIG.EDGE_BIAS);      // 0 = outer edge
      var xPct = (zone.side === 'left' ? t : 1 - t) * 100;

      var size = Math.random() < CONFIG.BIG_CHANCE
        ? rand(CONFIG.SIZE_MAX * 0.72, CONFIG.SIZE_MAX)
        : rand(CONFIG.SIZE_MIN, CONFIG.SIZE_MIN + (CONFIG.SIZE_MAX - CONFIG.SIZE_MIN) * 0.45);

      var base = rand(CONFIG.OPACITY_MIN, CONFIG.OPACITY_MAX);
      var angle = Math.random() * Math.PI * 2;
      var dist = rand(CONFIG.DRIFT * 0.35, CONFIG.DRIFT);

      star.style.cssText =
        'left:' + xPct.toFixed(3) + '%;' +
        'top:' + rand(-2, 102).toFixed(3) + '%;' +
        '--s:' + size.toFixed(2) + 'px;' +
        '--o-min:' + Math.max(0.05, base * (1 - CONFIG.TWINKLE)).toFixed(3) + ';' +
        '--o-max:' + Math.min(1, base * (1 + CONFIG.TWINKLE)).toFixed(3) + ';' +
        '--dx:' + (Math.cos(angle) * dist).toFixed(2) + 'px;' +
        '--dy:' + (Math.sin(angle) * dist).toFixed(2) + 'px;' +
        '--dur:' + rand(CONFIG.DUR_MIN, CONFIG.DUR_MAX).toFixed(2) + 's;' +
        '--delay:-' + rand(0, CONFIG.DELAY_MAX).toFixed(2) + 's;';

      frag.appendChild(star);
    }
    zone.el.appendChild(frag);
  }

  function build() { zones.forEach(fill); }

  build();

  // Rebuild on resize so density and zone width stay right.
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(build, 220);
  });

  App.stars = { rebuild: build, config: CONFIG };
})(window.App);
