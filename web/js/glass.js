// Liquid Glass wiring. The glass itself is Glisse's code (glisse.js, glisse.css);
// this file puts it on the app's own elements, which Glisse does with React
// components and this app, having no React, does here:
//   - the rim light on every glass control, painted to its exact size;
//   - the press: a held button grows, leans after the finger and springs back;
//   - the tab bar and the segmented controls: a selection that springs between
//     tabs, follows a drag, and lifts into a lens while held.
import {
  presser, paintRim, refractsBackdrop, fitBackdropLens, fitSelection, attach, GLASS, TAB_LENS, SEGMENT_LENS,
} from './glisse.js';

// The app's glass controls. Keep in step with the same list in styles.css.
const GLASS_SEL = '.btn:not(.ghost), .icon-btn, .stp, .chip, .tround-ic, .in, select, .t-hide, .t-btns button, .t-mini, #toast';
// The ones that take a press, as Glisse's Button does.
const PRESS_SEL = '.btn:not(.ghost), .icon-btn, .stp, .chip, .tround, .t-hide, .t-btns button, .t-mini';
const SEGMENTED_SEL = '.lg-segmented';

// ---- fitting: each glass is fitted when it appears and whenever its size
// changes. One observer serves them all; its callback runs before the browser
// paints, so a control never shows without its rim.
const fits = new WeakMap();
const sizes = new ResizeObserver((entries) => {
  for (const { target } of entries) fits.get(target)?.(target);
});
function fit(el, how) {
  if (fits.has(el)) return;
  fits.set(el, how);
  sizes.observe(el);
}
function unfit(el) {
  if (!fits.delete(el)) return;
  sizes.unobserve(el);
}
const whenIdle = window.requestIdleCallback ? (run) => requestIdleCallback(run, { timeout: 500 }) : (run) => setTimeout(run, 50);
// Glisse's Glass: the lit rim, and in Chromium (the only engine that can) the
// glass also bends what's behind it.
function fitGlass(el) {
  paintRim(el);
  if (refractsBackdrop()) fitBackdropLens(el, GLASS);
}

// ---- press, for the whole page: the app redraws its buttons all the time,
// so presses are picked up where they land rather than button by button.
const pressers = new WeakMap();
let pressing = null;
function onPress(ev) {
  let el = ev.target.closest && ev.target.closest(PRESS_SEL);
  if (!el) return;
  // The rest-timer button is a round glass button over a label: the glass presses.
  if (el.matches('.tround')) el = el.querySelector('.tround-ic') || el;
  let p = pressers.get(el);
  if (!p) pressers.set(el, (p = presser(el)));
  pressing = p;
  p.down(ev);
}

// ---- tab bars and segmented controls
const copy = (label) => `<span class="lg-tab-copy">${label}</span>`;
// Glisse's markup for a row of choices (see Segments in its segments.tsx).
function segmentsHTML(segmented, tabs, labels) {
  return `<span class="lg-glass lg-tab-bar-glass" aria-hidden="true"></span>
    ${segmented ? '<span class="lg-segmented-thumb" aria-hidden="true"></span>' : ''}
    <span class="lg-tab-labels" role="none">${tabs.join('')}</span>
    <span class="lg-tab-labels lg-tab-lensed" aria-hidden="true">${labels.map(copy).join('')}</span>
    <span class="lg-tab-tint" aria-hidden="true"><span class="lg-tab-row">${labels.map(copy).join('')}</span></span>
    <span class="lg-glass lg-tab-lens" aria-hidden="true"></span>`;
}
function wire(bar, segmented) {
  const q = (sel) => bar.querySelector(sel);
  const parts = {
    bar, glass: q('.lg-tab-bar-glass'), thumb: q('.lg-segmented-thumb'), labels: q('.lg-tab-labels:not(.lg-tab-lensed)'),
    lensed: q('.lg-tab-lensed'), lens: q('.lg-tab-lens'), tint: q('.lg-tab-tint'), row: q('.lg-tab-row'),
  };
  fit(parts.glass, fitGlass);
  // The lifted lens's rims (a segmented control's lens also bends its backdrop
  // in Chromium). They only show once it's held, so they're fitted when the
  // page is idle, as Glisse fits them.
  fit(parts.lens, (el) => whenIdle(() => el.isConnected && fitSelection(el, segmented && refractsBackdrop())));
  const control = attach(parts, segmented ? SEGMENT_LENS : TAB_LENS, !segmented, () => {});
  const destroy = control.destroy;
  control.destroy = () => {
    unfit(parts.glass);
    unfit(parts.lens);
    destroy();
  };
  return control;
}
function mark(bar, index) {
  bar.style.setProperty('--lg-index', Math.max(index, 0));
  for (const group of bar.querySelectorAll('.lg-tab-labels')) {
    [...group.children].forEach((tab, i) => tab.toggleAttribute('data-selected', i === index));
  }
}

/** A tab bar, as iOS 26's. `items` are { key, label, icon, href }. Returns { select(index) }. */
export function tabBar(bar, items) {
  const face = (it) => `<span class="lg-tab-icon" aria-hidden="true">${it.icon}</span><span class="lg-tab-label">${it.label}</span>`;
  bar.classList.add('lg-tab-bar');
  bar.dataset.icons = '';
  bar.style.setProperty('--lg-tabs', items.length);
  bar.innerHTML = segmentsHTML(false,
    items.map((it) => `<a class="lg-tab" href="${it.href}" data-tab="${it.key}" draggable="false"><span class="lg-tab-face">${face(it)}</span></a>`),
    items.map(face));
  const control = wire(bar, false);
  return {
    select(index) {
      mark(bar, index);
      control.setActive(index);
    },
  };
}

