// Liquid Glass kit: iOS 26's glass for any web page. No framework, no build step.
//
// The glass is Glisse's own code (glisse.js and glisse.css, beside this file;
// https://github.com/0kzh/glisse, MIT). Glisse ships it as React components;
// this file does their job with plain DOM, so any page can use it:
//
//   import { liquidGlass } from './liquid-glass/liquid-glass.js';
//   liquidGlass();
//
// After that, markup is enough (see README.md and demo.html):
//
//   <button class="lg-glass lg-button">Glass</button>
//   <nav data-lg-tabs="route"> <a href="/">Home</a> <a href="/plan">Plan</a> </nav>
//   <input type="checkbox" data-lg-switch checked>
//
// or call the functions below yourself: tabBar, segmentedControl,
// switchControl, slider, inputField, menu.
import {
  presser, paintRim, onThemeChange, refractsBackdrop, fitBackdropLens, fitSelection,
  attach, attachMenu, attachSlider, attachSwitch, GLASS, TAB_LENS, SEGMENT_LENS, TRAVEL,
} from './glisse.js';

const esc = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const attrs = (map) => Object.entries(map || {}).map(([k, v]) => (v === false || v == null ? '' : ` ${k}${v === true ? '' : `="${esc(v)}"`}`)).join('');
const ref = (current = null) => ({ current }); // what Glisse's effects read their elements off
const emit = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
const whenIdle = window.requestIdleCallback ? (run) => requestIdleCallback(run, { timeout: 500 }) : (run) => setTimeout(run, 50);

// ---------------------------------------------------------------- settings
// What is glass, what takes a press, and what the kit builds from markup.
const GLASS_SELECTOR = '.lg-glass:not(.lg-tab-bar-glass):not(.lg-tab-lens), [data-lg-skin="glass"], [data-lg-skin="button"], [data-lg-skin="input"]';
const PRESS_SELECTOR = '.lg-button, [data-lg-skin="button"]';
const DECLARED = '[data-lg-tabs], [data-lg-segmented], [data-lg-switch], [data-lg-slider], [data-lg-input], [data-lg-menu], .lg-segmented[data-name]';
const settings = { glass: GLASS_SELECTOR, press: PRESS_SELECTOR, pressTarget: null, bend: true, adopt: {} };

// ---------------------------------------------------------------- the rim
// Each glass is fitted when it appears and whenever its size changes: its rim
// light is painted to its exact shape, and in Chromium (the only engine that
// can) the glass also bends what's behind it. One observer serves them all;
// it reports before the browser paints, so a glass never shows without its rim.
const fits = new Map(); // element -> how to fit it
const sizes = new ResizeObserver((entries) => {
  for (const { target } of entries) fits.get(target)?.(target);
});
function fit(el, how) {
  if (fits.has(el)) return;
  fits.set(el, how);
  sizes.observe(el);
}
function unfit(el) {
  if (fits.delete(el)) sizes.unobserve(el);
}
function fitGlass(el) {
  paintRim(el);
  if (settings.bend && refractsBackdrop()) fitBackdropLens(el, GLASS);
}

// ---------------------------------------------------------------- the press
// Glisse's Button: held, it grows under the finger, leans after it and
// springs back. Presses are picked up for the whole page, so buttons drawn
// later (or redrawn) need nothing done to them.
const pressers = new WeakMap();
let pressing = null;
function onPress(ev) {
  let el = ev.target.closest && ev.target.closest(settings.press);
  if (!el) return;
  if (settings.pressTarget) el = settings.pressTarget(el) || el;
  let p = pressers.get(el);
  if (!p) pressers.set(el, (p = presser(el)));
  pressing = p;
  p.down(ev);
}

