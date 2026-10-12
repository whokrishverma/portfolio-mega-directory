/* tech-icons.js
   Inline SVG artwork for the tech-stack marquee tiles.
   c = extra CSS class for the tile background, s = SVG content (48x48 viewBox). */
(function (App) {
  'use strict';

  App.techIcons = {
    python: { c: '', s: '<path d="M23.5 6c-6 0-6.5 2.6-6.5 4.5V14h7v1.5H13.5C10 15.5 8 18.5 8 23s2 7.5 5.5 7.5H16V27c0-3 2.5-5.5 5.5-5.5h6c2.5 0 4.5-2 4.5-4.5v-6.5C32 8 29 6 23.5 6z" fill="#3d7ab8"/><path d="M24.5 42c6 0 6.5-2.6 6.5-4.5V34h-7v-1.5h10.5C38 32.5 40 29.5 40 25s-2-7.5-5.5-7.5H32V21c0 3-2.5 5.5-5.5 5.5h-6C18 26.5 16 28.5 16 31v6.5c0 2.5 3 4.5 8.5 4.5z" fill="#f5c842"/><circle cx="20" cy="10.5" r="1.4" fill="#fff"/><circle cx="28" cy="37.5" r="1.4" fill="#fff"/>' },
    docker: { c: 't-docker', s: '<g fill="#fff"><rect x="10" y="19" width="5" height="5" rx=".8"/><rect x="16" y="19" width="5" height="5" rx=".8"/><rect x="22" y="19" width="5" height="5" rx=".8"/><rect x="16" y="13" width="5" height="5" rx=".8"/><rect x="22" y="13" width="5" height="5" rx=".8"/><rect x="22" y="7" width="5" height="5" rx=".8"/><path d="M5 25.500h32c2-.5 3.500-2 4-4 1.500 0 2.500.7 3 1.500-1 1.500-2 2-3.500 2.200C37 32 31 38 22 38 13 38 7.500 33 5 25.500z"/></g>' },
    node: { c: '', s: '<path d="M24 6 39 14.500v19L24 42 9 33.500v-19z" fill="none" stroke="#5fa04e" stroke-width="3" stroke-linejoin="round"/><text x="24" y="29" text-anchor="middle" font-size="13" font-weight="700" fill="#5fa04e" font-family="Arial, sans-serif">JS</text>' },
    react: { c: '', s: '<g fill="none" stroke="#61dafb" stroke-width="2"><ellipse cx="24" cy="24" rx="16" ry="6.500"/><ellipse cx="24" cy="24" rx="16" ry="6.500" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="16" ry="6.500" transform="rotate(120 24 24)"/></g><circle cx="24" cy="24" r="3" fill="#61dafb"/>' },
    js: { c: 't-js', s: '<text x="41" y="41" text-anchor="end" font-size="17" font-weight="800" fill="#1b1b1b" font-family="Arial, sans-serif">JS</text>' },
    git: { c: 't-git', s: '<path d="M24 5 43 24 24 43 5 24z" fill="#fff"/><g stroke="#e5493a" stroke-width="2.400" stroke-linecap="round" fill="#e5493a"><path d="M24 16v14M24 23.500l7-6"/><circle cx="24" cy="15" r="2.600"/><circle cx="24" cy="31" r="2.600"/><circle cx="31.500" cy="17.500" r="2.600"/></g>' },
    figma: { c: '', s: '<path d="M12 12a6 6 0 0 0 6 6h6V6h-6a6 6 0 0 0-6 6z" fill="#f24e1e"/><path d="M24 6h6a6 6 0 0 1 0 12h-6z" fill="#ff7262"/><path d="M12 24a6 6 0 0 0 6 6h6V18h-6a6 6 0 0 0-6 6z" fill="#a259ff"/><circle cx="30" cy="24" r="6" fill="#1abcfe"/><path d="M12 36a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-6h-6a6 6 0 0 0-6 6z" fill="#0acf83"/>' },
    vite: { c: '', s: '<defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#41d1ff"/><stop offset="1" stop-color="#bd34fe"/></linearGradient></defs><path d="M42 9 25 40a1 1 0 0 1-1.800 0L5.500 9a1 1 0 0 1 1-1.500l17 3a1 1 0 0 0 .4 0l17-3A1 1 0 0 1 42 9z" fill="url(#vg)"/><path d="M31 6 20 8.200l.8 12.300 5-1-1.500 9.800 2.500-.5 7-16.500-5-.8z" fill="#ffd62e"/>' }
  };
})(window.App);
