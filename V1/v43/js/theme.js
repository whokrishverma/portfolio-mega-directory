/* theme.js
   Dark / light toggle (button in the nav and the T shortcut). The choice is saved in localStorage. */
(function (App) {
  'use strict';

  function toggle() {
    var root = document.documentElement;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }

  App.theme = { toggle: toggle };
  App.$('#themeBtn').addEventListener('click', toggle);
})(window.App);