// ---------------------------------------------------------------- tab bar and segmented control
// Glisse's markup for a row of choices (Segments in its segments.tsx).
function face(item) {
  if (item.icon == null) return `<span class="lg-tab-text">${esc(item.label)}</span>`;
  return `<span class="lg-tab-icon" aria-hidden="true">${item.icon}</span><span class="lg-tab-label">${esc(item.label)}</span>`;
}
function tabHTML(segmented, item, i, index) {
  const on = i === index;
  if (item.href != null) {
    return `<a class="lg-tab" href="${esc(item.href)}" draggable="false"${attrs({ 'data-value': item.value, 'data-selected': on, 'aria-current': on && 'page', ...item.attrs })}><span class="lg-tab-face">${face(item)}</span></a>`;
  }
  const state = segmented ? { role: 'radio', 'aria-checked': String(on) } : { role: 'tab', 'aria-selected': String(on) };
  return `<button type="button" class="lg-tab"${attrs({ ...state, 'data-value': item.value, 'data-selected': on, tabindex: on || (index < 0 && i === 0) ? 0 : -1, ...item.attrs })}><span class="lg-tab-face">${face(item)}</span></button>`;
}
function segmentsHTML(segmented, items, index) {
  const copies = (marked) => items.map((item, i) => `<span class="lg-tab-copy"${marked && i === index ? ' data-selected' : ''}>${face(item)}</span>`).join('');
  return `<span class="lg-glass lg-tab-bar-glass" aria-hidden="true"></span>${
    segmented ? '<span class="lg-segmented-thumb" aria-hidden="true"></span>' : ''
  }<span class="lg-tab-labels" role="none">${items.map((item, i) => tabHTML(segmented, item, i, index)).join('')}</span>`
    + `<span class="lg-tab-labels lg-tab-lensed" aria-hidden="true">${copies(true)}</span>`
    + `<span class="lg-tab-tint" aria-hidden="true"><span class="lg-tab-row">${copies(false)}</span></span>`
    + '<span class="lg-glass lg-tab-lens" aria-hidden="true"></span>';
}
const tabsOf = (bar) => [...bar.querySelector('.lg-tab-labels').children];
// Shows which choice is selected, as Glisse's render does.
function mark(bar, index) {
  const segmented = bar.classList.contains('lg-segmented');
  bar.style.setProperty('--lg-index', Math.max(index, 0));
  bar.dataset.index = index;
  for (const group of bar.querySelectorAll('.lg-tab-labels')) {
    [...group.children].forEach((tab, i) => tab.toggleAttribute('data-selected', i === index));
  }
  tabsOf(bar).forEach((tab, i) => {
    const on = i === index;
    if (tab.matches('a')) {
      if (on) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
      return;
    }
    tab.setAttribute(segmented ? 'aria-checked' : 'aria-selected', String(on));
    tab.tabIndex = on || (index < 0 && i === 0) ? 0 : -1;
  });
}
// A segmented control that stretches shares its width between its segments.
const widths = new ResizeObserver((entries) => {
  for (const { target } of entries) stretch(target);
});
function stretch(bar) {
  const tabs = bar.querySelector('.lg-tab-labels');
  if (tabs && bar.clientWidth) bar.style.setProperty('--lg-tab-width', `${bar.clientWidth / tabs.children.length}px`);
}
const controls = new Map(); // host element -> its control, for every component here
const named = new Map(); // a redrawn page finds its segmented controls again by name

