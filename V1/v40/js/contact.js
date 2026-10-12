/* contact.js
   Contact form. Front end only for now: it validates the fields and shows a toast.
   TODO (backend step): send the message to an API / email service inside the submit handler. */
(function (App) {
  'use strict';
  var $ = App.$;

  $('#contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('#email').value.trim();
    var message = $('#message').value.trim();
    var note = $('#formNote');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { note.textContent = 'Enter a valid email address.'; $('#email').focus(); return; }
    if (!message) { note.textContent = 'Write a message before sending.'; $('#message').focus(); return; }

    note.textContent = '';
    App.toast('Sending is not connected yet. This gets wired up in the backend step.');
  });
})(window.App);
