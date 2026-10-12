/* visitor.js
   Anonymous visitor identification + fetching the real, server-assigned
   visitor number. Deliberately kept separate from footer.js: footer.js
   still owns formatting/display (App.setViews), this file only supplies
   the real number once the API responds. If the request fails for any
   reason, the footer is simply left showing whatever it already had
   (the placeholder count from config.js) — the rest of the site is
   unaffected. */
(function (App) {
  'use strict';

  var STORAGE_KEY = 'wkv_visitor_id';

  function randomUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    // Fallback for older browsers without crypto.randomUUID.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Anonymous, random identifier only — no personal information of any
  // kind. Used solely to recognise the same browser across requests.
  function getOrCreateVisitorId() {
    try {
      var existing = window.localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      var fresh = randomUuid();
      window.localStorage.setItem(STORAGE_KEY, fresh);
      return fresh;
    } catch (e) {
      // Private browsing / storage disabled: fall back to an id that
      // only lives for this page load. Counting will still work, it
      // just won't recognise this browser as returning next time.
      return randomUuid();
    }
  }

  function loadVisitorNumber() {
    var visitorId = getOrCreateVisitorId();

    fetch('/api/visitor', {
      method: 'GET',
      headers: { 'X-Visitor-Id': visitorId },
    })
      .then(function (response) {
        if (!response.ok) throw new Error('visitor api responded with ' + response.status);
        return response.json();
      })
      .then(function (data) {
        if (typeof data.visitorNumber === 'number' && typeof App.setViews === 'function') {
          App.setViews(data.visitorNumber);
        }
      })
      .catch(function () {
        /* Fail silently — the existing placeholder count stays put and
           the rest of the site keeps working normally. */
      });
  }

  loadVisitorNumber();
})(window.App);
