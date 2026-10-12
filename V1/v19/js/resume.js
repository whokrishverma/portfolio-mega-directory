/* resume.js
   Renders the resume PDF (path set once in js/config.js -> resumePdf) into the /resume view
   using PDF.js (loaded via CDN in index.html): a canvas preview with a floating toolbar
   (thumbnails, page nav, rotate, zoom incl. fit-width/fit-page, text search, and freehand
   annotation) plus a standalone "Download PDF" button. Drop your actual PDF at that path
   (default: assets/resume.pdf) — nothing else to change.

   Annotations: strokes are stored per page in PDF user-space coordinates (via the PDF.js
   viewport's convertToPdfPoint/convertToViewportPoint), so they stay aligned with the page
   across zoom, fit mode and rotation changes. They live only in memory for this session —
   nothing is persisted or saved into the PDF file. */
(function (App) {
  'use strict';
  var $ = App.$;

  var wrap = $('#resumeFrameWrap');
  var pageArea = $('#resumePageArea');
  var pageInner = $('#resumePageInner');
  var canvas = $('#resumeCanvas');
  var textLayerDiv = $('#resumeTextLayer');
  var annotationCanvas = $('#resumeAnnotationLayer');
  var statusEl = $('#resumeStatus');
  var downloadBtn = $('#resumeDownload');
  var prevBtn = $('#resumePrev');
  var nextBtn = $('#resumeNext');
  var rotateCcwBtn = $('#resumeRotateCcw');
  var rotateCwBtn = $('#resumeRotateCw');
  var zoomInBtn = $('#resumeZoomIn');
  var zoomOutBtn = $('#resumeZoomOut');
  var zoomSelect = $('#resumeZoomSelect');
  var pageNumEl = $('#resumePageNum');
  var pageCountEl = $('#resumePageCount');
  var searchToggleBtn = $('#resumeSearchToggle');
  var searchPanel = $('#resumeSearchPanel');
  var searchInput = $('#resumeSearchInput');
  var searchResultEl = $('#resumeSearchResult');
  var annotateToggleBtn = $('#resumeAnnotateToggle');
  var annotatePanel = $('#resumeAnnotatePanel');
  var annotateColorBtns = App.$$('.resume-annotate-color');
  var annotateUndoBtn = $('#resumeAnnotateUndo');
  var annotateClearBtn = $('#resumeAnnotateClear');
  var thumbsToggleBtn = $('#resumeThumbsToggle');
  var thumbsPanel = $('#resumeThumbs');
  var src = App.config.resumePdf;

  if (downloadBtn) downloadBtn.setAttribute('href', src);
  if (!canvas || !wrap || !pageInner) return;

  var ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];
  var ctx = canvas.getContext('2d');
  var pdfDoc = null;
  var currentPage = 1;
  var zoomIndex = 2; // 1.0
  var fitMode = null; // null | 'fit-width' | 'fit-page'
  var rotation = 0; // degrees, multiple of 90
  var renderToken = 0;
  var loaded = false;
  var failed = false;
  var pageTextCache = {}; // pageNumber -> lowercase text, filled lazily while searching
  var thumbsBuilt = false;
  var thumbsVisible = false;

  var annotationCtx = annotationCanvas ? annotationCanvas.getContext('2d') : null;
  var annotations = {}; // pageNumber -> array of { color, width, points: [{x, y}] } in PDF user space
  var annotateMode = false;
  var activeStroke = null;
  var penColor = '#ff4d4f';
  var penWidth = 3; // in PDF user-space units, so it scales naturally with zoom
  var currentViewport = null;

  function setStatus(text) {
    if (!statusEl) return;
    if (text) {
      statusEl.textContent = text;
      statusEl.hidden = false;
      pageInner.hidden = true;
    } else {
      statusEl.hidden = true;
      pageInner.hidden = false;
    }
  }

  function closePopovers(except) {
    if (searchPanel && except !== searchPanel) {
      searchPanel.hidden = true;
      if (searchToggleBtn) searchToggleBtn.setAttribute('aria-expanded', 'false');
    }
    // The annotate panel is intentionally left out here: it stays open for the whole
    // annotate session, since drawing means clicking into the page itself.
  }

  function updateControls() {
    if (pageNumEl) pageNumEl.textContent = String(currentPage);
    if (pageCountEl) pageCountEl.textContent = pdfDoc ? String(pdfDoc.numPages) : '–';
    if (zoomSelect) zoomSelect.value = fitMode || String(ZOOM_STEPS[zoomIndex]);
    if (prevBtn) prevBtn.disabled = !pdfDoc || currentPage <= 1;
    if (nextBtn) nextBtn.disabled = !pdfDoc || currentPage >= pdfDoc.numPages;
    if (zoomOutBtn) zoomOutBtn.disabled = !fitMode && zoomIndex <= 0;
    if (zoomInBtn) zoomInBtn.disabled = !fitMode && zoomIndex >= ZOOM_STEPS.length - 1;
    updateActiveThumb();
  }

  function updateActiveThumb() {
    if (!thumbsPanel) return;
    var buttons = thumbsPanel.querySelectorAll('.resume-thumb');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.toggle('is-active', Number(buttons[i].getAttribute('data-page')) === currentPage);
    }
  }

  function renderPage(pageNumber) {
    if (!pdfDoc) return;
    var token = ++renderToken;

    pdfDoc.getPage(pageNumber).then(function (page) {
      if (token !== renderToken) return;

      var containerWidth = (pageArea ? pageArea.clientWidth : wrap.clientWidth) - 32;
      var containerHeight = (pageArea ? pageArea.clientHeight : wrap.clientHeight) - 96;
      var baseViewport = page.getViewport({ scale: 1, rotation: rotation });
      var fitWidthScale = containerWidth > 0 ? containerWidth / baseViewport.width : 1;
      var fitPageScale = containerHeight > 0
        ? Math.min(fitWidthScale, containerHeight / baseViewport.height)
        : fitWidthScale;
      var scale = fitMode === 'fit-page' ? fitPageScale
        : fitMode === 'fit-width' ? fitWidthScale
        : fitWidthScale * ZOOM_STEPS[zoomIndex];
      var dpr = window.devicePixelRatio || 1;
      var viewport = page.getViewport({ scale: scale, rotation: rotation });
      var displayWidth = Math.ceil(viewport.width);
      var displayHeight = Math.ceil(viewport.height);

      canvas.width = Math.ceil(viewport.width * dpr);
      canvas.height = Math.ceil(viewport.height * dpr);
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
      pageInner.style.width = displayWidth + 'px';
      pageInner.style.height = displayHeight + 'px';

      var renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
      };

      page.render(renderContext).promise.then(function () {
        if (token !== renderToken) return;
        setStatus(null);
        updateControls();
      });

      // Transparent, selectable text overlay matching the canvas rendering exactly.
      if (textLayerDiv && window.pdfjsLib.renderTextLayer) {
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = displayWidth + 'px';
        textLayerDiv.style.height = displayHeight + 'px';

        window.pdfjsLib.renderTextLayer({
          textContentSource: page.streamTextContent(),
          container: textLayerDiv,
          viewport: viewport
        }).promise.catch(function () { /* selection layer is best-effort */ });
      }

      // Annotation overlay: sized to match the canvas exactly, redrawn from stored strokes.
      if (annotationCanvas) {
        annotationCanvas.width = Math.ceil(viewport.width * dpr);
        annotationCanvas.height = Math.ceil(viewport.height * dpr);
        annotationCanvas.style.width = displayWidth + 'px';
        annotationCanvas.style.height = displayHeight + 'px';
      }
      currentViewport = viewport;
      redrawAnnotations();
    });
  }

  function redrawAnnotations() {
    if (!annotationCtx || !annotationCanvas || !currentViewport) return;
    var dpr = window.devicePixelRatio || 1;
    annotationCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    annotationCtx.clearRect(0, 0, annotationCanvas.width / dpr, annotationCanvas.height / dpr);
    var strokes = annotations[currentPage] || [];
    strokes.forEach(drawStroke);
  }

  function drawStroke(stroke) {
    if (!annotationCtx || !currentViewport || !stroke.points.length) return;
    var pts = stroke.points.map(function (p) { return currentViewport.convertToViewportPoint(p.x, p.y); });
    annotationCtx.strokeStyle = stroke.color;
    annotationCtx.lineWidth = Math.max(1, stroke.width * currentViewport.scale);
    annotationCtx.lineCap = 'round';
    annotationCtx.lineJoin = 'round';
    annotationCtx.beginPath();
    annotationCtx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) {
      // A tap with no drag: draw a small dot rather than nothing.
      annotationCtx.lineTo(pts[0][0] + 0.01, pts[0][1] + 0.01);
    } else {
      for (var i = 1; i < pts.length; i += 1) annotationCtx.lineTo(pts[i][0], pts[i][1]);
    }
    annotationCtx.stroke();
  }

  function goToPage(pageNumber) {
    if (!pdfDoc) return;
    currentPage = Math.min(Math.max(pageNumber, 1), pdfDoc.numPages);
    renderPage(currentPage);
  }

  function setZoom(nextIndex) {
    fitMode = null;
    zoomIndex = Math.min(Math.max(nextIndex, 0), ZOOM_STEPS.length - 1);
    renderPage(currentPage);
  }

  function setZoomValue(value) {
    if (value === 'fit-width' || value === 'fit-page') {
      fitMode = value;
      renderPage(currentPage);
      return;
    }
    var index = ZOOM_STEPS.indexOf(Number(value));
    setZoom(index === -1 ? 2 : index);
  }

  function rotateBy(delta) {
    rotation = ((rotation + delta) % 360 + 360) % 360;
    renderPage(currentPage);
  }

  function getPageSearchData(pageNumber) {
    if (pageTextCache[pageNumber] !== undefined) {
      return Promise.resolve(pageTextCache[pageNumber]);
    }
    return pdfDoc.getPage(pageNumber).then(function (page) {
      return page.getTextContent();
    }).then(function (content) {
      var strings = content.items.map(function (item) { return item.str || ''; });
      // PDF text extraction splits words across items unpredictably (kerning, fonts),
      // so a forced-space join can break mid-word matches. Keep both a spaced and a
      // tight (whitespace-stripped) version and match against whichever fits.
      var data = {
        spaced: strings.join(' ').toLowerCase().replace(/\s+/g, ' '),
        tight: strings.join('').toLowerCase().replace(/\s+/g, '')
      };
      pageTextCache[pageNumber] = data;
      return data;
    });
  }

  function runSearch(query) {
    var normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    var tightQuery = normalizedQuery.replace(/\s+/g, '');
    if (!pdfDoc || !normalizedQuery) {
      if (searchResultEl) searchResultEl.textContent = '';
      return;
    }
    if (searchResultEl) searchResultEl.textContent = 'Searching…';

    var pageNumbers = [];
    for (var i = 1; i <= pdfDoc.numPages; i += 1) pageNumbers.push(i);

    var searchToken = normalizedQuery;
    function checkPage(index) {
      if (searchInput && searchInput.value.trim().toLowerCase().replace(/\s+/g, ' ') !== searchToken) return; // stale
      if (index >= pageNumbers.length) {
        if (searchResultEl) searchResultEl.textContent = 'No results';
        return;
      }
      var pageNumber = pageNumbers[index];
      getPageSearchData(pageNumber).then(function (data) {
        if (searchInput && searchInput.value.trim().toLowerCase().replace(/\s+/g, ' ') !== searchToken) return;
        if (data.spaced.indexOf(normalizedQuery) !== -1 || data.tight.indexOf(tightQuery) !== -1) {
          if (searchResultEl) searchResultEl.textContent = 'Page ' + pageNumber;
          goToPage(pageNumber);
        } else {
          checkPage(index + 1);
        }
      });
    }
    checkPage(0);
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goToPage(currentPage - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goToPage(currentPage + 1); });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { setZoom(zoomIndex - 1); });
  if (zoomInBtn) zoomInBtn.addEventListener('click', function () { setZoom(zoomIndex + 1); });
  if (zoomSelect) zoomSelect.addEventListener('change', function () { setZoomValue(Number(zoomSelect.value)); });
  if (rotateCcwBtn) rotateCcwBtn.addEventListener('click', function () { rotateBy(-90); });
  if (rotateCwBtn) rotateCwBtn.addEventListener('click', function () { rotateBy(90); });

  if (searchToggleBtn && searchPanel) {
    searchToggleBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      var willOpen = searchPanel.hidden;
      closePopovers(willOpen ? searchPanel : null);
      searchPanel.hidden = !willOpen;
      searchToggleBtn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen && searchInput) searchInput.focus();
    });
  }
  if (searchInput) {
    var searchDebounce = null;
    searchInput.addEventListener('input', function () {
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(function () { runSearch(searchInput.value); }, 300);
    });
    searchInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') runSearch(searchInput.value);
      if (event.key === 'Escape') { searchPanel.hidden = true; searchToggleBtn.focus(); }
    });
  }

  function setAnnotateMode(on) {
    annotateMode = on;
    if (annotatePanel) annotatePanel.hidden = !on;
    if (annotateToggleBtn) annotateToggleBtn.setAttribute('aria-pressed', String(on));
    if (wrap) wrap.classList.toggle('is-annotating', on);
    if (on) closePopovers(null); // close search etc. so they don't sit on top while drawing
  }

  if (annotateToggleBtn) {
    annotateToggleBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      setAnnotateMode(!annotateMode);
    });
  }

  annotateColorBtns.forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      event.stopPropagation();
      penColor = btn.getAttribute('data-color');
      annotateColorBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
    });
  });

  if (annotateUndoBtn) {
    annotateUndoBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      var strokes = annotations[currentPage];
      if (strokes && strokes.length) strokes.pop();
      redrawAnnotations();
    });
  }

  if (annotateClearBtn) {
    annotateClearBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      annotations[currentPage] = [];
      redrawAnnotations();
    });
  }

  if (annotatePanel) {
    annotatePanel.addEventListener('click', function (event) { event.stopPropagation(); });
  }

  // Freehand drawing on the annotation canvas, mapped into PDF user-space so strokes
  // stay correctly placed across zoom, fit mode and rotation changes.
  function pointerToPdfPoint(event) {
    var rect = annotationCanvas.getBoundingClientRect();
    return currentViewport.convertToPdfPoint(event.clientX - rect.left, event.clientY - rect.top);
  }

  function endStroke() {
    if (!activeStroke) return;
    if (!annotations[currentPage]) annotations[currentPage] = [];
    annotations[currentPage].push(activeStroke);
    activeStroke = null;
  }

  if (annotationCanvas) {
    annotationCanvas.addEventListener('pointerdown', function (event) {
      if (!annotateMode || !currentViewport) return;
      event.preventDefault();
      annotationCanvas.setPointerCapture(event.pointerId);
      var p = pointerToPdfPoint(event);
      activeStroke = { color: penColor, width: penWidth, points: [{ x: p[0], y: p[1] }] };
    });
    annotationCanvas.addEventListener('pointermove', function (event) {
      if (!annotateMode || !activeStroke) return;
      var p = pointerToPdfPoint(event);
      activeStroke.points.push({ x: p[0], y: p[1] });
      redrawAnnotations();
      drawStroke(activeStroke);
    });
    annotationCanvas.addEventListener('pointerup', endStroke);
    annotationCanvas.addEventListener('pointercancel', endStroke);
  }

  function buildThumbnails() {
    if (thumbsBuilt || !pdfDoc || !thumbsPanel) return;
    thumbsBuilt = true;
    var THUMB_WIDTH = 96;

    var _loop = function (pageNumber) {
      pdfDoc.getPage(pageNumber).then(function (page) {
        var baseViewport = page.getViewport({ scale: 1 });
        var scale = THUMB_WIDTH / baseViewport.width;
        var viewport = page.getViewport({ scale: scale });

        var thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = Math.ceil(viewport.width);
        thumbCanvas.height = Math.ceil(viewport.height);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'resume-thumb';
        btn.setAttribute('data-page', String(pageNumber));
        btn.setAttribute('aria-label', 'Go to page ' + pageNumber);
        btn.appendChild(thumbCanvas);
        var label = document.createElement('span');
        label.className = 'resume-thumb-num';
        label.textContent = String(pageNumber);
        btn.appendChild(label);
        btn.addEventListener('click', function () { goToPage(pageNumber); });
        thumbsPanel.appendChild(btn);

        page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport: viewport }).promise.then(function () {
          updateActiveThumb();
        });
      });
    };
    for (var pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) _loop(pageNumber);
  }

  if (thumbsToggleBtn && thumbsPanel) {
    thumbsToggleBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      thumbsVisible = !thumbsVisible;
      thumbsPanel.hidden = !thumbsVisible;
      thumbsToggleBtn.setAttribute('aria-expanded', String(thumbsVisible));
      thumbsToggleBtn.setAttribute('aria-pressed', String(thumbsVisible));
      if (thumbsVisible) {
        buildThumbnails();
        renderPage(currentPage); // container width changed, re-fit
      }
    });
  }

  document.addEventListener('click', function () { closePopovers(null); });

  window.addEventListener('resize', function () {
    if (pdfDoc) renderPage(currentPage);
  });

  // Load the PDF lazily, the first time the /resume view is opened, rather than on every page load.
  function ensureLoaded() {
    if (loaded || failed) return;
    loaded = true;
    setStatus('Loading resume…');

    if (!window.pdfjsLib) {
      failed = true;
      setStatus('Could not load the PDF viewer.');
      return;
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    window.pdfjsLib.getDocument(src).promise.then(function (doc) {
      pdfDoc = doc;
      currentPage = 1;
      renderPage(currentPage);
    }, function () {
      failed = true;
      setStatus('Could not load the resume PDF.');
    });
  }

  window.addEventListener('hashchange', function () {
    if (App.router.current() === '/resume') ensureLoaded();
  });
  if (App.router.current() === '/resume') ensureLoaded();
})(window.App);