// Gives a bar with Glisse's markup Glisse's behaviour. `changed(index)` is
// called when the person picks a choice.
function wire(bar, changed) {
  const segmented = bar.classList.contains('lg-segmented');
  const q = (sel) => bar.querySelector(sel);
  const parts = {
    bar, glass: q('.lg-tab-bar-glass'), thumb: q('.lg-segmented-thumb'), labels: q('.lg-tab-labels:not(.lg-tab-lensed)'),
    lensed: q('.lg-tab-lensed'), lens: q('.lg-tab-lens'), tint: q('.lg-tab-tint'), row: q('.lg-tab-row'),
  };
  if (bar.hasAttribute('data-stretch')) {
    stretch(bar);
    widths.observe(bar);
  }
  fit(parts.glass, fitGlass);
  // The lifted lens's rims (a segmented control's lens also bends its backdrop
  // in Chromium). They only show once it's held, so they're fitted when the
  // page is idle, as Glisse fits them.
  fit(parts.lens, (el) => whenIdle(() => el.isConnected && fitSelection(el, segmented && settings.bend && refractsBackdrop())));
  let handlers = changed;
  const pick = (index, quiet) => {
    mark(bar, index);
    instance.setActive(index);
    if (!quiet) {
      const tab = tabsOf(bar)[index];
      const value = tab ? tab.dataset.value : undefined;
      if (handlers) handlers(value, index);
      emit(bar, 'lg-change', { value, index });
    }
  };
  const instance = attach(parts, segmented ? SEGMENT_LENS : TAB_LENS, !segmented, (index) => pick(index, false));
  instance.setActive(+bar.dataset.index);
  const control = {
    el: bar,
    get index() { return +bar.dataset.index; },
    get value() { const tab = tabsOf(bar)[+bar.dataset.index]; return tab ? tab.dataset.value : undefined; },
    /** Selects a choice by value or by index, without announcing it. */
    select(which) {
      const tabs = tabsOf(bar);
      const index = typeof which === 'number' ? which : tabs.findIndex((tab) => tab.dataset.value === String(which));
      pick(index, true);
    },
    onChange(next) { handlers = next; },
    destroy() {
      unfit(parts.glass);
      unfit(parts.lens);
      widths.unobserve(bar);
      instance.destroy();
      controls.delete(bar);
      if (named.get(bar.dataset.name) === bar) named.delete(bar.dataset.name);
    },
  };
  controls.set(bar, control);
  if (segmented && bar.dataset.name) named.set(bar.dataset.name, bar);
  return control;
}
function build(host, segmented, { items, value, onChange, stretch: stretched, name }) {
  start();
  controls.get(host)?.destroy();
  const index = value === undefined ? items.findIndex((item) => item.selected) : items.findIndex((item) => String(item.value) === String(value));
  const icons = !segmented && items.some((item) => item.icon != null);
  const links = !segmented && items.every((item) => item.href != null);
  host.classList.add(segmented ? 'lg-segmented' : 'lg-tab-bar');
  if (!host.matches('nav') || !links) host.setAttribute('role', segmented ? 'radiogroup' : links ? 'navigation' : 'tablist');
  host.toggleAttribute('data-icons', icons);
  host.toggleAttribute('data-stretch', !!stretched);
  if (name) host.dataset.name = name;
  host.style.setProperty('--lg-tabs', items.length);
  host.dataset.index = index;
  host.style.setProperty('--lg-index', Math.max(index, 0));
  host.innerHTML = segmentsHTML(segmented, items.map((item, i) => ({ ...item, value: item.value ?? String(i) })), index);
  // A page's own elements stay the tabs, so whatever is attached to them still works.
  tabsOf(host).forEach((tab, i) => {
    const own = items[i].el;
    if (!own) return;
    for (const { name: key, value: v } of [...tab.attributes]) if (key !== 'class' && key !== 'href') own.setAttribute(key, v);
    own.classList.add('lg-tab');
    own.innerHTML = tab.innerHTML;
    tab.replaceWith(own);
  });
  return wire(host, onChange);
}

/**
 * A tab bar, as iOS 26's: the selection springs between tabs, follows a drag
 * along the bar and lifts into a lens while held.
 * `items` are { value, label, icon (svg markup), href }. Tabs with an href are
 * links and the bar is navigation. Returns { select(value or index), value,
 * index, onChange(fn), destroy() }; the bar also fires `lg-change`.
 */
export function tabBar(el, options) {
  return build(el, false, options);
}

/**
 * A segmented control, as iOS 26's: a thumb on a track that lifts into a lens
 * while held. `items` are { value, label }. `stretch: true` shares the
 * element's width between the segments instead of Glisse's 84px each.
 */
export function segmentedControl(el, options) {
  return build(el, true, options);
}

