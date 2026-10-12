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

  var commands = {
    help: function () { return 'help  whoami  about  projects  socials  theme  date  clear  exit'; },
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