/** The markup of a segmented control, as iOS 26's. `opts` are [value, label]; the buttons carry data-seg / data-val. */
export function segmentedHTML(name, opts, val) {
  const text = (label) => `<span class="lg-tab-text">${label}</span>`;
  const index = opts.findIndex(([v]) => v === val);
  return `<div class="lg-segmented seg" role="radiogroup" data-name="${name}" data-index="${index}" style="--lg-index:${Math.max(index, 0)};--lg-tabs:${opts.length}">${segmentsHTML(true,
    opts.map(([v, l], i) => `<button type="button" role="radio" class="lg-tab${i === index ? ' on' : ''}" data-seg="${name}" data-val="${v}" aria-checked="${i === index}"${i === index ? ' data-selected' : ''}><span class="lg-tab-face">${text(l)}</span></button>`),
    opts.map(([, l]) => text(l)))}</div>`;
}
// The app redraws a whole card when a segment is tapped, which would swap the
// control for a new one mid-gesture. So the control that's already there is
// kept, as React keeps Glisse's, and given the new choice: its selection
// settles from wherever it was, lifted or not. redraw() below keeps it in
// place; a control that did get replaced (a whole screen redrawn) is put back
// in the new one's place.
const segmented = new Map(); // name -> { bar, control }
const choices = (bar) => [...bar.querySelectorAll('.lg-tab')].map((tab) => `${tab.dataset.val}=${tab.textContent}`).join('|');
function choose(bar, index) {
  bar.dataset.index = index;
  mark(bar, index);
  bar.querySelectorAll('.lg-tab').forEach((tab, i) => {
    tab.classList.toggle('on', i === index);
    tab.setAttribute('aria-checked', i === index);
  });
}
// Its segments share the control's width, whatever that is.
const widths = new ResizeObserver((entries) => {
  for (const { target } of entries) {
    const tabs = target.querySelector('.lg-tab-labels');
    if (tabs && target.clientWidth) target.style.setProperty('--lg-tab-width', `${target.clientWidth / tabs.children.length}px`);
  }
});
function adoptSegmented(bar) {
  const name = bar.dataset.name;
  const index = +bar.dataset.index;
  const old = segmented.get(name);
  if (old && old.bar === bar) return;
  if (old && !old.bar.isConnected && choices(old.bar) === choices(bar)) {
    bar.replaceWith(old.bar);
    choose(old.bar, index);
    old.control.setActive(index);
    return;
  }
  if (old) {
    old.control.destroy();
    widths.unobserve(old.bar);
  }
  bar.style.setProperty('--lg-tab-width', `${bar.clientWidth / bar.querySelector('.lg-tab-labels').children.length}px`);
  mark(bar, index);
  const control = wire(bar, true);
  control.setActive(index);
  widths.observe(bar);
  segmented.set(name, { bar, control });
}

/**
 * Sets an element's contents, like innerHTML, but leaves the segmented
 * controls already in it (its direct children) in the page, with their new
 * choice. A control taken out of the page, even for an instant, loses its
 * running fades; one left in place settles exactly as Glisse's does.
 */
export function redraw(el, html) {
  const fresh = document.createElement('template');
  fresh.innerHTML = html;
  const kept = new Map(); // live control -> its new index
  const nodes = [...fresh.content.childNodes].map((node) => {
    if (node.nodeType !== 1 || !node.matches(SEGMENTED_SEL)) return node;
    const live = segmented.get(node.dataset.name);
    if (!live || live.bar.parentNode !== el || choices(live.bar) !== choices(node)) return node;
    kept.set(live.bar, +node.dataset.index);
    return live.bar;
  });
  for (const child of [...el.childNodes]) if (!kept.has(child)) child.remove();
  let next = el.firstChild; // the next control that stayed
  for (const node of nodes) {
    if (node === next) next = next.nextSibling;
    else el.insertBefore(node, next);
  }
  for (const [bar, index] of kept) {
    choose(bar, index);
    segmented.get(bar.dataset.name).control.setActive(index);
  }
}

// ---- the page: adopt glass as it appears, let go of it as it leaves
function adopt(root) {
  if (root.matches(GLASS_SEL)) fit(root, fitGlass);
  for (const el of root.querySelectorAll(GLASS_SEL)) fit(el, fitGlass);
  const bars = root.matches(SEGMENTED_SEL) ? [root] : root.querySelectorAll(SEGMENTED_SEL);
  for (const bar of bars) adoptSegmented(bar);
}
function drop(root) {
  if (root.matches(GLASS_SEL)) unfit(root);
  for (const el of root.querySelectorAll(GLASS_SEL)) unfit(el);
}
function sweep() {
  for (const [name, { bar, control }] of segmented) {
    if (bar.isConnected) continue;
    control.destroy();
    widths.unobserve(bar);
    segmented.delete(name);
  }
}

export function initGlass() {
  document.addEventListener('pointerdown', onPress);
  window.addEventListener('blur', () => pressing && pressing.end());
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node.nodeType === 1 && node.isConnected) adopt(node);
      for (const node of record.removedNodes) if (node.nodeType === 1 && !node.isConnected) drop(node);
    }
    sweep();
  }).observe(document.body, { childList: true, subtree: true });
  adopt(document.body);
}
