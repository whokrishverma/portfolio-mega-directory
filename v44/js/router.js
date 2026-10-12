/* router.js
   Tiny hash router: #/ (home), #/about, #/writing, and #/writing/<slug> for a single post.
   Shows one <section data-view> at a time, highlights the active nav pill, can scroll to a
   section (Projects, Contacts) after navigating, and swaps the nav header for a post's
   breadcrumb header when a post is open. */
(function (App) {
  'use strict';
  var $$ = App.$$;

  var known = {};
  App.config.routes.forEach(function (r) { known[r] = true; });
  var pendingScroll = null;

  // Parses the current hash into a route (one of App.config.routes, or '/writing/post') and,
  // for a post, the slug after #/writing/.
  function parse() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'writing' && parts[1]) {
      return { route: '/writing/post', slug: decodeURIComponent(parts[1]) };
    }
    var path = '/' + parts.join('/');
    return { route: known[path] ? path : '/', slug: null };
  }

  function current() {
    return parse().route;
  }

  function render() {
    var parsed = parse();
    var route = parsed.route;
    var isPost = route === '/writing/post';

    $$('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== route; });

    var navHeader = document.querySelector('header.nav');
    if (navHeader) navHeader.hidden = isPost;

    var highlightRoute = isPost ? '/writing' : route;
    $$('.pill[data-route]').forEach(function (pill) {
      var active = pill.getAttribute('data-route') === highlightRoute;
      pill.classList.toggle('active', active);
      if (active) pill.setAttribute('aria-current', 'page'); else pill.removeAttribute('aria-current');
    });

    if (isPost && App.posts) {
      var found = App.posts.render(parsed.slug);
      if (!found) { go('/writing'); return; }
    }

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