/**
 * The same control as markup, for pages drawn from strings:
 * element.innerHTML = segmentedHTML({ name: 'period', items, value }).
 * It starts working when it reaches the page. Give it a `name`: when the
 * page is drawn again, redraw() keeps the control that's there.
 */
export function segmentedHTML({ name, items, value, stretch: stretched, className, attrs: more }) {
  const index = items.findIndex((item) => String(item.value) === String(value));
  return `<div class="lg-segmented${className ? ` ${esc(className)}` : ''}" role="radiogroup"${attrs({ 'data-name': name, 'data-index': index, 'data-stretch': !!stretched, ...more })} style="--lg-index:${Math.max(index, 0)};--lg-tabs:${items.length}">${segmentsHTML(true, items, index)}</div>`;
}
const choices = (bar) => tabsOf(bar).map((tab) => `${tab.dataset.value}=${tab.textContent}`).join('|');

/**
 * Sets an element's contents, like innerHTML, but leaves the named segmented
 * controls already in it (its direct children) in the page, with their new
 * choice. A control taken out of the page, even for an instant, loses its
 * running fades; one left in place settles exactly as Glisse's does. Use it
 * to draw again whatever holds a segmented control the person has just used.
 */
export function redraw(el, html) {
  const fresh = document.createElement('template');
  fresh.innerHTML = html;
  const kept = new Map(); // live control -> its new index
  const nodes = [...fresh.content.childNodes].map((node) => {
    if (node.nodeType !== 1 || !node.matches('.lg-segmented[data-name]')) return node;
    const live = named.get(node.dataset.name);
    if (!live || live.parentNode !== el || choices(live) !== choices(node)) return node;
    kept.set(live, +node.dataset.index);
    return live;
  });
  for (const child of [...el.childNodes]) if (!kept.has(child)) child.remove();
  let next = el.firstChild; // the next control that stayed
  for (const node of nodes) {
    if (node === next) next = next.nextSibling;
    else el.insertBefore(node, next);
  }
  for (const [bar, index] of kept) controls.get(bar).select(index);
}
// Markup from segmentedHTML arriving in the page. If the page was drawn again
// around a control of the same name and choices, the old one takes its place.
function adoptSegmented(bar) {
  if (controls.has(bar)) return;
  const old = named.get(bar.dataset.name);
  if (old && old !== bar && !old.isConnected && choices(old) === choices(bar)) {
    bar.replaceWith(old);
    controls.get(old).select(+bar.dataset.index);
    return;
  }
  if (old && old !== bar) controls.get(old)?.destroy();
  wire(bar, null);
}

// Which of a bar's links is the page we're on: the longest one the address starts with.
function routed(bar) {
  let best = -1;
  let size = -1;
  tabsOf(bar).forEach((tab, i) => {
    const href = tab.getAttribute('href');
    if (href == null) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    const inPage = href.startsWith('#');
    const here = inPage ? location.hash || '#' : location.pathname;
    const there = inPage ? url.hash || '#' : url.pathname;
    const under = there.endsWith('/') ? there : `${there}/`;
    if ((here === there || here.startsWith(under)) && there.length > size) {
      best = i;
      size = there.length;
    }
  });
  return best;
}
function follow() {
  for (const [bar, control] of controls) {
    if (bar.dataset.lgTabs === 'route' && bar.isConnected) control.select(routed(bar));
  }
}

// ---------------------------------------------------------------- switch
/**
 * A switch, as iOS 26's: a knob that lifts into clear glass while held.
 * Give it a checkbox (it stays in the page, hidden, keeps its form value and
 * fires its own `input` and `change`), or any other element to become the
 * switch. Returns { checked, set(checked), destroy() }; fires `lg-change`.
 */
