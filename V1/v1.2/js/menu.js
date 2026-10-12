/* menu.js
   The "menu" dropdown in the navigation bar. Closes on outside click. */
(function (App) {
  'use strict';
  var $ = App.$;

  var button = $('#menuBtn');
  var panel = $('#menuPanel');

  function set(open) {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }

  button.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
  document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target)) set(false); });

  App.menu = { set: set };
})(window.App);
