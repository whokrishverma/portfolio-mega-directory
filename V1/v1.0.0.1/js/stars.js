/* stars.js
   Generates the decorative side stars used by the light theme.
   The CSS masks create the strong-at-the-edge -> faint-toward-center fade. */
(function () {
  'use strict';

  var STAR_COUNT = 44; // total across both sides
  var root = document.querySelector('.side-stars');
  if (!root) return;

  var left = root.querySelector('.side-stars__zone--left');
  var right = root.querySelector('.side-stars__zone--right');

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function makeStar(zone, side) {
    var star = document.createElement('span');
    star.className = 'side-stars__star';
    star.setAttribute('aria-hidden', 'true');

    // Keep most stars small, with a few slightly larger ones.
    var size = Math.random() < 0.14 ? random(5, 8) : random(2.5, 5);
    var y = random(-1, 101);

    // Distribute stars across the zone, but bias them toward the outer edge.
    // The CSS mask then handles the smooth fade toward the content.
    var x = Math.pow(Math.random(), 0.72) * 88;
    if (side === 'right') x = 100 - x;

    var baseOpacity = random(0.42, 0.88);
    var duration = random(7, 15);
    var delay = random(-duration, 0);

    star.style.setProperty('--size', size.toFixed(2) + 'px');
    star.style.setProperty('--x', x.toFixed(2) + '%');
    star.style.setProperty('--y', y.toFixed(2) + '%');
    star.style.setProperty('--opacity', baseOpacity.toFixed(2));
    star.style.setProperty('--duration', duration.toFixed(2) + 's');
    star.style.setProperty('--delay', delay.toFixed(2) + 's');

    // Very subtle inward drift; left moves right, right moves left.
    var drift = random(5, 18);
    star.style.setProperty('--drift', (side === 'left' ? drift : -drift).toFixed(2) + 'px');
    star.style.setProperty('--drift-y', random(-8, 8).toFixed(2) + 'px');

    zone.appendChild(star);
  }

  var leftCount = Math.ceil(STAR_COUNT / 2);
  var rightCount = STAR_COUNT - leftCount;

  for (var i = 0; i < leftCount; i++) makeStar(left, 'left');
  for (var j = 0; j < rightCount; j++) makeStar(right, 'right');
})();