export function switchControl(target, { checked, onChange, label } = {}) {
  start();
  controls.get(target)?.destroy();
  const input = target.matches('input[type="checkbox"]') ? target : null;
  const el = input || !target.matches('button') ? document.createElement('button') : target;
  if (el !== target) {
    if (input) input.after(el); else target.append(el);
  }
  const on = checked ?? (input ? input.checked : target.getAttribute('aria-checked') === 'true' || target.hasAttribute('data-checked'));
  el.type = 'button';
  el.setAttribute('role', 'switch');
  el.classList.add('lg-switch');
  el.setAttribute('aria-checked', String(on));
  const naming = label || target.getAttribute('aria-label');
  if (naming) el.setAttribute('aria-label', naming);
  if (input) {
    input.hidden = true;
    el.disabled = input.disabled;
    const text = input.labels && input.labels[0];
    if (text && !naming) {
      if (!text.id) text.id = `lg-label-${++ids}`;
      el.setAttribute('aria-labelledby', text.id);
    }
  }
  const bed = (inset) => `<span class="lg-switch-bed${inset ? ' lg-switch-inset' : ''}" aria-hidden="true"><span class="lg-switch-track"><span class="lg-switch-fill"></span></span></span>`;
  el.innerHTML = `${bed(false)}${bed(true)}<span class="lg-switch-thumb" aria-hidden="true"><span class="lg-thumb-face"></span></span>`;
  const [bedEl, insetEl, thumb] = el.children;
  const springs = ref();
  const show = (next) => {
    latest.current.checked = next;
    el.setAttribute('aria-checked', String(next));
    springs.current?.position.set(next ? 1 : 0);
    springs.current?.color.set(next ? 1 : 0);
  };
  const latest = ref({
    checked: on,
    travel: TRAVEL,
    setChecked(next) {
      show(next);
      if (input) {
        input.checked = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (onChange) onChange(next);
      emit(target, 'lg-change', { checked: next });
    },
  });
  const stop = attachSwitch({
    ref: ref(el), bedRef: ref(bedEl), insetRef: ref(insetEl), fillRef: ref(bedEl.querySelector('.lg-switch-fill')),
    insetFillRef: ref(insetEl.querySelector('.lg-switch-fill')), thumbRef: ref(thumb), faceRef: ref(thumb.firstChild), latest, springs,
  });
  // The checkbox changed some other way (its label was clicked, a form was reset).
  const native = () => { if (input.checked !== latest.current.checked) show(input.checked); };
  if (input) input.addEventListener('change', native);
  const control = {
    el,
    get checked() { return latest.current.checked; },
    /** Turns it on or off, without announcing it. */
    set(next) {
      show(!!next);
      if (input) input.checked = !!next;
    },
    destroy() {
      stop();
      if (input) {
        input.removeEventListener('change', native);
        input.hidden = false;
        el.remove();
      }
      controls.delete(target);
    },
  };
  controls.set(target, control);
  return control;
}
let ids = 0;

// ---------------------------------------------------------------- slider
/**
 * A slider, as iOS 26's, around a range input: the input stays the control
 * (its value, its `input` and `change` events, its place in a form); the
 * glass thumb is drawn under it. Returns { el, update(), destroy() }.
 */
export function slider(input) {
  start();
  controls.get(input)?.destroy();
  const root = document.createElement('div');
  root.className = 'lg-slider';
  const bed = (magnified) => `<span class="lg-slider-bed${magnified ? ' lg-slider-magnified' : ''}" aria-hidden="true"><span class="lg-slider-track"><span class="lg-slider-fill"></span></span></span>`;
  root.innerHTML = `${bed(false)}${bed(true)}<span class="lg-slider-thumb" aria-hidden="true"><span class="lg-thumb-face"></span></span>`;
  input.before(root);
  root.append(input);
  const [bedEl, magnified, thumb] = root.children;
  const lensRef = ref();
  const update = () => {
    const min = input.min === '' ? 0 : +input.min;
    const max = input.max === '' ? 100 : +input.max;
    const progress = max > min ? Math.min(1, Math.max(0, (input.valueAsNumber - min) / (max - min))) : 0;
    root.style.setProperty('--lg-progress', progress);
    lensRef.current?.update();
  };
  update();
  const stop = attachSlider({ rootRef: ref(root), inputRef: ref(input), bedRef: ref(bedEl), magnifiedRef: ref(magnified), thumbRef: ref(thumb), faceRef: ref(thumb.firstChild), lensRef });
  input.addEventListener('input', update);
  // A value set from script moves the thumb too.
  const own = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(input, 'value', {
    configurable: true,
    get() { return own.get.call(this); },
    set(next) { own.set.call(this, next); update(); },
  });
  const control = {
    el: root,
    update,
    destroy() {
      stop();
      input.removeEventListener('input', update);
      delete input.value;
      root.before(input);
      root.remove();
      controls.delete(input);
    },
  };
  controls.set(input, control);
  return control;
}

// ---------------------------------------------------------------- input
const MAGNIFIER = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.75"></circle><path d="m10.5 10.5 3.25 3.25"></path></svg>';
const CLEAR = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7"></path></svg>';
/**
 * A text field on glass, around an input. A search input (type="search")
 * also gets Glisse's magnifier and a clear button. `icon` is svg markup.
 */
export function inputField(input, { icon } = {}) {
  start();
  controls.get(input)?.destroy();
  const search = input.type === 'search';
  const root = document.createElement('div');
  root.className = 'lg-glass lg-input';
  input.before(root);
  const glyph = icon ?? (search ? MAGNIFIER : null);
  if (glyph) root.insertAdjacentHTML('beforeend', `<span class="lg-input-icon">${glyph}</span>`);
  root.append(input);
  if (search && !input.placeholder) input.placeholder = 'Search';
  // The clear button is there only while there's something to clear.
  let clear = null;
  if (search) {
    clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'lg-input-clear';
    clear.setAttribute('aria-label', 'Clear');
    clear.innerHTML = CLEAR;
    clear.addEventListener('pointerdown', (ev) => ev.preventDefault());
    clear.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });
  }
  const tidy = () => {
    if (!clear) return;
    if (input.value && !input.disabled) root.append(clear); else clear.remove();
  };
  const focus = (ev) => { if (ev.target !== input && !ev.target.closest('.lg-input-clear')) { ev.preventDefault(); input.focus(); } };
  root.addEventListener('pointerdown', focus);
  input.addEventListener('input', tidy);
  tidy();
  const control = {
    el: root,
    destroy() {
      input.removeEventListener('input', tidy);
      root.before(input);
      root.remove();
      controls.delete(input);
    },
  };
  controls.set(input, control);
  return control;
}

