
/* theme-init.js
   Runs in <head> before the page paints so there is no flash of the wrong theme.
   Defaults to dark (the reference design); a saved choice in localStorage wins. */
(function () {
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved === 'light' || saved === 'dark' ? saved : 'dark');
})();