#!/usr/bin/env node
/* build-posts.js
   Reads every  posts/*.md  file and writes  js/posts-data.js  (the data the site uses for the
   Writing list, the single-post page and the "Latest Post" card in the bento).

   Usage (run from the project folder):
     npm run build        build once
     npm run dev          build, then rebuild automatically whenever a file in posts/ is saved

   Rules:
     - one .md file = one post
     - files whose name starts with "_" (e.g. _template.md) are ignored
     - a post needs a front matter block at the top (title + date are required), see posts/_template.md
     - no dependencies: the Markdown converter is included below */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const OUT_FILE = path.join(ROOT, 'js', 'posts-data.js');
const COVERS = ['wave', 'grid', 'terrain'];

/* ============================== errors / warnings ============================== */

function BuildError(message) {
  this.message = message;
}

let currentFile = '';
let warnings = [];

function fail(message) {
  throw new BuildError(currentFile + ': ' + message);
}
function warn(message) {
  warnings.push(currentFile + ': ' + message);
}

/* ============================== front matter ============================== */

function parseFrontMatter(src) {
  src = src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const m = src.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) {
    fail('the file must start with a front matter block:\n' +
      '    ---\n    title: My post\n    date: 2026-09-30\n    ---');
  }
  const meta = {};
  m[1].split('\n').forEach(function (line, i) {
    if (!line.trim() || line.trim().charAt(0) === '#') return;
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) fail('front matter line ' + (i + 1) + ' should look like  key: value  but is: ' + line);
    let v = kv[2].trim();
    if (v.length > 1 && ((v[0] === '"' && v.slice(-1) === '"') || (v[0] === "'" && v.slice(-1) === "'"))) {
      v = v.slice(1, -1);
    }
    meta[kv[1].toLowerCase()] = v;
  });
  return { meta: meta, body: src.slice(m[0].length) };
}

/* ============================== markdown -> html ============================== */

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}

function linkHtml(url, innerHtml, title) {
  let href = url.trim();
  if (/^\s*(javascript|data|vbscript):/i.test(href)) href = '#';
  const external = /^(https?:)?\/\//i.test(href);
  return '<a href="' + escAttr(href) + '"' +
    (title ? ' title="' + escAttr(title) + '"' : '') +
    (external ? ' class="ext" target="_blank" rel="noopener noreferrer"' : '') +
    '>' + innerHtml + '</a>';
}

function emphasis(s) {
  return s
    .replace(/\*\*\*(?!\s)([\s\S]+?)(?<!\s)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?!\s)([\s\S]+?)(?<!\s)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\w)__(?!\s)([\s\S]+?)(?<!\s)__(?!\w)/g, '<strong>$1</strong>')
    .replace(/\*(?![\s*])([\s\S]+?)(?<![\s*])\*/g, '<em>$1</em>')
    .replace(/(?<!\w)_(?![\s_])([\s\S]+?)(?<![\s_])_(?!\w)/g, '<em>$1</em>')
    .replace(/~~(?!\s)([\s\S]+?)(?<!\s)~~/g, '<del>$1</del>');
}