// ---------------------------------------------------------------- menu
const ELLIPSIS = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="8" r="1.4"></circle><circle cx="8" cy="8" r="1.4"></circle><circle cx="13" cy="8" r="1.4"></circle></svg>';
/**
 * A menu, as iOS 26's: a round glass button that opens into a card of
 * choices; press and slide over them to pick one. `items` are
 * { label, icon (svg markup), onSelect, value, destructive, disabled } or the
 * string 'separator'. `align` is the button edge the card lines up with:
 * 'end' (default) or 'start'. Fires `lg-select` with { value, index }.
 * Returns { open(), close(), setItems(items), destroy() }.
 */
export function menu(host, { items = [], label = 'More', icon = ELLIPSIS, align = 'end' } = {}) {
  start();
  controls.get(host)?.destroy();
  host.classList.add('lg-menu');
  host.innerHTML = `<button type="button" class="lg-glass lg-button" data-icon="only" aria-label="${esc(label)}" aria-haspopup="menu" aria-expanded="false">${icon}</button>`;
  const trigger = host.firstChild;
  const picked = (list) => list.map((item, index) => (item === 'separator' ? item : {
    ...item,
    onSelect() {
      if (item.onSelect) item.onSelect();
      emit(host, 'lg-select', { value: item.value, index });
    },
  }));
  const latest = ref(picked(items));
  const morphRef = ref();
  let phase = 'closed';
  let card = null;
  let stop = null;
  const cardHTML = () => `<div role="menu" aria-label="${esc(label)}" class="lg-menu-card" data-phase="open" data-align="${esc(align)}">`
    + `<span class="lg-menu-surface" aria-hidden="true"></span><span class="lg-menu-glyph" aria-hidden="true">${icon}</span>`
    + `<div role="none" class="lg-menu-content"><span class="lg-menu-plate" aria-hidden="true"></span>${latest.current.map((item, index) => (item === 'separator'
      ? '<div role="separator" class="lg-menu-separator"></div>'
      : `<button type="button" role="menuitem" class="lg-menu-item" data-index="${index}"${attrs({ 'data-destructive': !!item.destructive, disabled: !!item.disabled })}>${item.icon || ''}${esc(item.label)}</button>`)).join('')}</div></div>`;
  // Glisse's Menu keeps this in React state: closed, open, or leaving (closing).
  function setPhase(next) {
    if (next === phase) return;
    const was = phase;
    phase = next;
    trigger.setAttribute('aria-expanded', String(phase === 'open'));
    if (phase === 'closed') {
      stop();
      card.remove();
      card = stop = null;
      return;
    }
    if (was === 'closed') {
      host.insertAdjacentHTML('beforeend', cardHTML());
      card = host.lastChild;
      const [surface, glyph, content] = card.children;
      stop = attachMenu({
        triggerRef: ref(trigger), cardRef: ref(card), surfaceRef: ref(surface), glyphRef: ref(glyph), contentRef: ref(content),
        plateRef: ref(content.firstChild), morphRef, latest,
        // The card's own spring reports that it has closed; let it finish its frame first.
        setPhase: (to) => (to === 'closed' ? queueMicrotask(() => phase === 'leaving' && setPhase('closed')) : setPhase(to)),
      });
      return;
    }
    card.dataset.phase = phase;
    morphRef.current?.set(phase === 'open' ? 1 : 0);
  }
  const toggle = () => setPhase(phase === 'open' ? 'leaving' : 'open');
  trigger.addEventListener('click', toggle);
  const control = {
    el: host,
    open() { setPhase('open'); },
    close() { if (phase === 'open') setPhase('leaving'); },
    setItems(next) { latest.current = picked(next); },
    destroy() {
      if (phase !== 'closed') { phase = 'leaving'; setPhase('closed'); }
      trigger.removeEventListener('click', toggle);
      controls.delete(host);
    },
  };
  controls.set(host, control);
  return control;
}

