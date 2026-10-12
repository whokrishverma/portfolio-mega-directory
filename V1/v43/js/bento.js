/* bento.js
   Fills the dynamic parts of the bento grid on the home page:
   the scrolling tech-stack rows, the (decorative) activity grid and the "Latest Post" card,
   and runs the "view more / view less" button that expands the section to the full screen width. */
(function (App) {
  'use strict';
  var $ = App.$;

  /* ---------- Tech-stack marquee: two rows, second one reversed, each set repeated for a seamless loop ---------- */
  function tile(key) {
    var icon = App.techIcons[key];
    return '<span class="tile ' + icon.c + '" aria-hidden="true"><svg viewBox="0 0 48 48">' + icon.s + '</svg></span>';
  }
  function set(keys) { return '<div class="set">' + keys.map(tile).join('') + '</div>'; }

  var row1 = App.config.techStack;
  var row2 = row1.slice().reverse();
  $('#stackRow1').innerHTML = '<div class="track">' + set(row1) + set(row1) + '</div>';
  $('#stackRow2').innerHTML = '<div class="track">' + set(row2) + set(row2) + '</div>';

  /* ---------- Activity grid (decorative; real GitHub data comes in a later step) ---------- */
  var lit = App.config.activityLit, cells = '';
  for (var i = 0; i < 48; i++) {
    cells += '<span class="gh-cell' + (lit[i] ? ' l' + lit[i] : '') + (i > 45 ? ' off' : '') + '"></span>';
  }
  $('#ghGrid').innerHTML = cells;

  /* ---------- Latest post: the newest entry of App.config.posts (posts/*.md, sorted by date) ---------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function timeAgo(days) {
    if (days < 1) return 'today';
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return Math.floor(days / 365) + 'y ago';
  }

  var latest = (App.config.posts || [])[0];
  var latestCard = $('.b-latest');
  if (latest) {
    var date = new Date(latest.date + 'T00:00:00');
    var days = Math.floor((new Date() - date) / 864e5);
    $('#lpTitle').textContent = latest.title;
    $('#lpDate').textContent = MONTHS[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear() + ' (' + timeAgo(days) + ')';
    if (latestCard) latestCard.setAttribute('href', '#/writing/' + encodeURIComponent(latest.slug));
  } else {
    $('#lpTitle').textContent = 'Coming soon';
  }

  /* ---------- view more / view less: the CSS (.is-expanded) does the resizing ---------- */
  var wrap = $('#bentoWrap');
  var toggle = $('#bentoToggle');
  if (wrap && toggle) {
    var label = $('.bento-toggle__label', toggle);
    toggle.addEventListener('click', function () {
      var open = !wrap.classList.contains('is-expanded');
      wrap.classList.toggle('is-expanded', open);
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'collapse' : 'view more';
      // Once it has finished growing, scroll just enough to bring the whole section into view.
      if (open) setTimeout(function () { wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 650);
    });
  }
})(window.App);