// Inline formatting: `code`, math, links, images, **bold**, *italic*, ~~strike~~.
// Anything that must not be touched by later steps is parked in `stash` and put back at the end.
function inline(text) {
  const stash = [];
  function keep(html) {
    stash.push(html);
    return '\u0000' + (stash.length - 1) + '\u0000';
  }

  // code spans
  text = text.replace(/(`+)(?!`)([\s\S]+?)(?<!`)\1(?!`)/g, function (m, t, code) {
    return keep('<code>' + esc(code.trim()) + '</code>');
  });

  // math (KaTeX auto-render on the page reads \( \) and \[ \])
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, function (m, x) { return keep('\\[' + esc(x) + '\\]'); });
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, function (m, x) { return keep('\\(' + esc(x) + '\\)'); });
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, function (m, x) { return keep('\\[' + esc(x) + '\\]'); });
  text = text.replace(/(?<![\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\d$])/g, function (m, x) {
    return keep('\\(' + esc(x) + '\\)');
  });

  // backslash escapes:  \*  \_  \[  ...
  text = text.replace(/\\([\\`*_{}\[\]()#+\-.!~|>$])/g, function (m, c) { return keep(esc(c)); });

  // <https://autolinks>
  text = text.replace(/<(https?:\/\/[^\s<>]+)>/g, function (m, u) {
    return keep(linkHtml(u, esc(u)));
  });

  // images  ![alt](src "title")
  text = text.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g, function (m, alt, src, title) {
    return keep('<img src="' + escAttr(src) + '" alt="' + escAttr(alt) + '"' +
      (title ? ' title="' + escAttr(title) + '"' : '') + ' loading="lazy" decoding="async">');
  });

  // links  [text](url "title")
  text = text.replace(/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g, function (m, label, url, title) {
    return keep(linkHtml(url, emphasis(label), title));
  });

  // hard line break (two trailing spaces)
  text = text.replace(/ {2,}\n/g, '<br>\n');

  text = emphasis(text);

  // put the parked pieces back (they can be nested, so repeat)
  let guard = 0;
  while (/\u0000\d+\u0000/.test(text) && guard++ < 10) {
    text = text.replace(/\u0000(\d+)\u0000/g, function (m, n) { return stash[+n]; });
  }
  return text;
}

function codeBlock(code, lang) {
  return '<pre' + (lang ? ' data-lang="' + escAttr(lang) + '"' : '') + '><code' +
    (lang ? ' class="language-' + escAttr(lang) + '"' : '') + '>' + esc(code) + '</code></pre>';
}

const RE_FENCE = /^(\s*)(`{3,}|~{3,})\s*([\w+#.-]*)[^\n]*$/;
const RE_HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const RE_HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RE_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(\S.*)$/;
const RE_QUOTE = /^\s{0,3}>/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const RE_RAW_BLOCK = /^<(div|figure|details|summary|iframe|video|audio|aside|section|table|pre|center)\b/i;
const RE_LONE_IMAGE = /^!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)$/;

function startsBlock(line, next) {
  if (RE_FENCE.test(line) || RE_HEADING.test(line) || RE_HR.test(line) || RE_QUOTE.test(line)) return true;
  if (RE_RAW_BLOCK.test(line) || /^<!--/.test(line)) return true;
  const it = line.match(RE_ITEM);
  if (it && (!/\d/.test(it[2].charAt(0)) || /^1[.)]$/.test(it[2]))) return true;
  if (next !== undefined && line.indexOf('|') !== -1 && RE_TABLE_SEP.test(next)) return true;
  return false;
}

function splitRow(line) {
  let s = line.trim();
  if (s.charAt(0) === '|') s = s.slice(1);
  if (s.slice(-1) === '|' && s.slice(-2) !== '\\|') s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map(function (c) { return c.trim().replace(/\\\|/g, '|'); });
}

function tableHtml(header, sep, rows) {
  const aligns = splitRow(sep).map(function (c) {
    const l = c.charAt(0) === ':', r = c.slice(-1) === ':';
    return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
  });
  function cell(tag, text, i) {
    return '<' + tag + (aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '') + '>' + inline(text) + '</' + tag + '>';
  }
  return '<div class="table-wrap"><table><thead><tr>' +
    splitRow(header).map(function (c, i) { return cell('th', c, i); }).join('') +
    '</tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr>' + splitRow(r).map(function (c, i) { return cell('td', c, i); }).join('') + '</tr>';
    }).join('') +
    '</tbody></table></div>';
}

// Turns the flat list of items (each with an indent) into nested <ul>/<ol>.
function buildList(items, pos, indent) {
  const ordered = items[pos].ordered;
  const tag = ordered ? 'ol' : 'ul';
  const start = ordered && items[pos].num !== 1 ? ' start="' + items[pos].num + '"' : '';
  let html = '<' + tag + start + '>';
  while (pos < items.length && items[pos].indent === indent && items[pos].ordered === ordered) {
    let inner = inline(items[pos].text.join('\n'));
    pos++;
    while (pos < items.length && items[pos].indent > indent) {
      const sub = buildList(items, pos, items[pos].indent);
      inner += sub.html;
      pos = sub.pos;
    }
    html += '<li>' + inner + '</li>';
  }
  return { html: html + '</' + tag + '>', pos: pos };
}

