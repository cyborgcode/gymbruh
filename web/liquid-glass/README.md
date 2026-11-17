# Liquid Glass kit

iOS 26's Liquid Glass for any web app: plain HTML, CSS and JavaScript, no framework and no build step.

The glass is [Glisse](https://github.com/0kzh/glisse)'s own code (MIT). Glisse ships it as React components; this kit carries the same code in a form any page can use. Every component here was compared with the real Glisse component on the same background and matches it pixel for pixel, at rest and while pressed, dragged and released.

**See it:** open [`demo.html`](demo.html) (every component, with the markup under each one). **Start from it:** [`starter.html`](starter.html) is a small app shell (docked tab bar, pages, a sheet) to copy for a new project. Both need a web server, because browsers don't load JavaScript modules from `file://`:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/demo.html`.

## Add it to a project

**1. Copy this folder into the project**, somewhere the site serves it (for example `public/liquid-glass/`).

```bash
cp -r liquid-glass /path/to/your-project/public/
```

**2. Load it** on every page that uses it. Glisse's stylesheet goes first, then the kit's, then your own.

```html
<link rel="stylesheet" href="/liquid-glass/glisse.css">
<link rel="stylesheet" href="/liquid-glass/liquid-glass.css">
<link rel="stylesheet" href="/your-own.css">

<script type="module">
  import { liquidGlass } from '/liquid-glass/liquid-glass.js';
  liquidGlass();
</script>
```

**3. Write the markup.** Everything with Glisse's classes or the kit's `data-lg-…` attributes is picked up when the page loads and whenever it's added later.

```html
<button class="lg-glass lg-button" data-variant="filled">Continue</button>
```

That's the whole setup. If the project bundles its JavaScript (Vite, webpack, …), import `liquid-glass.js` and the two stylesheets from wherever you put the folder instead.

## Components

Each one works from markup alone. The function in the last column does the same from JavaScript, for pages that build their interface in code.

| Component | Markup | Function |
| --- | --- | --- |
| Button | `<button class="lg-glass lg-button">` | (none needed) |
| Glass | `<div class="lg-glass">` | (none needed) |
| Surface | `<div class="lg-surface">` | (none needed) |
| Tab bar | `<nav data-lg-tabs>` | `tabBar(el, options)` |
| Segmented control | `<div data-lg-segmented>` | `segmentedControl(el, options)` |
| Switch | `<input type="checkbox" data-lg-switch>` | `switchControl(el, options)` |
| Slider | `<input type="range" data-lg-slider>` | `slider(input)` |
| Text field | `<input data-lg-input>` | `inputField(input, options)` |
| Menu | `<div data-lg-menu>` | `menu(el, options)` |

### Button

```html
<button class="lg-glass lg-button">Glass</button>
<button class="lg-glass lg-button" data-variant="filled">Filled</button>
<button class="lg-glass lg-button" data-destructive>Delete</button>
<button class="lg-glass lg-button" data-icon="only" aria-label="Add"><svg>…</svg></button>
<button class="lg-glass lg-button" data-icon><svg>…</svg>With icon</button>
<button class="lg-glass lg-button" data-tint style="--lg-tint: #ff9f0a">Tinted</button>
```

Held, a button grows under the finger, leans after it and springs back. Two extras that aren't in Glisse: `data-size="large"` (50px, for a screen's main action) and `data-block` (full width).

### Glass and surface

`lg-glass` makes any element glass: the clear material with a lit rim, for controls and small floating pieces. `lg-surface` is for sheets, dialogs and popovers: more frost, an edge line and a soft shadow.

### Tab bar

```html
<nav class="lg-dock" data-lg-tabs="route" aria-label="Main">
  <a href="/"><svg>…</svg>Home</a>
  <a href="/plan"><svg>…</svg>Plan</a>
  <a href="/stats"><svg>…</svg>Stats</a>
</nav>
```

