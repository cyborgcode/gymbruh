// GymBruh's glass. The glass itself is the Liquid Glass kit (../liquid-glass/,
// Glisse's code); this file only says which of the app's own elements are
// glass and shapes the kit's tab bar and segmented control to the app's markup.
import { liquidGlass, tabBar as kitTabBar, segmentedHTML as kitSegmented, redraw } from '../liquid-glass/liquid-glass.js';

// The app's glass controls, styled in styles.css (keep the two lists in step).
const GLASS = '.btn:not(.ghost), .icon-btn, .stp, .chip, .tround-ic, .in, select, .t-hide, .t-btns button, .t-mini, #toast';
// The ones that take a press, as Glisse's Button does.
const PRESS = '.btn:not(.ghost), .icon-btn, .stp, .chip, .tround, .t-hide, .t-btns button, .t-mini';

export function initGlass() {
  liquidGlass({
    glass: GLASS,
    press: PRESS,
    // The rest-timer button is a round glass button over a label: the glass presses.
    pressTarget: (el) => (el.matches('.tround') ? el.querySelector('.tround-ic') : el),
  });
}

/** The tab bar. `items` are { key, label, icon, href }. Returns { select(index) }. */
export function tabBar(bar, items) {
  return kitTabBar(bar, { items: items.map((it) => ({ value: it.key, label: it.label, icon: it.icon, href: it.href, attrs: { 'data-tab': it.key } })) });
}

/** A segmented control as markup. `opts` are [value, label]; its buttons carry data-seg / data-val. */
export function segmentedHTML(name, opts, val) {
  return kitSegmented({
    name, value: val, stretch: true, className: 'seg',
    items: opts.map(([v, label]) => ({ value: v, label, attrs: { 'data-seg': name, 'data-val': v } })),
  });
}

export { redraw };