function listHtml(buf) {
  const items = [];
  buf.forEach(function (l) {
    if (!l.trim()) return;
    const m = l.match(RE_ITEM);
    if (m) {
      items.push({
        indent: m[1].replace(/\t/g, '    ').length,
        ordered: /\d/.test(m[2].charAt(0)),
        num: parseInt(m[2], 10),
        text: [m[3]]
      });
    } else if (items.length) {
      items[items.length - 1].text.push(l.trim());
    }
  });
  let html = '', pos = 0;
  while (pos < items.length) {
    const r = buildList(items, pos, items[pos].indent);
    html += r.html;
    pos = r.pos;
  }
  return html;
}

function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // <!-- comment -->  (dropped from the output, handy for notes to yourself)
    if (/^\s*<!--/.test(line)) {
      while (i < lines.length && lines[i].indexOf('-->') === -1) i++;
      i++;
      continue;
    }

    // fenced code block
    let m = line.match(RE_FENCE);
    if (m) {
      const indent = m[1].length, ch = m[2].charAt(0), len = m[2].length, lang = m[3];
      const close = new RegExp('^\\s*' + ch + '{' + len + ',}\\s*$');
      const buf = [];
      const openedAt = i + 1;
      i++;
      while (i < lines.length && !close.test(lines[i])) {
        buf.push(lines[i].slice(0, indent).trim() === '' ? lines[i].slice(indent) : lines[i]);
        i++;
      }
      if (i >= lines.length) warn('the code block opened on body line ' + openedAt + ' is never closed (missing closing ```).');
      i++;
      out.push(codeBlock(buf.join('\n'), lang));
      continue;
    }

    // heading  (# / ## / ### ...). The post title is the page's h1, so "#" is shown as h2 too.
    m = line.match(RE_HEADING);
    if (m) {
      const level = Math.min(4, Math.max(2, m[1].length));
      out.push('<h' + level + '>' + inline(m[2]) + '</h' + level + '>');
      i++;
      continue;
    }

    // horizontal rule
    if (RE_HR.test(line)) { out.push('<hr>'); i++; continue; }

    // blockquote
    if (RE_QUOTE.test(line)) {
      const buf = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        buf.push(lines[i].replace(/^\s{0,3}> ?/, ''));
        i++;
      }
      out.push('<blockquote>' + blocks(buf) + '</blockquote>');
      continue;
    }

    // raw HTML block (div, figure, details, iframe, ...) runs until the next blank line
    if (RE_RAW_BLOCK.test(line)) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) { buf.push(lines[i]); i++; }
      out.push(buf.join('\n'));
      continue;
    }

    // table
    if (line.indexOf('|') !== -1 && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) {
      const header = line, sep = lines[i + 1], rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') !== -1) { rows.push(lines[i]); i++; }
      out.push(tableHtml(header, sep, rows));
      continue;
    }

    // list (bullets or numbers, nested by indenting)
    if (RE_ITEM.test(line)) {
      const buf = [];
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && (RE_ITEM.test(lines[j]) || /^\s{2,}\S/.test(lines[j]))) { i = j; continue; }
          break;
        }
        if (RE_ITEM.test(l) || /^\s+\S/.test(l)) { buf.push(l); i++; continue; }
        if (RE_FENCE.test(l) || RE_HEADING.test(l) || RE_HR.test(l) || RE_QUOTE.test(l)) break;
        buf.push(l); i++;           // text glued to the item above continues that item
      }
      out.push(listHtml(buf));
      continue;
    }

    // paragraph
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) {
      buf.push(lines[i]);
      i++;
    }
    const text = buf.join('\n').trim();
    const img = text.match(RE_LONE_IMAGE);
    if (img) {
      const caption = img[3] || img[1];
      out.push('<figure><img src="' + escAttr(img[2]) + '" alt="' + escAttr(img[1]) +
        '" loading="lazy" decoding="async">' +
        (caption ? '<figcaption>' + inline(caption) + '</figcaption>' : '') + '</figure>');
    } else {
      out.push('<p>' + inline(text) + '</p>');
    }
  }
  return out.join('\n');
}

function markdownToHtml(md) {
  return blocks(md.replace(/\t/g, '    ').split('\n'));
}

