//______________________________V1.0______________________________________

// /* hero.js
//    Draws the wavy line next to the terminal / resume buttons. */
// (function (App) {
//   'use strict';

//   var d = 'M0 8 q3.25 -6 6.5 0';
//   for (var i = 0; i < 27; i++) d += ' t6.5 0';
//   App.$('#squigglePath').setAttribute('d', d);
// })(window.App);

//______________________________V2.0______________________________________

// /* hero.js
//    Draws the wavy line next to the terminal / resume buttons. */
// (function (App) {
//   'use strict';

//   var WIDTH = 182;       // total length of the line
//   var HEIGHT = 16;       // height of the drawing area
//   var HALF_WAVE = 10;    // width of ONE hump. Bigger = more space between curves
//   var AMPLITUDE = 6;     // how tall the humps are (the visible bulge is about half this value)

//   var svg = App.$('#squiggle');
//   var mid = HEIGHT / 2;
//   var count = Math.round(WIDTH / HALF_WAVE);           // humps needed to fill the width

//   var d = 'M0 ' + mid + ' q' + (HALF_WAVE / 2) + ' ' + (-AMPLITUDE) + ' ' + HALF_WAVE + ' 0';
//   for (var i = 1; i < count; i++) d += ' t' + HALF_WAVE + ' 0';

//   svg.setAttribute('viewBox', '0 0 ' + WIDTH + ' ' + HEIGHT);
//   svg.style.width = (WIDTH / 16) + 'rem';
//   svg.style.height = (HEIGHT / 16) + 'rem';
//   App.$('#squigglePath').setAttribute('d', d);
// })(window.App);

//______________________________V3.0______________________________________



/* hero.js
   Draws the wavy line next to the terminal / resume buttons. It flows gently on hover (see home.css). */
(function (App) {
  'use strict';

  var WIDTH = 182;       // total visible length of the line
  var HEIGHT = 16;       // height of the drawing area
  var HALF_WAVE = 10;    // width of ONE hump. Bigger = more space between curves
  var AMPLITUDE = 6;     // how tall the humps are (the visible bulge is about half this value)
  var EXTRA = 2;         // humps drawn off-screen on the left (one full wavelength) so the hover flow loops seamlessly

  var svg = App.$('#squiggle');
  var mid = HEIGHT / 2;
  var humps = Math.ceil(WIDTH / HALF_WAVE) + EXTRA;

  var d = 'M' + (-EXTRA * HALF_WAVE) + ' ' + mid + ' q' + (HALF_WAVE / 2) + ' ' + (-AMPLITUDE) + ' ' + HALF_WAVE + ' 0';
  for (var i = 1; i < humps; i++) d += ' t' + HALF_WAVE + ' 0';

  svg.setAttribute('viewBox', '0 0 ' + WIDTH + ' ' + HEIGHT);
  svg.style.width = (WIDTH / 16) + 'rem';
  svg.style.height = (HEIGHT / 16) + 'rem';
  svg.style.setProperty('--flow', (EXTRA * HALF_WAVE) + 'px');   // distance the wave slides per loop
  App.$('#squigglePath').setAttribute('d', d);
})(window.App);