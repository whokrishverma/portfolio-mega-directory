/* agent-view.js
   Agent View: toggles a full-screen second layer over the website.
   The website (.container) is never unmounted, so scroll position and state survive.
   All visuals are CSS transitions driven by two classes on <html>:
     agent-open  the target state (add = enter, remove = the exact reverse)
     agent-anim  present only while a transition is running, so no will-change / transition
                 rules apply to the site at rest.
   Public API: App.agentView.open() / close() / toggle() / isOpen() */
(function (App) {
  'use strict';

  var root = document.documentElement;
  var ghost = document.getElementById('agentGhost');
  var view = document.getElementById('agentView');
  var shell = document.querySelector('.container');
  if (!ghost || !view || !shell) return;

  var LABEL_OPEN = 'Open Agent View';
  var LABEL_CLOSE = 'Close Agent View';
  var PRESS_MS = 110;    // how long the ghost "acknowledges" the click before the transition starts
  var SETTLE_MS = 1500;  // longest transition (enter: ~1.5s incl. content stagger) before animation rules are dropped

  var isOpen = false;
  var savedY = 0;
  var settleTimer = null;
  var pressTimer = null;

  function reduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function apply(open, opts) {
    if (open === isOpen) return;
    isOpen = open;
    opts = opts || {};

    clearTimeout(settleTimer);
    root.classList.add('agent-anim');

    if (open) {
      savedY = window.pageYOffset;
      root.style.overflow = 'hidden';               // lock the website's scroll; its position is preserved
      shell.inert = true;
      view.inert = false;
      view.scrollTop = 0;
    } else {
      root.style.overflow = '';
      shell.inert = false;
      view.inert = true;
    }

    // Force the current (closed/open) styles to be committed so the change animates instead of jumping.
    void view.offsetWidth;
    root.classList.toggle('agent-open', open);
    root.setAttribute('data-mode', open ? 'agent' : 'site');

    ghost.setAttribute('aria-label', open ? LABEL_CLOSE : LABEL_OPEN);
    ghost.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      view.focus({ preventScroll: true });
    } else {
      if (!opts.keepFocus) ghost.focus({ preventScroll: true });
      // Belt and braces: land back at exactly the same scroll position.
      if (!opts.skipScrollRestore && Math.abs(window.pageYOffset - savedY) > 1) {
        var prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, savedY);
        root.style.scrollBehavior = prev;
      }
    }

    settleTimer = setTimeout(function () {
      root.classList.remove('agent-anim');
    }, reduced() ? 400 : SETTLE_MS);
  }

  function toggle() { apply(!isOpen); }

  // Ghost click: acknowledge first (small press), then start the transition.
  ghost.addEventListener('click', function () {
    if (reduced()) { toggle(); return; }
    ghost.classList.add('is-pressed');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function () {
      ghost.classList.remove('is-pressed');
      toggle();
    }, PRESS_MS);
  });

  // Escape closes Agent View, unless a popup (shortcuts / terminal) is open: that one closes first.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !isOpen) return;
    if (document.querySelector('.overlay:not([hidden])')) return;
    e.preventDefault();
    apply(false);
  }, true);

  // Navigating (browser back/forward, G-shortcuts) leaves Agent View and lets the router do its job.
  window.addEventListener('hashchange', function () {
    if (isOpen) apply(false, { skipScrollRestore: true, keepFocus: true });
  });

  App.agentView = {
    open: function () { apply(true); },
    close: function () { apply(false); },
    toggle: toggle,
    isOpen: function () { return isOpen; }
  };
})(window.App || (window.App = {}));
