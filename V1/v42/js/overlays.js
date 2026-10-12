/* overlays.js
   Opens and closes the two popups (keyboard shortcuts, terminal) and manages focus.
   The shortcuts popup moves focus to its close button and gives it back on close. */
(function (App) {
  'use strict';
  var $ = App.$;

  var shortcutsOverlay = $('#shortcutsOverlay');
  var terminalOverlay = $('#terminalOverlay');
  var lastFocus = null;

  function closeAll() {
    var shortcutsWereOpen = !shortcutsOverlay.hidden;
    shortcutsOverlay.hidden = true;
    terminalOverlay.hidden = true;
    App.menu.set(false);
    if (shortcutsWereOpen && lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function openShortcuts() {
    var previous = document.activeElement;
    closeAll();
    lastFocus = previous;
    shortcutsOverlay.hidden = false;
    var close = $('.sc-close');
    if (close) close.focus();
  }

  function openTerminal() {
    closeAll();
    terminalOverlay.hidden = false;
    App.terminal.ensureWelcome();
    setTimeout(function () { $('#termIn').focus(); }, 30);
  }

  $('#openShortcuts').addEventListener('click', openShortcuts);
  $('#openTerminal').addEventListener('click', openTerminal);
  [shortcutsOverlay, terminalOverlay].forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-close]')) closeAll();
    });
  });

  App.overlays = {
    openShortcuts: openShortcuts,
    openTerminal: openTerminal,
    closeAll: closeAll,
    isShortcutsOpen: function () { return !shortcutsOverlay.hidden; }
  };
})(window.App);