- Links make it navigation; use `<button data-value="…">` children for tabs that don't navigate. Leave the icons out for a text-only bar.
- `data-lg-tabs="route"` keeps the selection on the link that matches the address (`/plan` also matches `/plan/week-3`; `#/plan` links work the same way). Without it, mark the selected tab with `data-selected`.
- `lg-dock` pins the bar to the bottom of the screen, centred, clear of the iPhone's home indicator. Leave room under your content: `padding-bottom: var(--lg-dock-space)`.

```js
const tabs = tabBar(document.querySelector('nav'), {
  items: [{ value: 'home', label: 'Home', icon: '<svg>…</svg>', href: '#/home' }, …],
  value: 'home',
  onChange: (value, index) => {},
});
tabs.select('plan');   // by value or by index, without calling onChange
```

### Segmented control

```html
<div data-lg-segmented>
  <button data-value="week" data-selected>Week</button>
  <button data-value="month">Month</button>
</div>
```

Add `data-stretch` to make it as wide as its container (its segments share the width). From JavaScript: `segmentedControl(el, { items: [{ value, label }], value, stretch, onChange })`.

### Switch

```html
<label><input type="checkbox" data-lg-switch checked> Sound</label>
```

The checkbox stays in the page, hidden: it keeps its value in a form and fires its own `input` and `change` events, so existing code keeps working. `switchControl(el, { checked, onChange })` returns `{ checked, set(checked) }`.

### Slider

```html
<input type="range" data-lg-slider min="0" max="100" value="40">
```

The range input stays the control (value, events, form); the glass thumb is drawn under it. Setting `input.value` from script moves the thumb.

### Text field

```html
<input data-lg-input placeholder="Name">
<input type="search" data-lg-input>
```

A search field gets Glisse's magnifier and a clear button. `inputField(input, { icon: '<svg>…</svg>' })` puts your own icon in front.

### Menu

```html
<div data-lg-menu aria-label="More">
  <button data-value="rename">Rename</button>
  <button data-value="share">Share</button>
  <hr>
  <button data-value="delete" data-destructive>Delete</button>
</div>
```

A round glass button that opens into a card of choices; press and slide over them to pick one. Whatever click handler your own buttons had still runs when their choice is picked. `data-align="start"` opens the card from the button's left edge instead of its right. From JavaScript: `menu(el, { items: [{ label, icon, value, onSelect, destructive, disabled }, 'separator'], label, align })`.

## What the page hears

| Event | Fired on | `event.detail` |
| --- | --- | --- |
| `lg-change` | tab bar, segmented control | `{ value, index }` |
| `lg-change` | switch | `{ checked }` |
| `input`, `change` | the checkbox behind a switch, the range input of a slider, a text field | (the native events) |
| `lg-select` | menu | `{ value, index }` |

All of them bubble, so one listener on a container is enough.

## Theme

- **Light and dark:** Glisse follows the system setting. To choose, put `data-theme="dark"` or `data-theme="light"` on `<html>`.
- **Accent colour:** `:root { --lg-fill: #ff9f0a; }` colours filled buttons, the selected tab, sliders. `--lg-on` is the switch's "on" colour.
- **Everything else** (glass tint, edge, shadows) is a `--lg-…` variable at the top of `glisse.css`. Override them in your own stylesheet; don't edit `glisse.css`.

## Putting it on an app that already exists

There are two ways. Start with the first; move to the second for the parts you want exact.

**Dress what's there.** Tell the kit which of your elements are buttons, fields and panels. It paints them as glass and leaves their size, spacing and text alone.

```js
liquidGlass({
  adopt: {
    filled:  '.btn-primary',          // the main action, in the accent colour
    button:  '.btn, .icon-button',
    input:   'input.field, select',
    glass:   '.chip',                 // glass that isn't pressed
    surface: '.modal, .sheet',
  },
});
```

**Style it yourself.** For full control, give your own classes Glisse's glass in your stylesheet and tell the kit to paint their rim and handle their press:

