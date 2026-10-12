/* actions.js
   Click handling for elements marked in the HTML with data-scroll="id" or data-action="name".
   The data-action items are placeholders until real links/pages exist; each just shows a toast. */
(function (App) {
  'use strict';

  var placeholders = {
    resume: 'Resume link not added yet.',
    project: 'Project pages come in a later step.',
    rss: 'RSS feed comes in a later step.'
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-scroll], [data-action]');
    if (!el) return;

    e.preventDefault();
    App.menu.set(false);

    if (el.hasAttribute('data-scroll')) {
      App.router.goSection(el.getAttribute('data-scroll'));
      return;
    }
    var message = placeholders[el.getAttribute('data-action')];
    if (message) App.toast(message);
  });
})(window.App);
