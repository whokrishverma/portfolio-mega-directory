/* router.js
   Tiny hash router: #/ (home), #/about, #/writing. Shows one <section data-view> at a time,
   highlights the active nav pill and can scroll to a section (Projects, Contacts) after navigating. */
(function (App) {
  'use strict';
  var $$ = App.$$;

  var known = {};
  App.config.routes.forEach(function (r) { known[r] = true; });
  var pendingScroll = null;

  function current() {
    var hash = location.hash.replace(/^#/, '') || '/';
    return known[hash] ? hash : '/';
  }

  function render() {
    var route = current();
    $$('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== route; });
    $$('.pill[data-route]').forEach(function (pill) {
      var active = pill.getAttribute('data-route') === route;
      pill.classList.toggle('active', active);
      if (active) pill.setAttribute('aria-current', 'page'); else pill.removeAttribute('aria-current');
    });
    if (pendingScroll) {
      var target = document.getElementById(pendingScroll);
      pendingScroll = null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function go(route) {
    var same = location.hash.replace(/^#/, '') === route || (route === '/' && !location.hash);
    if (same) render(); else location.hash = '#' + route;
  }

  function goSection(id) {
    if (current() === '/') {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      pendingScroll = id;
      go('/');
    }
  }

  window.addEventListener('hashchange', render);
  App.router = { current: current, render: render, go: go, goSection: goSection };
})(window.App);
