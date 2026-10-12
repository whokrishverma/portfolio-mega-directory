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
    },

    // Writing posts. Each gets its own URL at #/writing/<slug>.
    // cover: 'wave' | 'grid' | 'terrain' — decorative banner style (see js/posts.js).
    // Body paragraphs may contain inline HTML. Wrap math in \( ... \) (inline) or \[ ... \] (block); it's
    // rendered by KaTeX. Replace this placeholder copy with your own writing whenever you're ready.
    posts: [
      {
        slug: 'your-first-post-title',
        title: 'Your first post title',
        desc: 'A one-line summary of the post goes here.',
        date: '2026-09-12',
        cover: 'wave',
        sections: [
          {
            heading: 'Start here',
            body: [
              'Replace this placeholder with your first section. Write a paragraph or two setting up the idea before you get into specifics.',
              'A second paragraph reads naturally under the first — use this rhythm for the rest of the post: a heading, then one or two short paragraphs.'
            ]
          },
          {
            heading: 'A worked example',
            body: [
              'This section shows inline math like \\(Y = b + mX\\), which renders next to the text it belongs to.',
              'Bigger expressions can sit on their own line as a block: \\[ \\mathrm{Var}(e_i) = \\sigma^2 \\ \\text{for all } i \\]',
              'Swap in whatever formulas, code, or explanation the post actually needs — this is just a placeholder showing the layout.'
            ]
          }
        ]
      },
      {
        slug: 'another-post-title',
        title: 'Another post title',
        desc: 'A short description that gives readers a reason to open it.',
        date: '2026-08-30',
        cover: 'grid',
        sections: [
          {
            heading: 'Placeholder heading',
            body: [
              'Replace this with the real content of the post. Keep one idea per heading so the page stays easy to scan.',
              'Add as many sections as the post needs — the template scrolls naturally, there is no fixed length.'
            ]
          }
        ]
      },
      {
        slug: 'a-third-post-title',
        title: 'A third post title',
        desc: 'Replace these placeholders with your own writing.',
        date: '2026-07-12',
        cover: 'terrain',
        sections: [
          {
            heading: 'Placeholder heading',
            body: [
              'Replace this with the real content of the post.',
              'This third post is here mainly to show that every post in the list opens the same way, regardless of which one you click.'
            ]
          }
        ]
      }
    ]
  };
})(window.App);
