/* stars.js
   Creates the light-theme side stars and starts them after the visitor has
   remained in light mode for five seconds. Music is prepared for the same moment.
*/
(function (App) {
  'use strict';

  var WAIT_MS = 5000;
  var STAR_COUNT_PER_SIDE = 34;
  var MUSIC_SRC = 'assets/music/amongus.mp3'; 
  var timer = null;
  var active = false;
  var audio = null;

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function makeStar(zone) {
    var star = document.createElement('span');
    star.className = 'light-star';
    star.setAttribute('aria-hidden', 'true');

    star.style.left = random(1, 96) + '%';
    star.style.top = random(2, 98) + '%';
    star.style.setProperty('--star-size', random(2.2, 5.2).toFixed(2) + 'px');
    star.style.setProperty('--star-opacity', random(.35, .88).toFixed(2));
    star.style.setProperty('--star-duration', random(5.5, 13).toFixed(2) + 's');
    star.style.setProperty('--star-delay', random(-12, 0).toFixed(2) + 's');
    star.style.setProperty('--drift-x', random(-12, 12).toFixed(1) + 'px');
    star.style.setProperty('--drift-y', random(-18, 18).toFixed(1) + 'px');

    zone.appendChild(star);
  }

  function build() {
    var root = document.getElementById('lightStars');
    if (!root) return;

    var left = root.querySelector('.light-stars__zone--left');
    var right = root.querySelector('.light-stars__zone--right');
    if (!left || !right) return;

    left.textContent = '';
    right.textContent = '';

    for (var i = 0; i < STAR_COUNT_PER_SIDE; i++) {
      makeStar(left);
      makeStar(right);
    }
  }

  function prepareAudio() {
    if (audio) return;
    audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 1.0;
  }

  function fadeMusicIn() {
    if (!audio) return;

    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        // Browsers may block autoplay. The next user interaction will retry.
      });
    }

    var startVolume = 0;
    var targetVolume = 0.28;
    var startedAt = performance.now();
    var duration = 5000;

    function ramp(now) {
      var progress = Math.min(1, (now - startedAt) / duration);
      audio.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress < 1) requestAnimationFrame(ramp);
    }
    requestAnimationFrame(ramp);
  }

  function startEffect() {
    if (active || document.documentElement.getAttribute('data-theme') !== 'light') return;
    active = true;

    var root = document.getElementById('lightStars');
    if (root) root.classList.add('is-active');
    fadeMusicIn();
  }

  function stopEffect() {
    active = false;
    clearTimeout(timer);
    timer = null;

    var root = document.getElementById('lightStars');
    if (root) root.classList.remove('is-active');

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    active = false;

    if (document.documentElement.getAttribute('data-theme') !== 'light') {
      stopEffect();
      return;
    }

    prepareAudio();
    timer = setTimeout(startEffect, WAIT_MS);
  }

  function retryAudioAfterGesture() {
    if (!active || !audio || document.documentElement.getAttribute('data-theme') !== 'light') return;
    if (audio.paused) fadeMusicIn();
  }

  function init() {
    build();
    prepareAudio();
    schedule();

    // theme.js changes the root attribute, so observe that exact change.
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'data-theme') {
          schedule();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    ['pointerdown', 'keydown', 'touchstart'].forEach(function (eventName) {
      document.addEventListener(eventName, retryAudioAfterGesture, { passive: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.App);
