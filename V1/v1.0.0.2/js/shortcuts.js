/* shortcuts.js
   Global keyboard shortcuts (ignored while typing in a field):
   g then h/a/w/c = home / about / writing / contacts,  t = theme,  ` = terminal,  ? = toggle shortcuts,  Esc = close. */
(function (App) {
  'use strict';
  var $ = App.$;

  var waitingForSecondKey = false;
  var timer;

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // Keep keyboard focus inside the shortcuts popup while it is open.
    if (App.overlays.isShortcutsOpen() && e.key === 'Tab') { e.preventDefault(); $('.sc-close').focus(); return; }

    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea';

    if (e.key === 'Escape') { App.overlays.closeAll(); if (typing) e.target.blur(); return; }
    if (typing) return;

    if (waitingForSecondKey) {
      waitingForSecondKey = false;
      clearTimeout(timer);
      var key = e.key.toLowerCase();
      if (key === 'h') App.router.go('/');
      else if (key === 'a') App.router.go('/about');
      else if (key === 'w') App.router.go('/writing');
      else if (key === 'c') App.router.goSection('contact');
      return;
    }

    if (e.key === '?') { if (App.overlays.isShortcutsOpen()) App.overlays.closeAll(); else App.overlays.openShortcuts(); }
    else if (e.key === 't') { App.theme.toggle(); }
    else if (e.key === '`') { e.preventDefault(); App.overlays.openTerminal(); }
    else if (e.key === 'g') {
      waitingForSecondKey = true;
      timer = setTimeout(function () { waitingForSecondKey = false; }, 900);
    }
  });
})(window.App);
