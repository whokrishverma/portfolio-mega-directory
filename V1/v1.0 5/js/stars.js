/* stars.js
   Builds the ambient star field that frames the page on the left and right.
   Light theme only, decorative, pointer-events: none (see stars.css). */
(function () {
  'use strict';

  /* ---------------- Tuning ---------------- */
  var CONFIG = {
    DENSITY: 2600,       // one star per N px2 of zone area. LOWER = MORE STARS.
    MAX_PER_ZONE: 260,   // hard cap per side
    MIN_PER_ZONE: 30,

    SIZE_MIN: 3,         // px
    SIZE_MAX: 8,         // px, only ~15% of stars approach this
    BIG_CHANCE: 0.15,

    OPACITY_MIN: 0.35,   // per-star base opacity (the CSS mask fades on top of this)
    OPACITY_MAX: 0.85,
    TWINKLE: 0.28,       // opacity swing during the animation

    DUR_MIN: 7,          // seconds per drift cycle. HIGHER = SLOWER.
    DUR_MAX: 16,
    DELAY_MAX: 12,       // random start offset so nothing pulses in sync

    DRIFT: 10,           // max px a star wanders from its origin
    EDGE_BIAS: 1.7,      // >1 packs more stars toward the outer edge
    FIVE_POINT_CHANCE: 0.25,

    MIN_ZONE_WIDTH: 40   // px: below this a zone is left empty
  };

  function rand(min, max) { return min + Math.random() * (max - min); }

  function init() {
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
      zone.count = 0;
      zone.width = Math.round(box.width);
      if (box.width < CONFIG.MIN_ZONE_WIDTH || box.height < 1) return;

      var count = Math.round((box.width * box.height) / CONFIG.DENSITY);
      count = Math.max(CONFIG.MIN_PER_ZONE, Math.min(CONFIG.MAX_PER_ZONE, count));
      zone.count = count;

      var frag = document.createDocumentFragment();

      for (var i = 0; i < count; i++) {
        var star = document.createElement('i');
        star.className = 'star' + (Math.random() < CONFIG.FIVE_POINT_CHANCE ? ' star--five' : '');

        // Horizontal position, biased toward the OUTER edge of this zone.
        var t = Math.pow(Math.random(), CONFIG.EDGE_BIAS);   // 0 = outer edge
        var xPct = (zone.side === 'left' ? t : 1 - t) * 100;

        var size = Math.random() < CONFIG.BIG_CHANCE
          ? rand(CONFIG.SIZE_MAX * 0.72, CONFIG.SIZE_MAX)
          : rand(CONFIG.SIZE_MIN, CONFIG.SIZE_MIN + (CONFIG.SIZE_MAX - CONFIG.SIZE_MIN) * 0.45);

        var base  = rand(CONFIG.OPACITY_MIN, CONFIG.OPACITY_MAX);
        var angle = Math.random() * Math.PI * 2;
        var dist  = rand(CONFIG.DRIFT * 0.35, CONFIG.DRIFT);

        // setProperty is used instead of cssText so custom properties are
        // guaranteed to register in every browser.
        var s = star.style;
        s.left = xPct.toFixed(3) + '%';
        s.top  = rand(-2, 102).toFixed(3) + '%';
        s.setProperty('--s', size.toFixed(2) + 'px');
        s.setProperty('--o-min', Math.max(0.08, base * (1 - CONFIG.TWINKLE)).toFixed(3));
        s.setProperty('--o-max', Math.min(1, base * (1 + CONFIG.TWINKLE)).toFixed(3));
        s.setProperty('--dx', (Math.cos(angle) * dist).toFixed(2) + 'px');
        s.setProperty('--dy', (Math.sin(angle) * dist).toFixed(2) + 'px');
        s.setProperty('--dur', rand(CONFIG.DUR_MIN, CONFIG.DUR_MAX).toFixed(2) + 's');
        s.setProperty('--delay', '-' + rand(0, CONFIG.DELAY_MAX).toFixed(2) + 's');

        frag.appendChild(star);
      }
      zone.el.appendChild(frag);
    }

    function build() { zones.forEach(fill); }
    build();

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(build, 220);
    });

    // Diagnostics: run App.stars.report() or App.stars.debug() in the console.
    var api = {
      el: field,
      config: CONFIG,
      rebuild: build,
      debug: function (on) {
        field.classList.toggle('starfield--debug', on !== false);
        return api.report();
      },
      report: function () {
        var info = {
          theme: document.documentElement.getAttribute('data-theme'),
          viewport: window.innerWidth,
          fieldDisplay: getComputedStyle(field).display,
          leftZoneWidth: zones[0].width,
          rightZoneWidth: zones[1].width,
          starsLeft: zones[0].count,
          starsRight: zones[1].count
        };
        console.table(info);
        return info;
      }
    };
    window.App = window.App || {};
    window.App.stars = api;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();