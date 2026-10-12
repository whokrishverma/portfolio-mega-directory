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
  var zoomBtn = $('#resumeZoomBtn');
  var zoomLabel = $('#resumeZoomLabel');
  var zoomMenu = $('#resumeZoomMenu');
  var frameWrap = $('#resumeFrameWrap');
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
  var toolEraserBtn = $('#resumeToolEraser');
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
  var pageTextCache = {}; // pageNumber -> lowercase text/index data, filled lazily while searching
  var activeSearchQuery = ''; // the tight query currently highlighted, '' when no search is active
  var pageMatches = {}; // pageNumber -> { itemIndex: true } for items touched by the active search
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
  // Undo/redo work on ACTIONS, so erasing can be undone too:
  //   { type: 'add', stroke, index }            a stroke was drawn
  //   { type: 'erase', removed: [{stroke, index}] }   one eraser drag removed these strokes
  var undoStacks = {}; // pageNumber -> array of actions that can be undone
  var redoStacks = {}; // pageNumber -> array of undone actions, available to redo
  var ERASER_RADIUS_PX = 11; // on-screen radius of the eraser (converted to PDF units per zoom level)
  var activeErase = null; // { page, removed: [], last: {x, y} } while an eraser drag is in progress
  var ringPage = null;    // page currently showing the eraser ring
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
    if (except !== zoomMenu) closeZoomMenu();
    if (searchPanel && except !== searchPanel && !searchPanel.hidden) {
      searchPanel.hidden = true;
      if (searchToggleBtn) searchToggleBtn.setAttribute('aria-expanded', 'false');
      if (searchInput) searchInput.value = '';
      if (searchResultEl) searchResultEl.textContent = '';
      activeSearchQuery = '';
      pageMatches = {};
      applyHighlightToRenderedPages();
    }
    // The annotate panel is intentionally left out here: it stays open for the whole
    // annotate session, since drawing means clicking into the page itself.
  }

  function updateControls() {
    if (pageNumEl) pageNumEl.textContent = String(currentPage);
    if (pageCountEl) pageCountEl.textContent = pdfDoc ? String(pdfDoc.numPages) : '–';
    updateZoomUI();
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
  function renderInto(page, target, containerWidth, containerHeight, pageNumber) {
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
      }).promise.then(function () {
        applyPageHighlight(pageNumber, target.textLayer);
      }).catch(function () { /* selection layer is best-effort */ });
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
      var result = renderInto(page, pageRenders[pageNumber], size.width, size.height, pageNumber);

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
        var result = renderInto(page, target, size.width, size.height, pageNumber);
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
    var undos = undoStacks[currentPage] || [];
    var redos = redoStacks[currentPage] || [];
    if (annotateUndoBtn) annotateUndoBtn.disabled = undos.length === 0;
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
    updateZoomUI();
    render();
  }

  function setZoomValue(value) {
    if (value === 'fit-width' || value === 'fit-page') {
      fitMode = value;
      updateZoomUI();
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
      // PDF.js's text layer does NOT create one <span> per item: items with an empty
      // string are silently dropped, and grouped content gets wrapped in extra
      // <span class="markedContent"> containers. So only items with real text end up
      // as an actual rendered span, in the same relative order. Filtering to those
      // items here keeps our indices aligned with textLayerEl.querySelectorAll
      // ('span:not(.markedContent)') in applyPageHighlight, which is the same filter.
      var textItems = content.items.filter(function (item) { return item && item.str; });
      var strings = textItems.map(function (item) { return item.str; });
      // PDF text extraction splits words across items unpredictably (kerning, fonts),
      // so a forced-space join can break mid-word matches. Keep both a spaced and a
      // tight (whitespace-stripped) version, plus a map from each character of the
      // tight string back to the real-span index (see filter above) it came from, so
      // a match found in the tight string can be highlighted on the actual span.
      var tight = '';
      var tightMap = []; // tightMap[charIndex] -> real-span index
      strings.forEach(function (str, spanIndex) {
        var stripped = str.toLowerCase().replace(/\s+/g, '');
        tight += stripped;
        for (var c = 0; c < stripped.length; c += 1) tightMap.push(spanIndex);
      });
      var data = {
        spaced: strings.join(' ').toLowerCase().replace(/\s+/g, ' '),
        tight: tight,
        tightMap: tightMap
      };
      pageTextCache[pageNumber] = data;
      return data;
    });
  }

  // Finds every occurrence of tightQuery in the page's tight text, returning both a
  // count (for the "N matches" total) and the set of item/span indices any occurrence
  // touches (for highlighting). Matching against the whitespace-stripped tight text
  // is a superset of matching the spaced text, so this alone covers both.
  function findPageMatches(data, tightQuery) {
    var itemIndices = {};
    var count = 0;
    if (!tightQuery) return { count: count, itemIndices: itemIndices };
    var idx = data.tight.indexOf(tightQuery);
    while (idx !== -1) {
      count += 1;
      for (var c = idx; c < idx + tightQuery.length; c += 1) {
        var itemIndex = data.tightMap[c];
        if (itemIndex !== undefined) itemIndices[itemIndex] = true;
      }
      idx = data.tight.indexOf(tightQuery, idx + 1);
    }
    return { count: count, itemIndices: itemIndices };
  }

  // Marks/unmarks the text-layer spans of a rendered page against pageMatches, so a
  // freshly (re)rendered page (zoom change, page turn, etc.) always reflects whatever
  // search is currently active.
  function applyPageHighlight(pageNumber, textLayerEl) {
    if (!textLayerEl) return;
    var indices = pageMatches[pageNumber];
    // Must match the same real-text-span filter used to build tightMap in
    // getPageSearchData: PDF.js wraps grouped content in extra, textless
    // <span class="markedContent"> containers that are not text items themselves.
    var spans = textLayerEl.querySelectorAll('span:not(.markedContent)');
    for (var i = 0; i < spans.length; i += 1) {
      spans[i].classList.toggle('is-search-match', !!(indices && indices[i]));
    }
  }

  function applyHighlightToRenderedPages() {
    Object.keys(pageRenders).forEach(function (key) {
      applyPageHighlight(Number(key), pageRenders[key].textLayer);
    });
  }

  function runSearch(query) {
    var normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    var tightQuery = normalizedQuery.replace(/\s+/g, '');

    if (!pdfDoc || !normalizedQuery) {
      activeSearchQuery = '';
      pageMatches = {};
      if (searchResultEl) searchResultEl.textContent = '';
      applyHighlightToRenderedPages();
      return;
    }

    if (searchResultEl) searchResultEl.textContent = 'Searching…';

    var pageNumbers = [];
    for (var i = 1; i <= pdfDoc.numPages; i += 1) pageNumbers.push(i);
    var searchToken = normalizedQuery;

    Promise.all(pageNumbers.map(function (pageNumber) {
      return getPageSearchData(pageNumber).then(function (data) {
        return { pageNumber: pageNumber, matches: findPageMatches(data, tightQuery) };
      });
    })).then(function (results) {
      // Stale: the query changed while this scan was still running.
      if (searchInput && searchInput.value.trim().toLowerCase().replace(/\s+/g, ' ') !== searchToken) return;

      var totalCount = 0;
      var firstPage = null;
      var newPageMatches = {};
      results.forEach(function (r) {
        newPageMatches[r.pageNumber] = r.matches.itemIndices;
        totalCount += r.matches.count;
        if (r.matches.count > 0 && firstPage === null) firstPage = r.pageNumber;
      });

      activeSearchQuery = tightQuery;
      pageMatches = newPageMatches;
      applyHighlightToRenderedPages();

      if (!totalCount) {
        if (searchResultEl) searchResultEl.textContent = 'No results';
        return;
      }

      if (searchResultEl) {
        searchResultEl.textContent = (totalCount === 1 ? '1 match' : totalCount + ' matches') +
          (pdfDoc.numPages > 1 ? ' · p.' + firstPage : '');
      }
      goToPage(firstPage);
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goToPage(currentPage - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goToPage(currentPage + 1); });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { setZoom(zoomIndex - 1); });
  if (zoomInBtn) zoomInBtn.addEventListener('click', function () { setZoom(zoomIndex + 1); });
  /* ---------- Custom zoom dropdown (replaces the native <select>) ---------- */
  function zoomValueNow() { return fitMode || String(ZOOM_STEPS[zoomIndex]); }

  function updateZoomUI() {
    if (!zoomBtn || !zoomMenu) return;
    var value = zoomValueNow();
    var label = value;
    Array.prototype.forEach.call(zoomMenu.querySelectorAll('.resume-zoom-option'), function (opt) {
      var selected = opt.getAttribute('data-value') === value;
      opt.setAttribute('aria-selected', String(selected));
      if (selected) label = opt.textContent.trim();
    });
    if (zoomLabel) zoomLabel.textContent = label;
  }

  // Centre the menu under the zoom pill (clamped so it never leaves the viewer frame).
  function positionZoomMenu() {
    if (!zoomBtn || !zoomMenu || !frameWrap) return;
    var f = frameWrap.getBoundingClientRect();
    var b = zoomBtn.getBoundingClientRect();
    var w = zoomMenu.offsetWidth;
    var left = b.left - f.left + b.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, f.width - w - 8));
    zoomMenu.style.left = left + 'px';
    zoomMenu.style.top = (b.bottom - f.top + 8) + 'px';
  }

  function closeZoomMenu() {
    if (!zoomMenu || zoomMenu.hidden) return;
    zoomMenu.hidden = true;
    if (zoomBtn) zoomBtn.setAttribute('aria-expanded', 'false');
  }

  function openZoomMenu() {
    closePopovers(zoomMenu);
    zoomMenu.hidden = false;
    zoomBtn.setAttribute('aria-expanded', 'true');
    positionZoomMenu();
    var selected = zoomMenu.querySelector('[aria-selected="true"]') || zoomMenu.querySelector('.resume-zoom-option');
    if (selected) selected.focus({ preventScroll: true });
    if (selected && selected.scrollIntoView) selected.scrollIntoView({ block: 'nearest' });
  }

  if (zoomBtn && zoomMenu) {
    zoomBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      if (zoomMenu.hidden) openZoomMenu(); else closeZoomMenu();
    });
    zoomBtn.addEventListener('keydown', function (event) {
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && zoomMenu.hidden) {
        event.preventDefault();
        openZoomMenu();
      }
    });
    zoomMenu.addEventListener('click', function (event) {
      event.stopPropagation();
      var opt = event.target.closest('.resume-zoom-option');
      if (!opt) return;
      closeZoomMenu();
      zoomBtn.focus();
      setZoomValue(opt.getAttribute('data-value'));
    });
    zoomMenu.addEventListener('keydown', function (event) {
      var opts = Array.prototype.slice.call(zoomMenu.querySelectorAll('.resume-zoom-option'));
      var i = opts.indexOf(document.activeElement);
      if (event.key === 'ArrowDown') { event.preventDefault(); opts[Math.min(i + 1, opts.length - 1)].focus(); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); opts[Math.max(i - 1, 0)].focus(); }
      else if (event.key === 'Home') { event.preventDefault(); opts[0].focus(); }
      else if (event.key === 'End') { event.preventDefault(); opts[opts.length - 1].focus(); }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (i > -1) opts[i].click(); }
      else if (event.key === 'Escape' || event.key === 'Tab') { closeZoomMenu(); zoomBtn.focus(); }
    });
    window.addEventListener('resize', closeZoomMenu);
    updateZoomUI();
  }
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
      if (event.key === 'Escape') { closePopovers(null); searchToggleBtn.focus(); }
    });
  }

  function setAnnotateMode(on) {
    annotateMode = on;
    if (annotateSep) annotateSep.hidden = !on;
    if (annotateTools) annotateTools.hidden = !on; // extends the same toolbar pill in place
    if (annotateToggleBtn) annotateToggleBtn.setAttribute('aria-pressed', String(on));
    if (wrap) wrap.classList.toggle('is-annotating', on);
    if (!on) clearEraserRing();
    if (wrap) wrap.classList.toggle('is-erasing', on && activeTool === 'erase');
    if (on) closePopovers(null); // close search etc. so they don't sit on top while drawing
  }

  function setActiveTool(tool) {
    activeTool = tool;
    if (toolMarkerBtn) toolMarkerBtn.setAttribute('aria-pressed', String(tool === 'marker'));
    if (toolHighlighterBtn) toolHighlighterBtn.setAttribute('aria-pressed', String(tool === 'highlighter'));
    if (toolEraserBtn) toolEraserBtn.setAttribute('aria-pressed', String(tool === 'erase'));
    if (wrap) wrap.classList.toggle('is-erasing', annotateMode && tool === 'erase');
    if (tool !== 'erase') clearEraserRing();
  }

  if (annotateToggleBtn) {
    annotateToggleBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      setAnnotateMode(!annotateMode);
    });
  }
  if (toolMarkerBtn) toolMarkerBtn.addEventListener('click', function () { setActiveTool('marker'); });
  if (toolHighlighterBtn) toolHighlighterBtn.addEventListener('click', function () { setActiveTool('highlighter'); });
  if (toolEraserBtn) toolEraserBtn.addEventListener('click', function () { setActiveTool('erase'); });

  function removeStroke(pageNumber, stroke) {
    var list = annotations[pageNumber] || [];
    var i = list.indexOf(stroke);
    if (i > -1) list.splice(i, 1);
  }

  if (annotateUndoBtn) {
    annotateUndoBtn.addEventListener('click', function () {
      var undos = undoStacks[currentPage];
      if (!undos || !undos.length) return;
      var action = undos.pop();
      if (!annotations[currentPage]) annotations[currentPage] = [];
      if (action.type === 'add') {
        removeStroke(currentPage, action.stroke);
      } else {
        // Put erased strokes back where they were (latest removal first, so stored indexes line up).
        for (var i = action.removed.length - 1; i >= 0; i -= 1) {
          annotations[currentPage].splice(action.removed[i].index, 0, action.removed[i].stroke);
        }
      }
      if (!redoStacks[currentPage]) redoStacks[currentPage] = [];
      redoStacks[currentPage].push(action);
      redrawAnnotations(currentPage);
      updateAnnotateControls();
    });
  }
  if (annotateRedoBtn) {
    annotateRedoBtn.addEventListener('click', function () {
      var redos = redoStacks[currentPage];
      if (!redos || !redos.length) return;
      var action = redos.pop();
      if (!annotations[currentPage]) annotations[currentPage] = [];
      if (action.type === 'add') {
        annotations[currentPage].splice(action.index, 0, action.stroke);
      } else {
        action.removed.forEach(function (r) { removeStroke(currentPage, r.stroke); });
      }
      if (!undoStacks[currentPage]) undoStacks[currentPage] = [];
      undoStacks[currentPage].push(action);
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

  /* ---------- Eraser: removes every stroke the eraser touches; one drag = one undoable action ---------- */
  function distToSegment(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    var cx = ax + t * dx, cy = ay + t * dy;
    return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
  }

  function strokeHit(stroke, x, y, radius) {
    var reach = radius + stroke.width / 2;
    var pts = stroke.points;
    if (pts.length === 1) return Math.sqrt((pts[0].x - x) * (pts[0].x - x) + (pts[0].y - y) * (pts[0].y - y)) <= reach;
    for (var i = 1; i < pts.length; i += 1) {
      if (distToSegment(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= reach) return true;
    }
    return false;
  }

  // Erases at one PDF-space point; returns true if anything was removed.
  function eraseAt(pageNumber, x, y) {
    var viewport = pageViewports[pageNumber];
    var list = annotations[pageNumber];
    if (!viewport || !list || !list.length) return false;
    var radius = ERASER_RADIUS_PX / viewport.scale;
    var changed = false;
    for (var i = list.length - 1; i >= 0; i -= 1) {
      if (strokeHit(list[i], x, y, radius)) {
        activeErase.removed.push({ stroke: list[i], index: i });
        list.splice(i, 1);
        changed = true;
      }
    }
    return changed;
  }

  // Sweeps from the previous pointer position to this one so fast drags don't skip over strokes.
  function eraseTo(pageNumber, p) {
    var viewport = pageViewports[pageNumber];
    var last = activeErase.last;
    var changed = false;
    var dist = Math.sqrt((p[0] - last.x) * (p[0] - last.x) + (p[1] - last.y) * (p[1] - last.y));
    var steps = Math.max(1, Math.ceil(dist * viewport.scale / 4));
    for (var s = 1; s <= steps; s += 1) {
      var x = last.x + (p[0] - last.x) * s / steps;
      var y = last.y + (p[1] - last.y) * s / steps;
      if (eraseAt(pageNumber, x, y)) changed = true;
    }
    activeErase.last = { x: p[0], y: p[1] };
    return changed;
  }

  function endErase() {
    if (!activeErase) return;
    var pageNumber = activeErase.page;
    if (activeErase.removed.length) {
      if (!undoStacks[pageNumber]) undoStacks[pageNumber] = [];
      undoStacks[pageNumber].push({ type: 'erase', removed: activeErase.removed });
      redoStacks[pageNumber] = [];
    }
    activeErase = null;
    updateAnnotateControls();
  }

  // Small ring that follows the pointer so you can see the eraser's size.
  function drawEraserRing(pageNumber, event) {
    var target = pageRenders[pageNumber];
    if (!target || !target.annotationCanvas) return;
    if (ringPage != null && ringPage !== pageNumber) redrawAnnotations(ringPage);
    redrawAnnotations(pageNumber);
    var rect = target.annotationCanvas.getBoundingClientRect();
    var ctx = target.annotationCtx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(event.clientX - rect.left, event.clientY - rect.top, ERASER_RADIUS_PX, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, .18)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(40, 40, 44, .85)';
    ctx.stroke();
    ctx.restore();
    ringPage = pageNumber;
  }

  function clearEraserRing() {
    if (ringPage == null) return;
    var page = ringPage;
    ringPage = null;
    redrawAnnotations(page);
  }

  function endStroke() {
    if (activeErase) { endErase(); return; }
    if (!activeStroke || activeStrokePage == null) return;
    var pageNumber = activeStrokePage;
    if (!annotations[pageNumber]) annotations[pageNumber] = [];
    if (!undoStacks[pageNumber]) undoStacks[pageNumber] = [];
    undoStacks[pageNumber].push({ type: 'add', stroke: activeStroke, index: annotations[pageNumber].length });
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
      var p = pointerToPdfPoint(event, target, viewport);
      if (activeTool === 'erase') {
        activeStrokePage = null;
        activeErase = { page: pageNumber, removed: [], last: { x: p[0], y: p[1] } };
        if (eraseAt(pageNumber, p[0], p[1])) redrawAnnotations(pageNumber);
        drawEraserRing(pageNumber, event);
        return;
      }
      var preset = TOOLS[activeTool];
      activeStroke = { color: preset.color, width: preset.width, alpha: preset.alpha, points: [{ x: p[0], y: p[1] }] };
    });
    pageArea.addEventListener('pointermove', function (event) {
      if (annotateMode && activeTool === 'erase') {
        var layer = activeErase ? (pageRenders[activeErase.page] || {}).annotationCanvas : event.target;
        if (!layer || !layer.classList || !layer.classList.contains('resume-annotation-layer')) { clearEraserRing(); return; }
        var pg = activeErase ? activeErase.page : pageNumberForAnnotationEl(layer);
        var vp = pageViewports[pg];
        if (!vp) return;
        if (activeErase) {
          var q = pointerToPdfPoint(event, layer, vp);
          eraseTo(pg, q);
        }
        drawEraserRing(pg, event);
        return;
      }
      if (!annotateMode || !activeStroke || activeStrokePage == null) return;
      var target = pageRenders[activeStrokePage];
      var viewport = pageViewports[activeStrokePage];
      if (!target || !viewport) return;
      var p = pointerToPdfPoint(event, target.annotationCanvas, viewport);
      activeStroke.points.push({ x: p[0], y: p[1] });
      redrawAnnotations(activeStrokePage);
      drawStroke(activeStroke, viewport, target.annotationCtx);
    });
    pageArea.addEventListener('pointerleave', function () { if (!activeErase) clearEraserRing(); });
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