```css
.btn {
  position: relative;
  border: 0;
  border-radius: 999px;
  background-color: var(--lg-glass);
  background-image: var(--lg-rim, none);
  background-size: 100% 100%;
  -webkit-backdrop-filter: blur(var(--lg-blur, 3px)) var(--lg-filter, saturate(1.5));
  backdrop-filter: blur(var(--lg-blur, 3px)) var(--lg-filter, saturate(1.5));
  box-shadow: inset 0 0 0 0.5px var(--lg-edge), 0 1px 3px var(--lg-drop);
}
.btn[data-rim] { box-shadow: 0 1px 3px var(--lg-drop); }      /* the painted rim carries the edge line */
.btn:is(:active, [data-pressed]) { background-color: var(--lg-glass-active); }
.btn.primary { background-color: var(--lg-fill); color: #fff; }
```

```js
liquidGlass({ glass: '.btn, .chip', press: '.btn' });
```

GymBruh, the app this kit came from, does it this way: see the "Liquid Glass" section at the end of its `web/styles.css`, and its `web/js/glass.js`.

A checklist for a whole app:

1. Copy the folder in, link the two stylesheets before your own, call `liquidGlass()`.
2. Set `data-theme` on `<html>` if the app has only one theme, and `--lg-fill` to its accent colour.
3. Replace the navigation with a tab bar (`data-lg-tabs`, usually with `lg-dock`), and add `padding-bottom: var(--lg-dock-space)` to the scrolling content.
4. Buttons: `adopt` them, or style them as above. Remove any `:active { transform: scale(…) }` of your own; the kit's press replaces it.
5. Toggles, range inputs, search boxes, tab-like switches: add `data-lg-switch`, `data-lg-slider`, `data-lg-input`, `data-lg-segmented`.
6. Sheets, dialogs, popovers: `lg-surface` (or `adopt.surface`).
7. Everything else pinned with `position: fixed` (a header, a floating button, overlays): add `var(--lg-viewport-top)` / `var(--lg-viewport-bottom)` as shown under "Things to know", so iOS 26's keyboard bug can't leave it mid-screen.
8. If the app has a service worker with a list of files to cache, add `glisse.css`, `liquid-glass.css`, `glisse.js` and `liquid-glass.js` to it.

## Handing it to an AI coding agent

Copy the folder into the project, then give the agent this:

> Apply the Liquid Glass kit in `liquid-glass/` to this app. Read `liquid-glass/README.md` first and follow its checklist under "Putting it on an app that already exists". Keep every feature and all content as they are; change only how things look and feel. Use the kit's components for the navigation, buttons, toggles, sliders, text fields, segmented switches and sheets. Don't edit `glisse.js` or `glisse.css`. When you're done, list what you changed and anything you couldn't convert.

## Frameworks

- **React:** use Glisse itself (`npm install glisse`); it is the same glass as real React components.
- **Vue, Svelte, Angular, Astro, plain templates:** the markup above works as it is. For the components the kit builds inside an element (tab bar, segmented control, menu), give the kit an element the framework doesn't fill in, and call the function when it mounts:

  ```js
  onMount(() => { const bar = tabBar(el, { items, value, onChange }); return () => bar.destroy(); });
  ```

- **Pages drawn from strings** (`innerHTML = …`): `segmentedHTML({ name, items, value })` returns a segmented control as markup, and `redraw(el, html)` sets an element's contents while leaving its segmented controls in place, so a control that was just tapped finishes its animation instead of being replaced mid-way.

## `liquidGlass(options)`

| Option | What it does |
| --- | --- |
| `adopt` | `{ filled, button, input, glass, surface }`: selectors of your own elements to dress as glass (see above). |
| `glass` | More selectors that are glass. You style them; the kit paints the rim light. |
| `press` | More selectors that take the press. |
| `pressTarget` | `(el) => element`: which element grows, when it isn't the one pressed. |
| `bend` | `false` stops Chromium from bending the backdrop behind each glass (see below). The frost and rim stay. |

