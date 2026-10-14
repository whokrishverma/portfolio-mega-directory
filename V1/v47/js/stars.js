/* stars.js
   Light-theme side stars + background music.

   Behaviour
   - After the visitor has stayed in light mode for WAIT_MS (4 s), the stars fade in
     and the music starts. Leaving light mode before that cancels the start.
   - The track loops forever and keeps running whether the tab is focused or in the
     background.
   - Mute only silences the <audio> element (audio.muted). It never pauses or restarts
     the track, so the music keeps progressing while muted and unmuting is instant.
   - Switching to dark mode stops the stars and pauses the music; returning to light
     mode waits WAIT_MS again and then resumes from where it left off.
   - If the browser refuses audible autoplay (no click/tap/key yet), the track still
     starts on time but silently, and becomes audible on the visitor's first interaction.
*/
(function (App) {
  'use strict';

  var WAIT_MS = 4000;                 // time in light mode before stars + music start
  var STAR_COUNT_PER_SIDE = 34;
  var MUSIC_SRC = 'assets/music/amongus.mp3';
  var TARGET_VOLUME = 0.28;
  var FADE_MS = 5000;
  var MUTE_KEY = 'backgroundMusicMuted';

  var startTimer = null;   // the WAIT_MS countdown
  var fadeTimer = null;    // volume fade-in
  var active = false;      // stars + music are running
  var audio = null;
  var muted = false;       // the visitor's choice (saved in localStorage)
  var autoplayBlocked = false; // playing silently until the first interaction
  var waveTimer = null;    // drives the waveform bars while music is audible
  var BAR_MAX_PX = 14;     // tallest a bar can get
  var BAR_MIN_PX = 4;      // resting / minimum bar height

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function makeStar(zone) {
    var star = document.createElement('span');
    star.className = 'light-star';
    star.setAttribute('aria-hidden', 'true');

    // Randomly mix the four light-theme symbols.
    var symbols = ['★', '✦', '✶', '+'];
    star.textContent = symbols[Math.floor(Math.random() * symbols.length)];

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

  function isLight() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function loadMuteState() {
    try { muted = localStorage.getItem(MUTE_KEY) === 'true'; } catch (e) { muted = false; }
  }

  // In dark theme there is no music, so the button is shown muted and disabled.
  // The visitor's saved choice (`muted`) is left alone and comes back in light mode.
  function updateMuteButton() {
    var button = document.getElementById('muteBtn');
    if (!button) return;

    var dark = !isLight();
    var showMuted = dark || muted;
    var label = dark
      ? 'Music is off in dark theme'
      : (muted ? 'Unmute background music' : 'Mute background music');

    button.disabled = dark;
    button.setAttribute('aria-pressed', String(showMuted));
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.classList.toggle('is-muted', showMuted);
    syncWave();
  }

  // ---- Waveform bars -------------------------------------------------------
  // Bars dance (new random heights every 100 ms) only while music is actually audible:
  // light theme, running, not muted and not silently autoplaying. Otherwise they rest flat.
  function isAudible() {
    return isLight() && active && !muted && !autoplayBlocked;
  }

  function setBars(randomize) {
    var bars = document.querySelectorAll('#muteBtn .wave-bars i');
    for (var i = 0; i < bars.length; i++) {
      var h = randomize ? Math.max(BAR_MIN_PX, (Math.random() * 0.8 + 0.2) * BAR_MAX_PX) : BAR_MIN_PX;
      bars[i].style.height = h.toFixed(1) + 'px';
    }
  }

  function syncWave() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var shouldAnimate = isAudible() && !reduce;
    if (shouldAnimate && waveTimer === null) {
      setBars(true);
      waveTimer = setInterval(function () { setBars(true); }, 100);
    } else if (!shouldAnimate && waveTimer !== null) {
      clearInterval(waveTimer);
      waveTimer = null;
      setBars(false);
    } else if (!shouldAnimate) {
      setBars(false);
    }
  }

  function prepareAudio() {
    if (audio) return;
    audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = TARGET_VOLUME;
    audio.muted = muted;
  }

  // Fade the volume in. Uses a timestamp + setInterval (not requestAnimationFrame),
  // because browsers freeze requestAnimationFrame in background tabs.
  function fadeIn() {
    clearInterval(fadeTimer);
    audio.volume = 0;
    var startedAt = Date.now();
    fadeTimer = setInterval(function () {
      var progress = Math.min(1, (Date.now() - startedAt) / FADE_MS);
      audio.volume = TARGET_VOLUME * progress;
      if (progress >= 1) { clearInterval(fadeTimer); fadeTimer = null; }
    }, 100);
  }

  // Start / resume playback. Never touches the mute state except to fall back to
  // silent playback when the browser blocks audible autoplay.
  function playAudio() {
    audio.muted = autoplayBlocked ? true : muted;
    var attempt = audio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(function () {
        // Audible autoplay was refused. Muted playback is always allowed, so keep the
        // track running silently; the first user interaction makes it audible.
        autoplayBlocked = true;
        audio.muted = true;
        var silent = audio.play();
        if (silent && typeof silent.catch === 'function') silent.catch(function () {});
        updateMuteButton();
      });
    }
  }

  function startEffect() {
    startTimer = null;
    if (active || !isLight()) return;
    active = true;

    var root = document.getElementById('lightStars');
    if (root) root.classList.add('is-active');

    prepareAudio();
    fadeIn();
    playAudio();
    updateMuteButton();
  }

  function stopEffect() {
    active = false;
    autoplayBlocked = false;
    clearTimeout(startTimer);
    startTimer = null;
    clearInterval(fadeTimer);
    fadeTimer = null;

    var root = document.getElementById('lightStars');
    if (root) root.classList.remove('is-active');

    if (audio) audio.pause();   // position is kept, so light mode resumes where it left off
    syncWave();
  }

  // Called on load and every time data-theme changes.
  function schedule() {
    updateMuteButton();          // keep the button in step with the theme
    if (!isLight()) {
      stopEffect();
      return;
    }
    if (active) return;          // already running: a repeated "light" must not restart anything

    clearTimeout(startTimer);
    prepareAudio();              // begin buffering during the wait
    startTimer = setTimeout(startEffect, WAIT_MS);
  }

  function setMuted(nextMuted) {
    muted = !!nextMuted;
    try { localStorage.setItem(MUTE_KEY, String(muted)); } catch (e) {}
    updateMuteButton();

    // Only silence / un-silence. No pause, no play, no fade: the track keeps progressing.
    if (audio && !autoplayBlocked) audio.muted = muted;
  }

  function toggleMute() {
    if (!isLight()) return;      // no music in dark theme: the button is inert
    setMuted(!muted);
  }

  // Runs on user interaction and when the tab becomes visible again.
  function recover() {
    if (!active || !audio || !isLight()) return;
    if (autoplayBlocked) {
      autoplayBlocked = false;   // we now have a user gesture: make it audible (unless muted)
      audio.muted = muted;
      updateMuteButton();
    }
    if (audio.paused) playAudio();  // e.g. the browser paused it while in the background
    if (fadeTimer === null) audio.volume = TARGET_VOLUME;
  }

  function init() {
    loadMuteState();
    build();
    updateMuteButton();
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

    var muteButton = document.getElementById('muteBtn');
    if (muteButton) muteButton.addEventListener('click', toggleMute);

    // pointerup / touchend / click / keydown are the events browsers count as a user gesture.
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(function (eventName) {
      document.addEventListener(eventName, recover, { passive: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) recover();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.App);