// ---------------------------------------------------------------- markup alone
// Reads a row of links or buttons as { value, label, icon, href } items.
function read(host) {
  return [...host.children].filter((child) => child.matches('a, button')).map((child, i) => {
    const icon = child.querySelector('svg, img');
    return {
      el: child,
      value: child.dataset.value ?? child.getAttribute('value') ?? (child.matches('a') ? child.getAttribute('href') : String(i)),
      label: child.textContent.trim(),
      icon: icon ? icon.outerHTML : undefined,
      href: child.matches('a') ? child.getAttribute('href') : undefined,
      selected: child.hasAttribute('data-selected') || child.getAttribute('aria-current') === 'page' || child.getAttribute('aria-checked') === 'true' || child.getAttribute('aria-selected') === 'true',
    };
  });
}
const menus = new WeakMap(); // a menu's choices, read from its markup the first time
function declare(el) {
  if (controls.has(el)) return;
  const data = el.dataset;
  // Markup the kit built before, back in the page (something moved it): take it up as it is.
  if (el.querySelector(':scope > .lg-tab-labels')) {
    if (el.matches('.lg-segmented[data-name]')) adoptSegmented(el); else wire(el, null);
    if (data.lgTabs === 'route') controls.get(el)?.select(routed(el));
    return;
  }
  if ('lgTabs' in data) {
    const bar = tabBar(el, { items: read(el) });
    if (data.lgTabs === 'route') bar.select(routed(el));
  } else if ('lgSegmented' in data) segmentedControl(el, { items: read(el), stretch: el.hasAttribute('data-stretch'), name: data.name });
  else if ('lgSwitch' in data) {
    if (el.matches('input') && el.nextElementSibling?.matches('.lg-switch')) el.nextElementSibling.remove();
    switchControl(el);
  } else if ('lgSlider' in data || 'lgInput' in data) {
    if (el.parentElement.matches('.lg-slider, .lg-input')) el.parentElement.replaceWith(el);
    if ('lgSlider' in data) slider(el); else inputField(el);
  } else if ('lgMenu' in data) {
    const items = menus.get(el) || [...el.children].map((child) => (child.matches('hr') ? 'separator' : {
      label: child.textContent.trim(),
      icon: child.querySelector('svg') ? child.querySelector('svg').outerHTML : '',
      value: child.dataset.value ?? child.getAttribute('value') ?? undefined,
      destructive: child.hasAttribute('data-destructive'),
      disabled: child.disabled,
      onSelect: () => child.click(), // whatever the page attached to its own button still runs
    }));
    menus.set(el, items);
    menu(el, { items, label: el.getAttribute('aria-label') || undefined, align: data.align || undefined });
  }
}

