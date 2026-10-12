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

  /* ---------- Latest post: taken from the first post (with data-date) on the Writing page ---------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function timeAgo(days) {
    if (days < 1) return 'today';
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return Math.floor(days / 365) + 'y ago';
  }

  var first = $('.post[data-date]');
  if (first) {
    var date = new Date(first.getAttribute('data-date') + 'T00:00:00');
    var days = Math.floor((new Date() - date) / 864e5);
    $('#lpTitle').textContent = $('.post-title', first).textContent;
    $('#lpDate').textContent = MONTHS[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear() + ' (' + timeAgo(days) + ')';
  }

  /* ---------- view more / view less: the whole bento morphs (FLIP) between two compositions ----------
     1. FIRST : measure every card where it is right now (including mid-animation, so clicks can interrupt).
     2. LAST  : flip the .is-expanded class (CSS re-arranges the grid instantly) and measure again.
     3. INVERT + PLAY : animate each card from its old rectangle to its new one (transform only),
        while the whole .bento softens slightly (blur / opacity / depth / saturation) and returns to sharp.
     The wrapper height is animated too, so the content below glides instead of jumping. */
  var wrap = $('#bentoWrap');
  var toggle = $('#bentoToggle');
  if (wrap && toggle) {
    var bento = $('#bento');
    var label = $('.bento-toggle__label', toggle);
    var cards = [].slice.call(bento.querySelectorAll('.b-photo, .b-linkedin, .b-x, .b-waka, .b-github, .b-spotify, .b-stack, .b-status, .b-latest'));
    var EASE = 'cubic-bezier(.32, .72, 0, 1)';   // fast start, long soft landing
    var DUR = 900, STAGGER = 9;                   // ms; stagger is tiny on purpose (max ~70ms)
    var running = [], token = 0;
    var canAnimate = typeof Element.prototype.animate === 'function';
    var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

    function rects() { return cards.map(function (c) { return c.getBoundingClientRect(); }); }

    function setState(open) {
      wrap.classList.toggle('is-expanded', open);
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'collapse' : 'view more';
    }

    toggle.addEventListener('click', function () {
      var open = !wrap.classList.contains('is-expanded');
      var my = ++token;

      if (!canAnimate || reduceMq.matches) {
        setState(open);
        if (open) wrap.scrollIntoView({ block: 'nearest' });
        return;
      }

      // FIRST
      var first = rects();
      var btn0 = toggle.getBoundingClientRect();
      var h0 = wrap.getBoundingClientRect().height;
      running.forEach(function (a) { a.cancel(); });
      running = [];

      // LAST
      bento.classList.add('is-morphing');
      setState(open);
      var last = rects();
      var btn1 = toggle.getBoundingClientRect();
      var h1 = wrap.getBoundingClientRect().height;

      // INVERT + PLAY: cards
      cards.forEach(function (c, i) {
        var f = first[i], l = last[i];
        if (!l.width || !l.height) return;
        var dx = f.left - l.left, dy = f.top - l.top;
        var sx = f.width / l.width, sy = f.height / l.height;
        running.push(c.animate([
          { transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' },
          { transformOrigin: '0 0', transform: 'translate(0,0) scale(1,1)' }
        ], { duration: DUR, delay: i * STAGGER, easing: EASE, fill: 'backwards' }));
      });

      // the "view more" button glides to its new spot instead of snapping
      running.push(toggle.animate([
        { transform: 'translate(' + (btn0.left - btn1.left) + 'px,' + (btn0.top - btn1.top) + 'px)' },
        { transform: 'translate(0,0)' }
      ], { duration: DUR, easing: EASE }));

      // the wrapper's height, so everything below follows smoothly
      var total = DUR + (cards.length - 1) * STAGGER;
      var hAnim = wrap.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: total, easing: EASE });
      running.push(hAnim);

      // the whole bento softens while the layout changes, then comes back fully sharp
      running.push(bento.animate([
        { filter: 'blur(0px) saturate(1)',      opacity: 1,   transform: 'scale(1)',     easing: 'cubic-bezier(.3,0,.4,1)' },
        { filter: 'blur(1.3px) saturate(1.05)', opacity: .93, transform: 'scale(.988)',  offset: .36, easing: 'cubic-bezier(.4,0,.3,1)' },
        { filter: 'blur(.4px) saturate(1.02)',  opacity: .98, transform: 'scale(.997)',  offset: .74, easing: 'cubic-bezier(.4,0,.2,1)' },
        { filter: 'blur(0px) saturate(1)',      opacity: 1,   transform: 'scale(1)' }
      ], { duration: total }));

      hAnim.onfinish = function () {
        if (my !== token) return;
        running = [];
        bento.classList.remove('is-morphing');
        // Once it has finished growing, scroll just enough to bring the whole section into view.
        if (open) wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      };
    });
  }
})(window.App);
