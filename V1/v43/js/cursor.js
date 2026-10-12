(function () {
  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;

  var dot = document.getElementById('cursorDot');
  if (!dot) return;

  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var curX = x, curY = y;

  function loop() {
    curX += (x - curX) * 0.2;
    curY += (y - curY) * 0.2;
    dot.style.transform = 'translate(' + curX + 'px, ' + curY + 'px) translate(-50%, -50%)';
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
    dot.classList.remove('is-hidden');
  });

  document.addEventListener('mouseleave', function () {
    dot.classList.add('is-hidden');
  });
  document.addEventListener('mouseenter', function () {
    dot.classList.remove('is-hidden');
  });

  document.addEventListener('mousedown', function () {
    dot.classList.add('is-active');
  });
  document.addEventListener('mouseup', function () {
    dot.classList.remove('is-active');
  });
})();
