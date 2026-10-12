/* resume.js
   Wires the resume PDF (path set once in js/config.js -> resumePdf) into the /resume view:
   the inline preview iframe and the "Download PDF" button both point at the same file.
   Drop your actual PDF at that path (default: assets/resume.pdf) — nothing else to change. */
(function (App) {
  'use strict';
  var $ = App.$;

  var frame = $('#resumeFrame');
  var downloadBtn = $('#resumeDownload');
  var src = App.config.resumePdf;

  if (downloadBtn) downloadBtn.setAttribute('href', src);

  // Load the PDF into the iframe lazily, the first time the /resume view is opened,
  // rather than on every page load.
  var loaded = false;
  function ensureLoaded() {
    if (loaded || !frame) return;
    loaded = true;
    frame.setAttribute('src', src);
  }

  window.addEventListener('hashchange', function () {
    if (App.router.current() === '/resume') ensureLoaded();
  });
  if (App.router.current() === '/resume') ensureLoaded();
})(window.App);
