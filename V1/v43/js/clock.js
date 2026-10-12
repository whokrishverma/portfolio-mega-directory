/* clock.js
   Live clock in the footer plus the "It's currently ... so I'm probably ..." line in Contacts.
   Uses the time zone set in config.js. */
(function (App) {
  'use strict';
  var $ = App.$;

  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone: App.config.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'numeric', hour12: false });
  } catch (e) { formatter = null; }

  function pad(n) { return ('0' + n).slice(-2); }

  function now() {
    var d = new Date(), p = {};
    if (formatter) formatter.formatToParts(d).forEach(function (part) { p[part.type] = part.value; });
    else p = { hour: d.getHours(), minute: pad(d.getMinutes()), second: pad(d.getSeconds()), day: d.getDate(), month: d.getMonth() + 1 };
    return { h: (+p.hour) % 24, m: pad(p.minute), s: pad(p.second), d: +p.day, mo: +p.month - 1 };
  }

  // What "I'm probably ..." says at each hour of the day.
  function statusFor(h) {
    if (h < 7 || h >= 23) return 'sleeping';
    if (h < 9) return 'getting ready';
    if (h < 13 || (h >= 14 && h < 19)) return 'working';
    if (h < 14) return 'having lunch';
    if (h < 21) return 'working out';
    return 'relaxing';
  }

  function tick() {
    var t = now();
    $('#footClock').textContent = t.d + ' ' + MONTHS[t.mo] + ' ' + pad(t.h) + ':' + t.m;
    $('#ctTime').textContent = pad(t.h % 12 || 12) + ':' + t.m + ' ' + (t.h >= 12 ? 'PM' : 'AM');
    $('#ctStatus').textContent = statusFor(t.h);
  }

  tick();
  setInterval(tick, 1000);
})(window.App);
