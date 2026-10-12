/* gooey-nav.js
   Vanilla port of the React "GooeyNav" (react-bits) component, wired into the
   existing home/about/writing pills. The router (router.js) still owns which
   pill has .active — this just animates a liquid highlight onto it whenever
   that changes, and skips the particle burst under prefers-reduced-motion. */
(function (App) {
  'use strict';
  var $ = App.$;
  var $$ = App.$$;

  var nav = $('.nav-left');
  if (!nav) return;

  var config = {
    animationTime: 600,
    particleCount: 12,
    particleDistances: [34, 6],
    particleR: 55,
    timeVariance: 300
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var filterEl = document.createElement('span');
  filterEl.className = 'gooey-effect gooey-filter';
  var textEl = document.createElement('span');
  textEl.className = 'gooey-effect gooey-text';
  nav.appendChild(filterEl);
  nav.appendChild(textEl);

  function noise(n) {
    n = n || 1;
    return n / 2 - Math.random() * n;
  }

  function getXY(distance, pointIndex, totalPoints) {
    var angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  }

  function createParticle(i, t, d, r) {
    var rotate = noise(r / 10);
    return {
      start: getXY(d[0], config.particleCount - i, config.particleCount),
      end: getXY(d[1] + noise(7), config.particleCount - i, config.particleCount),
      time: t,
      scale: 1 + noise(0.2),
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  }

  function makeParticles(el) {
    var d = config.particleDistances;
    var r = config.particleR;
    var bubbleTime = config.animationTime * 2 + config.timeVariance;
    el.style.setProperty('--time', bubbleTime + 'ms');

    var _loop = function (i) {
      var t = config.animationTime * 2 + noise(config.timeVariance * 2);
      var p = createParticle(i, t, d, r);

      setTimeout(function () {
        var particle = document.createElement('span');
        var point = document.createElement('span');
        particle.className = 'gooey-particle';
        particle.style.setProperty('--start-x', p.start[0] + 'px');
        particle.style.setProperty('--start-y', p.start[1] + 'px');
        particle.style.setProperty('--end-x', p.end[0] + 'px');
        particle.style.setProperty('--end-y', p.end[1] + 'px');
        particle.style.setProperty('--time', p.time + 'ms');
        particle.style.setProperty('--scale', p.scale);
        particle.style.setProperty('--color', 'var(--gooey-mono, var(--hl))');
        particle.style.setProperty('--rotate', p.rotate + 'deg');

        point.className = 'gooey-point';
        particle.appendChild(point);
        el.appendChild(particle);
        requestAnimationFrame(function () { el.classList.add('active'); });
        setTimeout(function () {
          try { el.removeChild(particle); } catch (e) { /* already gone */ }
        }, p.time);
      }, 30);
    };

    el.classList.remove('active');
    for (var i = 0; i < config.particleCount; i++) _loop(i);
  }

  function updateEffectPosition(pill) {
    var containerRect = nav.getBoundingClientRect();
    var pos = pill.getBoundingClientRect();
    [filterEl, textEl].forEach(function (el) {
      el.style.left = (pos.left - containerRect.left) + 'px';
      el.style.top = (pos.top - containerRect.top) + 'px';
      el.style.width = pos.width + 'px';
      el.style.height = pos.height + 'px';
    });
    textEl.textContent = pill.textContent.trim();
  }

  function burst(pill) {
    updateEffectPosition(pill);

    if (reduceMotion) {
      textEl.classList.add('active');
      return;
    }

    $$('.gooey-particle', filterEl).forEach(function (p) { filterEl.removeChild(p); });
    textEl.classList.remove('active');
    void textEl.offsetWidth; // restart the CSS transition
    textEl.classList.add('active');
    makeParticles(filterEl);
  }

  function activePill() {
    return $('.pill[data-route].active', nav);
  }

  function syncToActivePill() {
    var pill = activePill();
    if (pill) burst(pill);
  }

  window.addEventListener('hashchange', function () {
    requestAnimationFrame(syncToActivePill);
  });
  window.addEventListener('resize', function () {
    var pill = activePill();
    if (pill) updateEffectPosition(pill);
  });

  // main.js has already called App.router.render() by the time this file
  // runs (it's the second-to-last script), so the initial .active pill exists.
  requestAnimationFrame(syncToActivePill);
  // Web fonts can reflow the nav after first paint; resync once they're in.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      var pill = activePill();
      if (pill) updateEffectPosition(pill);
    });
  }

  App.gooeyNav = { sync: syncToActivePill };
})(window.App);
