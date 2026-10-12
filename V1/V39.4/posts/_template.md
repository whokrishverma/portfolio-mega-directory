---
# Copy this file, rename the copy (e.g. my-first-idea.md) and fill it in.
# Files whose name starts with "_" are ignored by the build, so this one never shows up on the site.
#
# title  (required)  shown as the post heading and in the Writing list
# date   (required)  YYYY-MM-DD. Newest date = top of the list = "Latest Post" in the bento
# desc   (recommended) one-line summary shown under the title in the list
# cover  (optional)  wave | grid | terrain   (default: wave)
# slug   (optional)  the URL part, default is the file name. #/writing/<slug>
# draft  (optional)  set to true to hide the post from the site while you are still writing it
title: Template post
date: 2026-09-30
desc: One line that gives readers a reason to open the post.
cover: wave
draft: false
---

Everything below the front matter is the post itself. The title above is already the page heading,
so start straight with text. A blank line starts a new paragraph.

<!-- Text inside a comment like this is a note to yourself and never appears on the site. -->

## Headings

Use `##` for a section heading and `###` for a smaller one inside it.

### A smaller heading

## Text formatting

You can write **bold**, *italic*, ~~strikethrough~~ and `inline code` inside any sentence.

A [link to another site](https://example.com) opens in a new tab. A link to your own page, like
[the writing list](#/writing), stays in the same tab.

## Lists

- A bullet point
- Another one
  - Indent by two spaces to nest a bullet inside it
- And a third

1. A numbered step
2. The next step
3. The last step

## Code

Put code between three backticks and write the language after the first set:

```python
def greet(name):
    return f"Hello, {name}!"
```

## Quotes

> A quote or a callout goes after a ">" sign.
> It can run over several lines.

## Images

Put the image file in `assets/posts/` and reference it. The text in the brackets is the alt text
and is also used as the caption unless you add a title in quotes:

![A caption for the image](assets/posts/example.png "Optional caption written here")

## Tables

| Model | Score | Notes |
| ----- | :---: | ----- |
| A     | 0.91  | Fast  |
| B     | 0.94  | Slower |

## Math

Inline math sits inside a sentence like $Y = b + mX$ (or `\( Y = b + mX \)`).
Big formulas get their own line between double dollar signs:

$$ \mathrm{Var}(e_i) = \sigma^2 \ \text{for all } i $$

---

Three dashes on a line make a divider like the one above.
