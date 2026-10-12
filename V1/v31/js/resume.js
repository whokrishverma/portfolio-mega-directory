/* resume.js
   Renders the resume PDF (path set once in js/config.js -> resumePdf) into the /resume view
   using PDF.js (loaded via CDN in index.html): a canvas preview with a floating toolbar
   (thumbnails, page nav, rotate, zoom incl. fit-width/fit-page, text search, view-mode
   toggle, and annotate) plus a standalone "Download PDF" button. Drop your actual PDF at
   that path (default: assets/resume.pdf) — nothing else to change.

   View mode: "single" renders just the current page (the classic prev/next experience);
   "continuous" renders every page stacked in the same scrollable area, Chrome-PDF-viewer
   style, so the user can scroll straight through the document at the current zoom level.
   Both modes share one render pipeline keyed by page number (pageRenders/pageViewports),
   so annotations, the text layer and search all work identically in either mode.

   Annotate: toggling "Annotate" extends the same toolbar pill in place with Marker,
   Highlighter, Undo and Redo. Strokes are stored per page in PDF user-space coordinates
   (via the PDF.js viewport's convertToPdfPoint/convertToViewportPoint), so they stay
   aligned with the page across zoom, fit mode, rotation and view-mode changes. Undo/redo
   is a simple per-page stack; drawing a new stroke clears the redo stack, same as any
   editor. Strokes live only in memory for this session — nothing is persisted or saved
   into the PDF file. */