// ---------------------------------------------------------------- the page
// Glass is adopted as it appears and let go of as it leaves.
function adopt(root) {
  // Your own elements, dressed as glass. The first kind an element matches is the one it gets.
  for (const kind of ['filled', 'button', 'input', 'glass', 'surface']) {
    const selector = settings.adopt[kind];
    if (!selector) continue;
    const dress = (el) => {
      if (el.dataset.lgSkin) return;
      el.dataset.lgSkin = kind === 'filled' ? 'button' : kind;
      if (kind === 'filled') el.dataset.variant = 'filled';
    };
    if (root.matches(selector)) dress(root);
    root.querySelectorAll(selector).forEach(dress);
  }
  if (root.matches(settings.glass)) fit(root, fitGlass);
  for (const el of root.querySelectorAll(settings.glass)) fit(el, fitGlass);
  if (root.matches(DECLARED)) declare(root);
  for (const el of root.querySelectorAll(DECLARED)) declare(el);
}
function sweep() {
  for (const el of fits.keys()) if (!el.isConnected) unfit(el);
  for (const [el, control] of controls) if (!el.isConnected) control.destroy();
}
let started = false;
function start() {
  if (started) return;
  started = true;
  document.addEventListener('pointerdown', onPress);
  window.addEventListener('blur', () => pressing && pressing.end());
  window.addEventListener('hashchange', follow);
  window.addEventListener('popstate', follow);
  // The rim's light and edge come from the theme, so a change of theme repaints them.
  onThemeChange(() => { for (const [el, how] of fits) how(el); });
  const begin = () => {
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node.nodeType === 1 && node.isConnected) adopt(node);
      }
      sweep();
    }).observe(document.body, { childList: true, subtree: true });
    adopt(document.body);
  };
  if (document.body) begin(); else document.addEventListener('DOMContentLoaded', begin);
}

/**
 * Starts the glass on the page. Everything with Glisse's classes or the
 * kit's data attributes is picked up now and whenever it's added later.
 *
 *   glass        more selectors that are glass (you style them; the kit
 *                paints their rim light and, in Chromium, bends the backdrop)
 *   press        more selectors that take the press
 *   pressTarget  (el) => the element that grows, when it isn't the one pressed
 *   adopt        { button, filled, glass, input, surface }: selectors of
 *                your own elements to dress as glass with no CSS of your own
 *                (liquid-glass.css paints them; `filled` is the main action)
 *   bend         false to leave the backdrop unbent in Chromium (it costs a
 *                filter per glass; the frost and rim stay)
 */
export function liquidGlass(options = {}) {
  if (options.glass) settings.glass = `${settings.glass}, ${options.glass}`;
  if (options.press) settings.press = `${settings.press}, ${options.press}`;
  if (options.pressTarget) settings.pressTarget = options.pressTarget;
  if (options.bend === false) settings.bend = false;
  Object.assign(settings.adopt, options.adopt);
  if (started) {
    if (document.body) adopt(document.body);
  } else start();
  return { refresh: () => document.body && adopt(document.body) };
}
