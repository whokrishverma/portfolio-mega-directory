/* config.js
   Settings and content that are likely to change. Edit here instead of hunting through the code. */
(function (App) {
  'use strict';

  App.config = {
    // Clock in the footer and the "I'm probably working" line in Contacts.
    timeZone: 'Asia/Kolkata',

    // Footer view counter. Replace with a real number once a backend/API exists.
    viewCount: 0,

    // Valid hash routes (#/, #/about, #/writing). The matching <section data-view> lives in index.html.
    routes: ['/', '/about', '/writing'],

    // Emojis that shuffle in the footer (slowly on their own, quickly on hover).
    footerEmojis: ['🪄', '🏀', '♟️', '💃', '🏋️', '📚', '🚀', '🧑‍💻'],

    // Tech-stack marquee: keys must exist in tech-icons.js.
    techStack: ['python', 'docker', 'node', 'react', 'js', 'git', 'figma', 'vite'],

    // Decorative GitHub activity grid: cell index -> intensity (1 or 2). Replace with real data later.
    activityLit: { 1: 1, 2: 1, 8: 2, 9: 1, 12: 1, 22: 1, 25: 1, 26: 1 },

    // Text printed by the terminal popup.
    terminal: {
      welcome: 'Welcome. Type "help" to see available commands.',
      whoami: 'Krish Verma — CSE (AIML) student and developer from India.',
      projects: '1. claude context shift\n2. leetpush\n(more coming soon)',
      socials: 'twitter, github, linkedin, behance, instagram, discord'
    }
  };
})(window.App);