(function (App) {
  'use strict';
  var $ = App.$;

  var wrap = $('#resumeFrameWrap');
  var pageArea = $('#resumePageArea');
  var pageInner = $('#resumePageInner');
  var canvas = $('#resumeCanvas');
  var textLayerDiv = $('#resumeTextLayer');
  var annotationCanvas = $('#resumeAnnotationLayer');
  var continuousEl = $('#resumeContinuous');
  var statusEl = $('#resumeStatus');
  var downloadBtn = $('#resumeDownload');
  var prevBtn = $('#resumePrev');
  var nextBtn = $('#resumeNext');
  var viewModeBtn = $('#resumeViewMode');
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
  var annotateSep = $('#resumeAnnotateSep');
  var annotateTools = $('#resumeAnnotateTools');
  var toolMarkerBtn = $('#resumeToolMarker');
  var toolHighlighterBtn = $('#resumeToolHighlighter');
  var annotateUndoBtn = $('#resumeAnnotateUndo');
  var annotateRedoBtn = $('#resumeAnnotateRedo');
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

  // View mode: 'single' shows one page with prev/next; 'continuous' stacks every page
  // in the scrollable page area. Both modes render through pageRenders/pageViewports
  // below, keyed by page number, so annotation/text-layer/search code doesn't need to
  // know which mode is active.
  var viewMode = 'single';
  var continuousObserver = null;
  var pageRenders = {}; // pageNumber -> { wrapper, canvas, ctx, textLayer, annotationCanvas, annotationCtx }
  var pageViewports = {}; // pageNumber -> the PDF.js viewport last used to render that page
  var ICON_SINGLE_PAGE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="1.4"/></svg>';
  var ICON_CONTINUOUS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="2" width="12" height="15" rx="1.2"/><rect x="8.8" y="7" width="12" height="15" rx="1.2"/></svg>';

  var annotationCtx = annotationCanvas ? annotationCanvas.getContext('2d') : null;
  var annotations = {}; // pageNumber -> array of committed strokes
  var redoStacks = {}; // pageNumber -> array of undone strokes, available to redo
  var annotateMode = false;
  var activeStroke = null;
  var activeStrokePage = null; // page number the in-progress stroke belongs to
  var TOOLS = {
    marker: { color: '#ff4d4f', width: 3, alpha: 1 }, // pen-width units are PDF user space, so they scale with zoom
    highlighter: { color: '#ffeb3b', width: 14, alpha: .35 }
  };
  var activeTool = 'marker';

  function setStatus(text) {
    if (!statusEl) return;
    if (text) {
      statusEl.textContent = text;
      statusEl.hidden = false;
      pageInner.hidden = true;
      if (continuousEl) continuousEl.hidden = true;
    } else {
      statusEl.hidden = true;
      // Only the container for the active view mode should be visible.
      pageInner.hidden = viewMode !== 'single';
      if (continuousEl) continuousEl.hidden = viewMode !== 'continuous';
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
    updateAnnotateControls();
  }

  function updateActiveThumb() {
    if (!thumbsPanel) return;
    var buttons = thumbsPanel.querySelectorAll('.resume-thumb');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.toggle('is-active', Number(buttons[i].getAttribute('data-page')) === currentPage);
    }
  }

  // Shared scale math: same fit-width / fit-page / numeric-zoom formula used by both
  // view modes, so switching modes never changes the effective zoom level.
  function computeScale(baseViewport, containerWidth, containerHeight) {
    var fitWidthScale = containerWidth > 0 ? containerWidth / baseViewport.width : 1;
    var fitPageScale = containerHeight > 0
      ? Math.min(fitWidthScale, containerHeight / baseViewport.height)
      : fitWidthScale;
    return fitMode === 'fit-page' ? fitPageScale
      : fitMode === 'fit-width' ? fitWidthScale
      : fitWidthScale * ZOOM_STEPS[zoomIndex];
  }

  function getContainerSize() {
    return {
      width: (pageArea ? pageArea.clientWidth : wrap.clientWidth) - 32,
      height: (pageArea ? pageArea.clientHeight : wrap.clientHeight) - 96
    };
  }

  // Renders one PDF page into a given set of DOM nodes (canvas/textLayer/annotation
  // canvas), used for both the single fixed page-inner and each continuous-mode page.
  function renderInto(page, target, containerWidth, containerHeight) {
    var baseViewport = page.getViewport({ scale: 1, rotation: rotation });
    var scale = computeScale(baseViewport, containerWidth, containerHeight);
    var dpr = window.devicePixelRatio || 1;
    var viewport = page.getViewport({ scale: scale, rotation: rotation });
    var displayWidth = Math.ceil(viewport.width);
    var displayHeight = Math.ceil(viewport.height);

    target.canvas.width = Math.ceil(viewport.width * dpr);
    target.canvas.height = Math.ceil(viewport.height * dpr);
    target.canvas.style.width = displayWidth + 'px';
    target.canvas.style.height = displayHeight + 'px';
    target.wrapper.style.width = displayWidth + 'px';
    target.wrapper.style.height = displayHeight + 'px';

    var renderPromise = page.render({
      canvasContext: target.ctx,
      viewport: viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
    }).promise;

    // Transparent, selectable text overlay matching the canvas rendering exactly.
    if (target.textLayer && window.pdfjsLib.renderTextLayer) {
      target.textLayer.innerHTML = '';
      target.textLayer.style.width = displayWidth + 'px';
      target.textLayer.style.height = displayHeight + 'px';

      window.pdfjsLib.renderTextLayer({
        textContentSource: page.streamTextContent(),
        container: target.textLayer,
        viewport: viewport
      }).promise.catch(function () { /* selection layer is best-effort */ });
    }

    // Annotation overlay: sized to match the canvas exactly, redrawn from stored strokes.
    if (target.annotationCanvas) {
      target.annotationCanvas.width = Math.ceil(viewport.width * dpr);
      target.annotationCanvas.height = Math.ceil(viewport.height * dpr);
      target.annotationCanvas.style.width = displayWidth + 'px';
      target.annotationCanvas.style.height = displayHeight + 'px';
    }

    return { viewport: viewport, renderPromise: renderPromise };
  }

  // Single-page mode: renders just `pageNumber` into the fixed #resumePageInner nodes.
  function renderSingle(pageNumber) {
    if (!pdfDoc) return;
    var token = ++renderToken;
    pageInner.setAttribute('data-page', String(pageNumber));
    pageRenders = {};
    pageRenders[pageNumber] = {
      wrapper: pageInner, canvas: canvas, ctx: ctx,
      textLayer: textLayerDiv, annotationCanvas: annotationCanvas, annotationCtx: annotationCtx
    };

    pdfDoc.getPage(pageNumber).then(function (page) {
      if (token !== renderToken) return;
      var size = getContainerSize();
      var result = renderInto(page, pageRenders[pageNumber], size.width, size.height);

      result.renderPromise.then(function () {
        if (token !== renderToken) return;
        setStatus(null);
        updateControls();
      });

      pageViewports = {};
      pageViewports[pageNumber] = result.viewport;
      redrawAnnotations(pageNumber);
    });
  }

  // Continuous mode: renders every page stacked inside #resumeContinuous so the user
  // can scroll straight through the document. Rebuilt whenever zoom/rotation/size change.
  function renderContinuous() {
    if (!pdfDoc || !continuousEl) return;
    var token = ++renderToken;
    continuousEl.innerHTML = '';
    pageRenders = {};
    pageViewports = {};
    if (continuousObserver) continuousObserver.disconnect();

    var size = getContainerSize();
    var numPages = pdfDoc.numPages;
    var firstRendered = false;

    var _loop = function (pageNumber) {
      var wrapper = document.createElement('div');
      wrapper.className = 'resume-page-inner';
      wrapper.setAttribute('data-page', String(pageNumber));

      var pageCanvas = document.createElement('canvas');
      pageCanvas.className = 'resume-canvas';
      var pageTextLayer = document.createElement('div');
      pageTextLayer.className = 'resume-text-layer';
      var pageAnnotationCanvas = document.createElement('canvas');
      pageAnnotationCanvas.className = 'resume-annotation-layer';

      wrapper.appendChild(pageCanvas);
      wrapper.appendChild(pageTextLayer);
      wrapper.appendChild(pageAnnotationCanvas);
      continuousEl.appendChild(wrapper);

      var target = {
        wrapper: wrapper, canvas: pageCanvas, ctx: pageCanvas.getContext('2d'),
        textLayer: pageTextLayer, annotationCanvas: pageAnnotationCanvas,
        annotationCtx: pageAnnotationCanvas.getContext('2d')
      };
      pageRenders[pageNumber] = target;

      pdfDoc.getPage(pageNumber).then(function (page) {
        if (token !== renderToken) return;
        var result = renderInto(page, target, size.width, size.height);
        pageViewports[pageNumber] = result.viewport;
        redrawAnnotations(pageNumber);

        result.renderPromise.then(function () {
          if (token !== renderToken || firstRendered) return;
          firstRendered = true;
          setStatus(null);
          updateControls();
        });

        // Land back on whichever page was current before the (re)build, without
        // animating — e.g. right after switching from single-page mode.
        if (pageNumber === currentPage) wrapper.scrollIntoView({ block: 'start' });
      });
    };
    for (var pageNumber = 1; pageNumber <= numPages; pageNumber += 1) _loop(pageNumber);

    observeContinuousPages();
  }

  // Tracks which page is most visible while scrolling continuous mode, keeping the
  // page indicator / thumbnail highlight / undo-redo state pointed at the right page.
  function observeContinuousPages() {
    if (!('IntersectionObserver' in window) || !pageArea) return;
    continuousObserver = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (entry) {
        if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) best = entry;
      });
      if (best) {
        var pageNum = Number(best.target.getAttribute('data-page'));
        if (pageNum && pageNum !== currentPage) {
          currentPage = pageNum;
          updateControls();
        }
      }
    }, { root: pageArea, threshold: [0.25, 0.5, 0.75, 1] });
    Object.keys(pageRenders).forEach(function (key) {
      continuousObserver.observe(pageRenders[key].wrapper);
    });
  }

  // Mode-aware render dispatcher: every control (zoom, rotate, resize, thumbnails)
  // just calls render() rather than knowing which mode is active.
  function render() {
    if (viewMode === 'continuous') renderContinuous();
    else renderSingle(currentPage);
  }

  function scrollToPage(pageNumber, smooth) {
    var target = pageRenders[pageNumber];
    if (target && target.wrapper) {
      target.wrapper.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  }

  function updateViewModeButton() {
    if (!viewModeBtn) return;
    var isContinuous = viewMode === 'continuous';
    viewModeBtn.innerHTML = isContinuous ? ICON_CONTINUOUS : ICON_SINGLE_PAGE;
    viewModeBtn.setAttribute('aria-pressed', String(isContinuous));
    var label = isContinuous ? 'Switch to single-page view' : 'Switch to continuous scroll view';
    viewModeBtn.setAttribute('aria-label', label);
    viewModeBtn.title = label;
  }

  function setViewMode(mode) {
    if (mode === viewMode || (mode !== 'single' && mode !== 'continuous')) return;
    viewMode = mode;
    updateViewModeButton();
    if (!pdfDoc) return; // nothing loaded yet; the eventual initial render() picks this up
    render();
  }

  function redrawAnnotations(pageNumber) {
    var target = pageRenders[pageNumber];
    var viewport = pageViewports[pageNumber];
    if (!target || !target.annotationCtx || !viewport) return;
    var dpr = window.devicePixelRatio || 1;
    target.annotationCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    target.annotationCtx.clearRect(0, 0, target.annotationCanvas.width / dpr, target.annotationCanvas.height / dpr);
    var strokes = annotations[pageNumber] || [];
    strokes.forEach(function (stroke) { drawStroke(stroke, viewport, target.annotationCtx); });
  }

  function drawStroke(stroke, viewport, annCtx) {
    if (!annCtx || !viewport || !stroke.points.length) return;
    var pts = stroke.points.map(function (p) { return viewport.convertToViewportPoint(p.x, p.y); });
    annCtx.save();
    annCtx.globalAlpha = stroke.alpha;
    annCtx.strokeStyle = stroke.color;
    annCtx.lineWidth = Math.max(1, stroke.width * viewport.scale);
    annCtx.lineCap = 'round';
    annCtx.lineJoin = 'round';
    annCtx.beginPath();
    annCtx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) {
      // A tap with no drag: draw a small dot rather than nothing.
      annCtx.lineTo(pts[0][0] + 0.01, pts[0][1] + 0.01);
    } else {
      for (var i = 1; i < pts.length; i += 1) annCtx.lineTo(pts[i][0], pts[i][1]);
    }
    annCtx.stroke();
    annCtx.restore();
  }

  function updateAnnotateControls() {
    var strokes = annotations[currentPage] || [];
    var redos = redoStacks[currentPage] || [];
    if (annotateUndoBtn) annotateUndoBtn.disabled = strokes.length === 0;
    if (annotateRedoBtn) annotateRedoBtn.disabled = redos.length === 0;
  }

  function goToPage(pageNumber) {
    if (!pdfDoc) return;
    currentPage = Math.min(Math.max(pageNumber, 1), pdfDoc.numPages);
    if (viewMode === 'continuous') {
      if (pageRenders[currentPage]) {
        scrollToPage(currentPage, true);
        updateControls();
      } else {
        renderContinuous();
      }
    } else {
      renderSingle(currentPage);
    }
  }

  function setZoom(nextIndex) {
    fitMode = null;
    zoomIndex = Math.min(Math.max(nextIndex, 0), ZOOM_STEPS.length - 1);
    render();
  }

  function setZoomValue(value) {
    if (value === 'fit-width' || value === 'fit-page') {
      fitMode = value;
      render();
      return;
    }
    var index = ZOOM_STEPS.indexOf(Number(value));
    setZoom(index === -1 ? 2 : index);
  }

  function rotateBy(delta) {
    rotation = ((rotation + delta) % 360 + 360) % 360;
    render();
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
  if (rotateCwBtn) rotateCwBtn.addEventListener('click', function () { rotateBy(90); });

  updateViewModeButton();
  if (viewModeBtn) {
    viewModeBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      setViewMode(viewMode === 'continuous' ? 'single' : 'continuous');
    });
  }

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
    if (annotateSep) annotateSep.hidden = !on;
    if (annotateTools) annotateTools.hidden = !on; // extends the same toolbar pill in place
    if (annotateToggleBtn) annotateToggleBtn.setAttribute('aria-pressed', String(on));
    if (wrap) wrap.classList.toggle('is-annotating', on);
    if (on) closePopovers(null); // close search etc. so they don't sit on top while drawing
  }

  function setActiveTool(tool) {
    activeTool = tool;
    if (toolMarkerBtn) toolMarkerBtn.setAttribute('aria-pressed', String(tool === 'marker'));
    if (toolHighlighterBtn) toolHighlighterBtn.setAttribute('aria-pressed', String(tool === 'highlighter'));
  }

  if (annotateToggleBtn) {
    annotateToggleBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      setAnnotateMode(!annotateMode);
    });
  }
  if (toolMarkerBtn) toolMarkerBtn.addEventListener('click', function () { setActiveTool('marker'); });
  if (toolHighlighterBtn) toolHighlighterBtn.addEventListener('click', function () { setActiveTool('highlighter'); });

  if (annotateUndoBtn) {
    annotateUndoBtn.addEventListener('click', function () {
      var strokes = annotations[currentPage];
      if (!strokes || !strokes.length) return;
      if (!redoStacks[currentPage]) redoStacks[currentPage] = [];
      redoStacks[currentPage].push(strokes.pop());
      redrawAnnotations(currentPage);
      updateAnnotateControls();
    });
  }

  if (annotateRedoBtn) {
    annotateRedoBtn.addEventListener('click', function () {
      var redos = redoStacks[currentPage];
      if (!redos || !redos.length) return;
      if (!annotations[currentPage]) annotations[currentPage] = [];
      annotations[currentPage].push(redos.pop());
      redrawAnnotations(currentPage);
      updateAnnotateControls();
    });
  }

  // Freehand drawing, mapped into PDF user-space so strokes stay correctly placed across
  // zoom, fit mode, rotation and view-mode changes. Bound on the shared page area (rather
  // than one fixed canvas) so the same handlers work for the single canvas in single-page
  // mode and for whichever page's canvas the user is drawing on in continuous mode.
  function pointerToPdfPoint(event, canvasEl, viewport) {
    var rect = canvasEl.getBoundingClientRect();
    return viewport.convertToPdfPoint(event.clientX - rect.left, event.clientY - rect.top);
  }

  function pageNumberForAnnotationEl(el) {
    var wrapper = el.closest ? el.closest('.resume-page-inner') : null;
    var attr = wrapper && wrapper.getAttribute('data-page');
    return attr ? Number(attr) : currentPage;
  }

  function endStroke() {
    if (!activeStroke || activeStrokePage == null) return;
    var pageNumber = activeStrokePage;
    if (!annotations[pageNumber]) annotations[pageNumber] = [];
    annotations[pageNumber].push(activeStroke);
    redoStacks[pageNumber] = []; // a new stroke invalidates the redo history, same as any editor
    activeStroke = null;
    activeStrokePage = null;
    updateAnnotateControls();
  }

  if (pageArea) {
    pageArea.addEventListener('pointerdown', function (event) {
      var target = event.target;
      if (!annotateMode || !target.classList || !target.classList.contains('resume-annotation-layer')) return;
      var pageNumber = pageNumberForAnnotationEl(target);
      var viewport = pageViewports[pageNumber];
      if (!viewport) return;
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      activeStrokePage = pageNumber;
      if (pageNumber !== currentPage) { currentPage = pageNumber; updateControls(); }
      var preset = TOOLS[activeTool];
      var p = pointerToPdfPoint(event, target, viewport);
      activeStroke = { color: preset.color, width: preset.width, alpha: preset.alpha, points: [{ x: p[0], y: p[1] }] };
    });
    pageArea.addEventListener('pointermove', function (event) {
      if (!annotateMode || !activeStroke || activeStrokePage == null) return;
      var target = pageRenders[activeStrokePage];
      var viewport = pageViewports[activeStrokePage];
      if (!target || !viewport) return;
      var p = pointerToPdfPoint(event, target.annotationCanvas, viewport);
      activeStroke.points.push({ x: p[0], y: p[1] });
      redrawAnnotations(activeStrokePage);
      drawStroke(activeStroke, viewport, target.annotationCtx);
    });
    pageArea.addEventListener('pointerup', endStroke);
    pageArea.addEventListener('pointercancel', endStroke);
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
        render(); // container width changed, re-fit
      }
    });
  }

  document.addEventListener('click', function () { closePopovers(null); });

  window.addEventListener('resize', function () {
    if (pdfDoc) render();
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
      render();
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
