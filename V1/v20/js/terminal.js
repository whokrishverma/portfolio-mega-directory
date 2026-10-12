/* terminal.js
   The small fake terminal. Add a command by adding a function to `commands`.
   A command returns the text to print, or null to print nothing. */
(function (App) {
  'use strict';
  var $ = App.$;
  var text = App.config.terminal;

  var out = $('#termOut');

  function print(line, cssClass) {
    var div = document.createElement('div');
    if (cssClass) div.className = cssClass;
    div.textContent = line;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  function ensureWelcome() {
    if (!out.childNodes.length) print(text.welcome, 'dim');
  }

  // Renders the command list as an ASCII box, e.g.:
  // +--------------------------+
  // |    Available Commands    |
  // +--------------------------+
  // | about     - About Me     |
  // | ...                      |
  // +--------------------------+
  function pad(str, width) { return str + ' '.repeat(Math.max(0, width - str.length)); }

  function helpBox() {
    var rows = [
      ['help', 'Show Commands'],
      ['whoami', 'Who Am I'],
      ['about', 'About Me'],
      ['projects', 'My Projects'],
      ['socials', 'Social Links'],
      ['theme', 'Toggle Theme'],
      ['date', 'Current Date'],
      ['clear', 'Clear Terminal'],
      ['exit', 'Exit Terminal']
    ];
    var title = 'Available Commands';
    var nameWidth = rows.reduce(function (w, r) { return Math.max(w, r[0].length); }, 0);
    var lines = rows.map(function (r) { return pad(r[0], nameWidth) + '  - ' + r[1]; });
    var contentWidth = lines.reduce(function (w, l) { return Math.max(w, l.length); }, title.length);

    var border = '+' + '-'.repeat(contentWidth + 2) + '+';
    var leftPad = Math.floor((contentWidth - title.length) / 2);
    var rightPad = contentWidth - title.length - leftPad;
    var titleLine = '| ' + ' '.repeat(leftPad) + title + ' '.repeat(rightPad) + ' |';
    var rowLines = lines.map(function (l) { return '| ' + pad(l, contentWidth) + ' |'; });

    return [border, titleLine, border].concat(rowLines).concat([border]).join('\n');
  }

  var commands = {
    help: function () { return helpBox(); },
    whoami: function () { return text.whoami; },
    about: function () { App.router.go('/about'); return 'Opening about...'; },
    projects: function () { return text.projects; },
    socials: function () { return text.socials; },
    theme: function () { App.theme.toggle(); return 'Theme toggled.'; },
    date: function () { return new Date().toString(); },
    clear: function () { out.textContent = ''; return null; },
    exit: function () { App.overlays.closeAll(); return null; }
  };

  $('#termIn').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var value = this.value.trim();
    this.value = '';
    if (!value) return;
    print('~ % ' + value, 'cmd');
    var run = commands[value.toLowerCase()];
    var result = run ? run() : 'command not found: ' + value + ' (try "help")';
    if (result) print(result);
  });

  App.terminal = { print: print, ensureWelcome: ensureWelcome };
})(window.App);