Calling it again adds to what was set before.

## Things to know

- **Hiding the scroll bar.** iOS shows the page's own scroll indicator whatever CSS says, but it hides an element's. So to hide it, don't let the page scroll: put the content in a scroller and stop the page.

  ```html
  <style>html, body { height: 100%; overflow: hidden; }</style>
  <div class="lg-scroller" id="scroller"><main>…</main></div>
  ```

  Then scroll that element (`scroller.scrollTo(…)`, `scroller.scrollTop`) instead of `window`. `position: sticky` and `scrollIntoView` work inside it as they did. iOS's "tap the status bar to go to the top" only works on the page itself, so give the app another way back to the top (GymBruh: tap the tab you're on).
- **iOS 26's keyboard bug.** After the on-screen keyboard closes, iOS 26 can leave everything pinned with `position: fixed` out of place: a bar pinned to the bottom floats in the middle of the screen until iOS puts itself right. The kit measures where pinned elements are laid out against where the screen really is, and moves `.lg-dock` back by itself. For pinned elements of your own, use the two variables it sets on `<html>` (both `0px` except in that state, and never while typing):

  ```css
  .my-bottom-bar { position: fixed; bottom: calc(16px - var(--lg-viewport-bottom)); }
  .my-header     { position: fixed; top: var(--lg-viewport-top); }
  .my-overlay    { position: fixed; inset: var(--lg-viewport-top) 0 calc(0px - var(--lg-viewport-bottom)) 0; }
  ```

- **Safari and Chrome differ, as they do in Glisse.** Only Chromium can bend the live page behind a piece of glass. On iPhone and in Safari the glass shows frost and its lit rim, and the lifted lens bends the tab labels under it; in Chrome and on Android the glass also bends what's behind it. That bending costs one SVG filter per size of glass; on a page with a great many glass elements, `bend: false` turns it off.
- **Glass needs something behind it.** It is almost clear (3px of blur), so it looks best floating over content, and plain on a flat background.
- **`backdrop-filter` stops at some ancestors.** A parent with `opacity` below 1, a `filter`, a `mask` or its own `backdrop-filter` becomes what the glass sees through to, instead of the page. If glass inside such a parent looks flat, that's why.
- **Labels are text; icons are markup.** Labels are escaped. Icons (`icon: '<svg>…</svg>'`) are inserted as HTML, so only pass markup you wrote.
- **Sizes are Glisse's**, measured from iOS: buttons and fields 40px tall, the segmented control 32px, the icon tab bar 60px. Your own stylesheet can change them.
- The files are unminified: about 100 KB of JavaScript (29 KB gzipped) and 35 KB of CSS (9 KB gzipped). Minify them with your usual tool if that matters.

## What's in the folder

| File | What it is |
| --- | --- |
| `glisse.js` | Glisse's code: springs, press, lens, rim light, and the behaviour of each control. Generated; don't edit. |
| `glisse.css` | Glisse's stylesheet, unchanged. Generated; don't edit. |
| `liquid-glass.js` | The kit: what Glisse's React components do, in plain DOM. |
| `liquid-glass.css` | The kit's additions: surface, docked tab bar, stretch, large button, and the `adopt` skins. |
| `demo.html` | Every component, with its markup. |
| `starter.html` | A small app shell to start a new project from. |
| `GLISSE-LICENSE` | Glisse's MIT licence. Keep it with the files. |

`glisse.js` and `glisse.css` are built from the Glisse npm package by `scripts/vendor_glisse.py` in the GymBruh repository. To move to a newer Glisse, run it against the new package and re-check the line numbers it names.

## Licence

Glisse is © Kelvin Zhang, MIT licence (`GLISSE-LICENSE`). `glisse.js` and `glisse.css` are Glisse's code and carry that notice; `liquid-glass.js` builds Glisse's markup and calls Glisse's code, so keep the licence file with the kit wherever you copy it.
