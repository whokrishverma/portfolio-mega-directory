/* writing.js
   Builds the list of posts on the Writing page (#/writing) from App.config.posts, which is generated
   from the Markdown files in posts/. Nothing to edit here to add a post: add a file in posts/ instead. */
(function (App) {
  'use strict';
  var $ = App.$;

  var list = $('#postList');
  if (!list) return;

  // Small square thumbnails, one per `cover:` value (the big banner on the post page is in posts.js).
  var thumbs = {
    wave: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="#0e1018"/><g stroke="#6f7aa8" stroke-width="1.2" fill="none" opacity=".9"><path d="M8 78 Q30 20 52 50 T92 22"/><path d="M8 84 Q34 40 56 62 T92 44" stroke="#c46a6a"/></g><g fill="#8a90b8"><rect x="10" y="12" width="34" height="3" rx="1.5"/><rect x="10" y="19" width="22" height="2" rx="1"/></g></svg>',
    grid: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="#0b0d14"/><g stroke="#3a3f57" stroke-width="1" fill="none"><path d="M50 8v84M8 50h84"/><rect x="38" y="38" width="24" height="24" rx="3" stroke="#8a90b8"/></g><g fill="#8a90b8"><circle cx="50" cy="14" r="3"/><circle cx="50" cy="86" r="3"/><circle cx="14" cy="50" r="3"/><circle cx="86" cy="50" r="3"/></g></svg>',
    terrain: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="#c9df9a"/><path d="M0 62 L22 38 L40 56 L62 26 L100 64 V100 H0Z" fill="#5f9a86"/><path d="M0 76 L26 52 L48 72 L72 46 L100 74 V100 H0Z" fill="#2f6b5c"/><path d="M0 90 L30 70 L60 88 L100 66 V100 H0Z" fill="#1c4a44"/></svg>'
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // "2026-09-12" -> "Sep 12, 2026"
  function shortDate(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  var posts = App.config.posts || [];

  if (!posts.length) {
    list.innerHTML = '<p class="writing-empty">Nothing here yet — the first post is on its way.</p>';
    return;
  }

  list.innerHTML = posts.map(function (p) {
    return '<a class="post" href="#/writing/' + encodeURIComponent(p.slug) + '" data-date="' + esc(p.date) + '">' +
      '<div class="thumb" aria-hidden="true">' + (thumbs[p.cover] || thumbs.wave) + '</div>' +
      '<div>' +
        '<div class="post-title">' + esc(p.title) + '</div>' +
        '<div class="post-desc">' + esc(p.desc) + '</div>' +
        '<div class="post-date">' + shortDate(p.date) + '</div>' +
      '</div>' +
    '</a>';
  }).join('');
})(window.App);
