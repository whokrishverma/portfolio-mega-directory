/* chess.js
   Fills the Chess page: live stats, record and recent games from chess.com's public API,
   plus your chess-set collection from App.config.chess. Loads once, the first time the page opens. */
(function (App) {
  'use strict';
  var $ = App.$, cfg = App.config.chess || {}, user = (cfg.username || '').trim().toLowerCase();
  var API = 'https://api.chess.com/pub/player/' + encodeURIComponent(user);
  var loaded = false;

  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
  function get(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function renderSets() {
    $('#chessSets').innerHTML = (cfg.sets || []).map(function (s) {
      var img = s.img ? '<img src="' + esc(s.img) + '" alt="' + esc(s.name) + '" loading="lazy">' : '♟️';
      return '<article class="chess-set"><div class="chess-set-img">' + img + '</div><div class="chess-set-body"><b>' + esc(s.name) +
        '</b><em>' + esc([s.origin, s.material].filter(Boolean).join(' · ')) + '</em><p>' + esc(s.note) + '</p></div></article>';
    }).join('');
  }

  function note(msg) { var n = $('#chessNote'); n.textContent = msg; n.hidden = false; }

  function renderProfile(p) {
    if (!p) return;
    var joined = p.joined ? new Date(p.joined * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
    var el = $('#chessProfile');
    el.innerHTML = (p.avatar ? '<img src="' + esc(p.avatar) + '" alt="">' : '') + '<div><b>' + esc(p.username) + '</b>' +
      '<span>' + esc([p.title, p.name, p.followers != null ? p.followers + ' followers' : '', joined && 'joined ' + joined].filter(Boolean).join(' · ')) + '</span></div>';
    el.hidden = false;
  }

  function renderStats(st) {
    var modes = [['chess_rapid', 'rapid'], ['chess_blitz', 'blitz'], ['chess_bullet', 'bullet'], ['chess_daily', 'daily']];
    var cards = '', rec = '';
    modes.forEach(function (m) {
      var s = st[m[0]]; if (!s || !s.last) return;
      var r = s.record || {}, w = r.win || 0, l = r.loss || 0, d = r.draw || 0, t = (w + l + d) || 1;
      cards += '<div class="chess-card"><small>' + m[1] + '</small><strong>' + s.last.rating + '</strong><span>' +
        (s.best ? 'best ' + s.best.rating : '') + '</span></div>';
      rec += '<div class="chess-rec-row"><small><span>' + m[1] + '</span><span>' + w + 'W · ' + d + 'D · ' + l + 'L</span></small><div class="chess-bar">' +
        '<i class="w" style="width:' + w / t * 100 + '%"></i><i class="d" style="width:' + d / t * 100 + '%"></i><i class="l" style="width:' + l / t * 100 + '%"></i></div></div>';
    });
    if (st.tactics && st.tactics.highest) {
      cards += '<div class="chess-card"><small>puzzles</small><strong>' + st.tactics.highest.rating + '</strong><span>highest</span></div>';
    }
    $('#chessRatings').innerHTML = cards || '<div class="chess-skel">No rated games yet.</div>';
    $('#chessRecord').innerHTML = rec;
  }

  function renderGames(games) {
    var rows = games.slice(0, cfg.gamesToShow || 10).map(function (g) {
      var white = g.white.username.toLowerCase() === user, me = white ? g.white : g.black, opp = white ? g.black : g.white;
      var res = me.result === 'win' ? 'W' : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].indexOf(me.result) > -1 ? 'D' : 'L';
      return '<tr><td><span class="chess-res ' + res + '">' + res + '</span></td><td>' + esc(opp.username) + ' (' + opp.rating + ')</td><td>' +
        esc(g.time_class) + '</td><td>' + (white ? 'White' : 'Black') + '</td><td>' + new Date(g.end_time * 1000).toLocaleDateString() +
        '</td><td><a href="' + esc(g.url) + '" target="_blank" rel="noopener">review ↗</a></td></tr>';
    }).join('');
    $('#chessGames').innerHTML = rows || '<tr><td colspan="6" class="chess-skel">No recent games.</td></tr>';
  }

  function recentGames() {
    return get(API + '/games/archives').then(function (a) {
      var months = a.archives.slice(-2).reverse();
      return Promise.all(months.map(function (u) { return get(u); })).then(function (r) {
        return r.reduce(function (all, m) { return all.concat(m.games.slice().reverse()); }, []);
      });
    });
  }

  function load() {
    if (loaded) return; loaded = true;
    renderSets();
    if (!user) {
      var msg = 'Set your chess.com username in js/config.js (chess.username) to show live stats.';
      note(msg); $('#chessRatings').innerHTML = ''; $('#chessGames').innerHTML = '<tr><td colspan="6" class="chess-skel">-</td></tr>';
      return;
    }
    var link = 'https://www.chess.com/member/' + encodeURIComponent(user);
    $('#chessProfileLink').href = link;
    $('#chessChallengeLink').href = link;
    get(API).then(renderProfile).catch(function () {});
    get(API + '/stats').then(renderStats).catch(function () { note('Could not load chess.com stats right now.'); $('#chessRatings').innerHTML = ''; });
    recentGames().then(renderGames).catch(function () { $('#chessGames').innerHTML = '<tr><td colspan="6" class="chess-skel">Could not load games.</td></tr>'; });
  }

  function check() { if (App.router.current() === '/chess') load(); }
  window.addEventListener('hashchange', check);
  check();
})(window.App);
