/* click-sound.js
   Plays a short sound when the user clicks an element with the
   `click-sound` class. Uses event delegation, so it works even for
   elements added to the page later. */
window.App = window.App || {};
(function (App) {
  'use strict';

  var SOUND_SRC = 'assets/music/click.mp3'; // <-- change to your file's path
  var VOLUME = 0.12;                          // 0 to 1
  var SELECTOR = '.click-sound';             // class that gets the sound

  var base = new Audio(SOUND_SRC);
  base.preload = 'auto';
  base.volume = VOLUME;

  function play() {
    var node = base.cloneNode();
    node.volume = VOLUME;
    node.play().catch(function () {});
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest(SELECTOR)) play();
  }, { passive: true });

  App.clickSound = { play: play };
})(window.App);