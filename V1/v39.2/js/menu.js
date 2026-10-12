// /* menu.js
//    The "menu" dropdown in the navigation bar. Closes on outside click. */
// (function (App) {
//   'use strict';
//   var $ = App.$;

//   var button = $('#menuBtn');
//   var panel = $('#menuPanel');

//   function set(open) {
//     panel.hidden = !open;
//     button.setAttribute('aria-expanded', String(open));
//   }

//   button.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
//   document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target)) set(false); });

//   App.menu = { set: set };
// })(window.App);


/* menu.js
   The "menu" dropdown in the navigation bar. Closes on outside click. */
(function (App) {
  'use strict';
  var $ = App.$;

  var button = $('#menuBtn');
  var panel = $('#menuPanel');
  var wrap = button.closest('.menu-wrap') || button.parentElement;
  var closeTimer = null;

  function set(open) {
    clearTimeout(closeTimer);
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }

  button.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
  document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target)) set(false); });
  // Real links inside the panel (e.g. resume) navigate on their own; still close the panel after.
  panel.addEventListener('click', function (e) { if (e.target.closest('a[href]')) set(false); });

  // Open on hover (desktop/mouse users); small delay on leave so moving
  // from the button to the panel doesn't close it.
  wrap.addEventListener('mouseenter', function () { set(true); });
  wrap.addEventListener('mouseleave', function () {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () { set(false); }, 150);
  });

  App.menu = { set: set };
})(window.App);