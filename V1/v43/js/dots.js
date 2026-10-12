/* dots.js
   Dotted glow background (vanilla port of Aceternity's DottedGlowBackground).
   Usage: add data-dots to any element. It gets a canvas behind its content.
   Optional attributes: data-dots-gap, data-dots-radius, data-dots-speed-min, data-dots-speed-max. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function setup(host) {
    var num = function (a, d) { var v = parseFloat(host.getAttribute(a)); return isNaN(v) ? d : v; };
    var gap = num('data-dots-gap', 10), radius = num('data-dots-radius', 1.6);
    var speedMin = num('data-dots-speed-min', 0.3), speedMax = num('data-dots-speed-max', 1.6);

    var layer = document.createElement('div');
    layer.className = 'dots-bg';
    layer.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    layer.appendChild(canvas);
    host.insertBefore(layer, host.firstChild);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(Math.max(1, window.devicePixelRatio || 1), 2);
    var dots = [], w = 0, h = 0, raf = 0, visible = true, color, glow, alpha;

    function colors() {
      // Tailwind neutral-500 / neutral-600 / sky-800, same as the original demo
      if (isDark()) { color = '#737373'; glow = '#075985'; alpha = 1; }
      else { color = '#737373'; glow = '#525252'; alpha = 0.2; }
    }

    function build() {
      var r = layer.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = Math.floor(w) + 'px';
      canvas.style.height = Math.floor(h) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      var cols = Math.ceil(w / gap) + 2, rows = Math.ceil(h / gap) + 2;
      var lo = Math.min(speedMin, speedMax), span = Math.max(Math.max(speedMin, speedMax) - lo, 0);
      for (var i = -1; i < cols; i++) {
        for (var j = -1; j < rows; j++) {
          dots.push({
            x: i * gap + (j % 2 === 0 ? 0 : gap * 0.5),   // offset every other row
            y: j * gap,
            phase: Math.random() * Math.PI * 2,
            speed: lo + Math.random() * span
          });
        }
      }
      if (reduce) draw(0);
    }

    function draw(now) {
      if (reduce) { paint(0); return; }
      if (visible) paint(now);
      raf = requestAnimationFrame(draw);
    }

    function paint(now) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      var t = now / 1000;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var mod = (t * d.speed + d.phase) % 2;
        var lin = mod < 1 ? mod : 2 - mod;          // triangle wave 0..1..0
        var a = 0.25 + 0.55 * lin;                  // 0.25..0.8
        if (a > 0.6) { ctx.shadowColor = glow; ctx.shadowBlur = 6 * ((a - 0.6) / 0.4); }
        else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }
        ctx.globalAlpha = a * alpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    colors();
    build();
    if (window.ResizeObserver) new ResizeObserver(build).observe(layer);
    else window.addEventListener('resize', build);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { visible = e[0] ? e[0].isIntersecting : true; }, { threshold: 0.1 }).observe(host);
    }
    new MutationObserver(function () { colors(); if (reduce) paint(0); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  var hosts = document.querySelectorAll('[data-dots]');
  for (var i = 0; i < hosts.length; i++) setup(hosts[i]);
})();
