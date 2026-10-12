/* loadout.js
   Filter tabs (All / Hardware / Software / Browser) on the Loadout page.
   Toggles which .loadout-shot / .loadout-section blocks are visible. */
(function (App) {
  'use strict';
  var $$ = App.$$;

  var buttons = $$('.loadout-filter');
  var groups = $$('[data-loadout-group]');
  if (!buttons.length) return;

  function apply(filter) {
    buttons.forEach(function (btn) {
      var active = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    groups.forEach(function (el) {
      el.hidden = !(filter === 'all' || el.getAttribute('data-loadout-group') === filter);
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () { apply(btn.getAttribute('data-filter')); });
  });
})(window.App);
