# Krish Verma - Portfolio 

A static portfolio site: plain HTML, CSS and JavaScript. No build step, no dependencies.
Open `index.html` in a browser (double-click works), or serve the folder with any static server.

## Structure

```
portfolio/
├── index.html            All page markup: nav, Home / About / Writing views, footer, popups
├── css/                  Loaded in this order (later files build on earlier ones)
│   ├── tokens.css        Colour variables for dark (default) and light themes
│   ├── base.css          Reset, page background, container
│   ├── layout.css        Navigation bar, dropdown menu, view + title styles
│   ├── gooey-nav.css     Liquid "goo" highlight on the active nav pill
│   ├── home.css          Hero text, buttons, project cards
│   ├── bento.css         Bento grid on the home page
│   ├── contact.css       Contact callout, form, social buttons
│   ├── pages.css         About page and Writing page
│   ├── footer.css        Footer, emoji shuffle, view counter, clock
│   ├── overlays.css      Shortcuts popup, terminal popup, toast
│   └── responsive.css    Mobile + reduced-motion rules (keep last)
└── js/                   Plain scripts sharing one `App` namespace; loaded in this order
    ├── theme-init.js     Applies the saved theme before first paint (runs in <head>)
    ├── utils.js          App namespace, $ / $$ helpers, toast()
    ├── config.js         Settings + content you are likely to edit
    ├── tech-icons.js     SVG artwork for the tech-stack marquee
    ├── theme.js          Dark / light toggle
    ├── router.js         Hash routing: #/, #/about, #/writing
    ├── menu.js           Nav dropdown
    ├── actions.js        data-scroll / data-action click handling (placeholder toasts)
    ├── overlays.js       Open/close shortcuts + terminal popups, focus handling
    ├── terminal.js       Terminal commands
    ├── shortcuts.js      Keyboard shortcuts
    ├── contact.js        Contact form validation
    ├── footer.js         View counter + shuffling emoji
    ├── hero.js           Wavy line under the intro
    ├── bento.js          Tech-stack marquee, activity grid, latest-post card
    ├── clock.js          Footer clock + "I'm probably working" status
    ├── main.js           Starts the router (runs last)
    └── gooey-nav.js      Liquid highlight that tracks the active nav pill
```

## Where to change things

| To change | Edit |
| --- | --- |
| Name, intro text, projects, About story, blog posts, social links | `index.html` |
| Colours | `css/tokens.css` |
| Time zone, view count, footer emojis, tech-stack order, terminal text | `js/config.js` |
| Add a tech icon | `js/tech-icons.js`, then add its key to `techStack` in `js/config.js` |
| Add a terminal command | `commands` in `js/terminal.js` |
| Add a keyboard shortcut | `js/shortcuts.js` (and a row in the popup in `index.html`) |

## Still placeholders (planned for the backend / pipeline step)

- Project cards 3-5, About "Toolbox" and "Building Websites" text, and the three blog posts
- Social links (point to site home pages), email (`hello@example.com`), resume link
- Portrait card in the bento grid, GitHub stats, WakaTime hours, Discord handle
- Contact form sending, RSS feed, project and blog pages, real view counter

## Notes

- Fonts (Instrument Sans / Instrument Serif) load from Google Fonts; system fonts are used if offline.
- Dark is the default theme; the choice is saved in `localStorage`.
- Keyboard: `?` shortcuts, `g` then `h`/`a`/`w`/`c` to navigate, `t` theme, `` ` `` terminal, `Esc` closes.