/* ============================== posts ============================== */

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function plainText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function readPost(file) {
  currentFile = 'posts/' + file;
  const parsed = parseFrontMatter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
  const meta = parsed.meta;

  if (/^(true|yes)$/i.test(meta.draft || '')) return null;

  if (!meta.title) fail('front matter is missing  title:');
  if (!meta.date) fail('front matter is missing  date:  (format 2026-09-30)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || isNaN(new Date(meta.date + 'T00:00:00').getTime())) {
    fail('date "' + meta.date + '" is not valid. Use YYYY-MM-DD, e.g. 2026-09-30 (two digits for month and day).');
  }

  const slug = slugify(meta.slug || file.replace(/\.md$/i, ''));
  if (!slug) fail('could not make a URL slug from the file name. Rename the file (letters, numbers and dashes).');

  let cover = (meta.cover || 'wave').toLowerCase();
  if (COVERS.indexOf(cover) === -1) {
    warn('cover "' + meta.cover + '" is not one of ' + COVERS.join(', ') + '. Using "wave".');
    cover = 'wave';
  }

  const html = markdownToHtml(parsed.body);

  let desc = meta.desc || meta.description || '';
  if (!desc) {
    const firstP = html.match(/<p>([\s\S]*?)<\/p>/);
    desc = firstP ? plainText(firstP[1]) : '';
    if (desc.length > 140) desc = desc.slice(0, 137).replace(/\s+\S*$/, '') + '...';
    warn('no  desc:  in the front matter, using the start of the post instead.');
  }

  return { slug: slug, title: meta.title, desc: desc, date: meta.date, cover: cover, html: html, _file: file };
}

function build() {
  warnings = [];
  currentFile = '';
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

  const files = fs.readdirSync(POSTS_DIR)
    .filter(function (f) { return /\.md$/i.test(f) && f.charAt(0) !== '_' && f.toLowerCase() !== 'readme.md'; })
    .sort();

  const posts = [];
  let drafts = 0;
  const seen = {};
  files.forEach(function (f) {
    const p = readPost(f);
    if (!p) { drafts++; return; }
    if (seen[p.slug]) {
      currentFile = 'posts/' + f;
      fail('slug "' + p.slug + '" is already used by posts/' + seen[p.slug] + '. Each post needs its own slug (file name).');
    }
    seen[p.slug] = f;
    posts.push(p);
  });

  // newest first; same date -> alphabetical by title
  posts.sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title);
  });

  const data = posts.map(function (p) {
    return { slug: p.slug, title: p.title, desc: p.desc, date: p.date, cover: p.cover, html: p.html };
  });

  const js =
    '/* posts-data.js\n' +
    '   GENERATED by scripts/build-posts.js from the files in posts/. Do not edit this file by hand:\n' +
    '   it is overwritten on every build. Edit or add files in posts/ instead, then run  npm run build\n' +
    '   (or keep  npm run dev  running). */\n' +
    '(function (App) {\n' +
    '  \'use strict\';\n' +
    '  App.config.posts = ' + JSON.stringify(data, null, 2) + ';\n' +
    '})(window.App);\n';

  const previous = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
  if (previous !== js) fs.writeFileSync(OUT_FILE, js);

  console.log('\nposts: ' + posts.length + ' published' + (drafts ? ', ' + drafts + ' draft skipped' : '') +
    (previous === js ? '  (js/posts-data.js already up to date)' : '  -> js/posts-data.js written'));
  posts.forEach(function (p) {
    console.log('  ' + p.date + '  #/writing/' + p.slug + '   (' + p._file + ')');
  });
  warnings.forEach(function (w) { console.log('  warning: ' + w); });
  return true;
}

function run() {
  try {
    return build();
  } catch (e) {
    if (e instanceof BuildError) {
      console.error('\nBuild failed - ' + e.message + '\n(js/posts-data.js was left as it was.)');
      return false;
    }
    throw e;
  }
}

/* ============================== entry ============================== */

if (process.argv.indexOf('--watch') !== -1) {
  run();
  console.log('\nWatching posts/ for changes. Press Ctrl+C to stop.');
  let timer = null;
  fs.watch(POSTS_DIR, function () {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
} else {
  process.exit(run() ? 0 : 1);
}
