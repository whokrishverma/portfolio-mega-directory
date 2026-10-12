/* utils.js
   Creates the shared App namespace, DOM helpers and the toast message.
   Every other file attaches its public functions to window.App. */
window.App = window.App || {};
(function (App) {
  'use strict';

  App.$ = function (selector, root) { return (root || document).querySelector(selector); };
  App.$$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  var timer;
  App.toast = function (message) {
    var el = App.$('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(function () { el.hidden = true; }, 2600);
  };
})(window.App);
