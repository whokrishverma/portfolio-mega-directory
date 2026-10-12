# Krish Verma - Portfolio 

A static portfolio site: plain HTML, CSS and JavaScript. The only build step is the one that turns the blog
files in `posts/` into `js/posts-data.js` (see "Writing a blog post"). The site itself has no dependencies.
Open `index.html` in a browser (double-click works), or serve the folder with any static server.

## Structure

```
portfolio/
├── index.html            All page markup: nav, Home / About / Writing views, footer, popups
├── posts/                One Markdown file per blog post (+ _template.md to copy from)
├── scripts/
│   └── build-posts.js    Reads posts/*.md and writes js/posts-data.js
├── vercel.json           Tells Vercel to run the posts build on every deploy
├── css/                  Loaded in this order (later files build on earlier ones)
│   ├── tokens.css        Colour variables for dark (default) and light themes
│   ├── base.css          Reset, page background, container
│   ├── layout.css        Navigation bar, dropdown menu, view + title styles
│   ├── home.css          Hero text, buttons, project cards
│   ├── bento.css         Bento grid on the home page + the "view more" expand button
│   ├── contact.css       Contact callout, form, social buttons
│   ├── pages.css         About page and Writing page
│   ├── footer.css        Footer, emoji shuffle, view counter, clock
│   ├── overlays.css      Shortcuts popup, terminal popup, toast
│   └── responsive.css    Mobile + reduced-motion rules (keep last)
└── js/                   Plain scripts sharing one `App` namespace; loaded in this order
    ├── theme-init.js     Applies the saved theme before first paint (runs in <head>)
    ├── utils.js          App namespace, $ / $$ helpers, toast()
    ├── config.js         Settings + content you are likely to edit
    ├── posts-data.js     GENERATED from posts/*.md by the build script. Do not edit by hand
    ├── tech-icons.js     SVG artwork for the tech-stack marquee
    ├── theme.js          Dark / light toggle
    ├── router.js         Hash routing: #/, #/about, #/writing
    ├── menu.js           Nav dropdown
    ├── actions.js        data-scroll / data-action click handling (placeholder toasts)
    ├── overlays.js       Open/close shortcuts + terminal popups, focus handling
    ├── posts.js          Renders a single post page (#/writing/<slug>)
    ├── writing.js        Builds the post list on the Writing page
    ├── terminal.js       Terminal commands
    ├── shortcuts.js      Keyboard shortcuts
    ├── contact.js        Contact form validation
    ├── footer.js         View counter + shuffling emoji
    ├── hero.js           Wavy line under the intro
    ├── bento.js          Tech-stack marquee, activity grid, latest-post card (newest post), view more / view less
    ├── clock.js          Footer clock + "I'm probably working" status
    └── main.js           Starts the router (runs last)
```

## Where to change things

| To change | Edit |
| --- | --- |
| Name, intro text, projects, About story, social links | `index.html` |
| Blog posts (add / edit / remove) | `posts/*.md`, then `npm run build` |
| How a post looks (headings, lists, code, links, quotes...) | `css/post.css` |
| Colours | `css/tokens.css` |
| Time zone, view count, footer emojis, tech-stack order, terminal text | `js/config.js` |
| Add a tech icon | `js/tech-icons.js`, then add its key to `techStack` in `js/config.js` |
| Add a terminal command | `commands` in `js/terminal.js` |
| Gap at the screen edges when the bento is expanded | `--bento-gutter` in `css/bento.css` |
| Add a keyboard shortcut | `js/shortcuts.js` (and a row in the popup in `index.html`) |

## Writing a blog post

One file in `posts/` = one post. The Writing page list and the "Latest Post" card on the home page are built
from those files automatically (newest date first).

**Add a post**
1. Copy `posts/_template.md` and rename the copy, e.g. `posts/why-i-like-rust.md` (the file name becomes the URL:
   `#/writing/why-i-like-rust`).
2. Fill in the block at the top (`title`, `date` in `YYYY-MM-DD`, `desc`, `cover`) and write the post below it.
3. Run `npm run build` (or keep `npm run dev` running: it rebuilds every time you save a file in `posts/`).
4. Push. Vercel runs the build itself on every deploy (`vercel.json`).

**Edit a post**: change its `.md` file and build again. **Remove a post**: delete the file, or add `draft: true`
at the top to hide it without deleting.

`_template.md` shows every supported piece of Markdown (headings, bold/italic, links, bullet and numbered lists,
code blocks, quotes, images, tables, math, dividers). Files starting with `_` are never published.
Images go in `assets/posts/`.

`js/posts-data.js` is generated: never edit it by hand, your changes would be overwritten. It is committed to the
repo on purpose so the site also works if it is opened without running the build.

## Still placeholders (planned for the backend / pipeline step)

- Project cards 3-5, About "Toolbox" and "Building Websites" text, and the three placeholder blog posts in `posts/`
- Social links (point to site home pages), email (`hello@example.com`), resume link
- Portrait card in the bento grid, GitHub stats, WakaTime hours, Discord handle
- Contact form sending, RSS feed, project pages, real view counter

## Notes

- Fonts (Instrument Sans / Instrument Serif) load from Google Fonts; system fonts are used if offline.
- Bento sizes are written as `calc(N * var(--u))` instead of `rem`. `--u` is `1rem` normally; "view more" makes it
  grow with the screen width so the whole grid scales up together. Keep using `var(--u)` for new bento sizes.
- Dark is the default theme; the choice is saved in `localStorage`.
- Keyboard: `?` shortcuts, `g` then `h`/`a`/`w`/`c` to navigate, `t` theme, `` ` `` terminal, `Esc` closes.
# wkv
