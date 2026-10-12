/* router.js
   Path-based router using the History API: / (home), /about, /writing, /projects.
   Shows one <section data-view> at a time, highlights the active nav pill, can scroll
   to a section (Projects, Contacts) after navigating, and intercepts clicks on internal
   links so navigation doesn't trigger a full page reload. */
(function (App) {
  'use strict';
  var $$ = App.$$;

  var known = {};
  App.config.routes.forEach(function (r) { known[r] = true; });
  var pendingScroll = null;

  function current() {
    var path = location.pathname.replace(/\/+$/, '') || '/';
    return known[path] ? path : '/';
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
    var same = location.pathname.replace(/\/+$/, '') === route || (route === '/' && location.pathname === '/');
    if (same) { render(); return; }
    history.pushState(null, '', route);
    render();
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

  // Intercept clicks on same-origin links so internal navigation uses pushState
  // instead of a full page reload. Leaves external links, downloads, new-tab
  // links (target="_blank") and modified clicks (cmd/ctrl/shift-click, middle-click) alone.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    if (link.hasAttribute('data-scroll') || link.hasAttribute('data-action')) return; // handled by actions.js

    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (!known[url.pathname.replace(/\/+$/, '') || '/']) return;

    e.preventDefault();
    go(url.pathname.replace(/\/+$/, '') || '/');
  });

  window.addEventListener('popstate', render);
  App.router = { current: current, render: render, go: go, goSection: goSection };
})(window.App);
