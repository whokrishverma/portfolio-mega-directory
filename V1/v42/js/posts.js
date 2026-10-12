/* posts.js
   Renders a single writing post into the #/writing/<slug> view: breadcrumb header (with its
   own shortcuts + theme buttons, since the post view hides the regular nav), title, relative
   date, a decorative cover banner, and the post body. Math in the body (\( ... \) inline,
   \[ ... \] block) is rendered by KaTeX once the content is in the DOM.
   Post content lives in App.config.posts — edit there, not here. */
(function (App) {
  'use strict';
  var $ = App.$;

  var byId = {};
  App.config.posts.forEach(function (p) { byId[p.slug] = p; });

  var titleEl = $('#postTitle');
  var metaEl = $('#postMeta');
  var coverEl = $('#postCover');
  var bodyEl = $('#postBody');
  var crumbEl = $('#postCrumb');

  // ---------- Date formatting ----------
  function formatDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function relative(iso) {
    var then = new Date(iso + 'T00:00:00').getTime();
    var days = Math.round((Date.now() - then) / 86400000);
    if (days <= 0) return 'today';
    if (days < 30) return days + 'd ago';
    var months = Math.round(days / 30.44);
    if (months < 12) return months + 'mo ago';
    var years = Math.round(months / 12);
    return years + 'y ago';
  }

  // ---------- Cover banners (decorative, no image files needed) ----------
  var covers = {
    wave: '<svg viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" role="img" aria-label="">' +
      '<rect width="900" height="280" fill="#0e1018"/>' +
      '<g stroke="#6f7aa8" stroke-width="2.2" fill="none" opacity=".9">' +
      '<path d="M40 210 Q220 70 380 150 T820 90"/>' +
      '<path d="M40 235 Q250 130 420 190 T820 130" stroke="#c46a6a"/>' +
      '</g></svg>',
    grid: '<svg viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" role="img" aria-label="">' +
      '<rect width="900" height="280" fill="#0b0d14"/>' +
      '<g stroke="#3a3f57" stroke-width="1.4" fill="none">' +
      '<path d="M450 20v240M40 140h820"/>' +
      '<rect x="390" y="80" width="120" height="120" rx="8" stroke="#8a90b8"/>' +
      '</g><g fill="#8a90b8"><circle cx="450" cy="36" r="6"/><circle cx="450" cy="244" r="6"/><circle cx="56" cy="140" r="6"/><circle cx="844" cy="140" r="6"/></g></svg>',
    terrain: '<svg viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" role="img" aria-label="">' +
      '<rect width="900" height="280" fill="#c9df9a"/>' +
      '<path d="M0 170 L200 100 L360 155 L560 70 L900 175 V280 H0Z" fill="#5f9a86"/>' +
      '<path d="M0 205 L230 145 L430 195 L650 125 L900 205 V280 H0Z" fill="#2f6b5c"/>' +
      '<path d="M0 245 L260 190 L520 240 L900 180 V280 H0Z" fill="#1c4a44"/>' +
      '</svg>'
  };

  // ---------- Body rendering ----------
  function renderBody(post) {
    bodyEl.innerHTML = post.sections.map(function (section) {
      var heading = section.heading ? '<h2>' + section.heading + '</h2>' : '';
      var paras = section.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
      return '<section class="post-section">' + heading + paras + '</section>';
    }).join('');

    if (window.renderMathInElement) {
      window.renderMathInElement(bodyEl, {
        delimiters: [
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }
  }

  // Renders the post for `slug`. Returns false if no such post exists (router redirects to /writing).
  function render(slug) {
    var post = byId[slug];
    if (!post) return false;

    document.title = post.title + ' — Krish Verma';
    crumbEl.textContent = post.title;
    titleEl.textContent = post.title;
    metaEl.textContent = formatDate(post.date) + ' (' + relative(post.date) + ')';
    coverEl.innerHTML = covers[post.cover] || covers.wave;
    renderBody(post);
    return true;
  }

  // Post header's own shortcuts + theme buttons (the regular nav, and its buttons, are hidden here).
  var postShortcutsBtn = $('#openShortcutsPost');
  var postThemeBtn = $('#themeBtnPost');
  if (postShortcutsBtn) postShortcutsBtn.addEventListener('click', function () { App.overlays.openShortcuts(); });
  if (postThemeBtn) postThemeBtn.addEventListener('click', function () { App.theme.toggle(); });

  App.posts = { render: render };
})(window.App);
