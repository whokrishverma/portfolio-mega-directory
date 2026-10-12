/* home-projects.js
   Builds the 5 project tiles on the home page from the first 5 rows of the table on the Projects page.
   The table in index.html is the single source of truth: edit or reorder rows there and the home tiles follow.
   Each tile shows the project name + description and links to that row's GitHub link. */
(function (App) {
  'use strict';

  var COUNT = 5;
  var ARROW = '<svg class="card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>';

  var box = document.getElementById('homeProjects');
  var rows = document.querySelectorAll('[data-view="/projects"] .projects-row:not(.projects-row--head)');
  if (!box || !rows.length) return;

  box.innerHTML = '';
  Array.prototype.slice.call(rows, 0, COUNT).forEach(function (row) {
    var name = row.querySelector('.projects-cell--project');
    var desc = row.querySelector('.projects-cell--desc');
    var link = row.querySelector('.projects-github');

    var a = document.createElement('a');
    a.className = 'card';
    a.href = link ? link.getAttribute('href') : '#/projects';
    if (link) { a.target = '_blank'; a.rel = 'noopener'; }

    var text = document.createElement('div');
    text.className = 'card-text';
    var t = document.createElement('div');
    t.className = 'card-title';
    t.textContent = name ? name.textContent.trim() : '';
    var d = document.createElement('div');
    d.className = 'card-desc';
    d.textContent = desc ? desc.textContent.trim() : '';
    text.appendChild(t);
    text.appendChild(d);

    a.appendChild(text);
    a.insertAdjacentHTML('beforeend', ARROW);
    box.appendChild(a);
  });
})(window.App);
