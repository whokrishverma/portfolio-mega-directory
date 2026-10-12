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
    routes: ['/', '/about', '/writing', '/resume', '/projects', '/loadout', '/experience', '/music', '/chess'],

    // Path to the resume PDF file (place it under assets/, e.g. assets/resume.pdf).
    resumePdf: 'assets/resume/krishverma.pdf',

    // Emojis that shuffle in the footer (slowly on their own, quickly on hover).
    footerEmojis: ['🪄', '🏀', '♟️', '💃', '🏋️', '📚', '🚀', '🧑‍💻'],

    // Tech-stack marquee: keys must exist in tech-icons.js.
    techStack: ['python', 'docker', 'node', 'react', 'js', 'git', 'figma', 'vite'],

    // Decorative GitHub activity grid: cell index -> intensity (1 or 2). Replace with real data later.
    activityLit: { 1: 1, 2: 1, 8: 2, 9: 1, 12: 1, 22: 1, 25: 1, 26: 1 },

    // Chess page. Stats/games load live from chess.com's public API using this username.
    chess: {
      username: '',   // <- your chess.com username, e.g. 'krishverma'
      gamesToShow: 10,
      // Your collection. Add `img: 'assets/chess/name.jpg'` to show a photo.
      sets: [
        { name: 'Indian Chaturanga figurine set', origin: 'India', material: 'Hand-carved', note: 'Sculptural pieces inspired by the Chaturanga tradition, the ancestor of modern chess.', img: '' }
      ]
    },

    // Text printed by the terminal popup.
    terminal: {
      banner:
        ' █████╗ ██╗     ███████╗██████╗ ███████╗██████╗ \n' +
        '██╔══██╗██║     ██╔════╝██╔══██╗██╔════╝██╔══██╗\n' +
        '███████║██║     █████╗  ██████╔╝█████╗  ██║  ██║\n' +
        '██╔══██║██║     ██╔══╝  ██╔══██╗██╔══╝  ██║  ██║\n' +
        '██║  ██║███████╗██║     ██║  ██║███████╗██████╔╝\n' +
        '╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚══════╝╚═════╝ ',
      welcome: 'Welcome. Type "help" to see available commands.',
      whoami: 'Krish Verma — CSE (AIML) student and developer from India.',
      projects: '1. claude context shift\n2. leetpush\n(more coming soon)',
      socials: 'twitter, github, linkedin, behance, instagram, discord'
    },

    // Writing posts are NOT defined here. Each post is one Markdown file in posts/, and
    // `npm run build` (or `npm run dev`) turns them into js/posts-data.js, which fills App.config.posts.
    // See posts/_template.md for how to write one.
  };
})(window.App);
