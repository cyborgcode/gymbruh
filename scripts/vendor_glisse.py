#!/usr/bin/env python3
"""Rebuilds web/js/glisse.js and web/glisse.css from the Glisse package.

GymBruh's Liquid Glass is Glisse's own code (https://github.com/0kzh/glisse,
MIT): its springs, press feel, lens maps and filters, rim light and tab bar /
segmented control behaviour, and its stylesheet. Glisse ships them inside React
components; this script copies the parts that are plain DOM code out of its
published build, so the app (which has no build step and no React) can use
them. web/js/glass.js wires them to the app's elements.

Usage (only needed to move to another Glisse version; check the line numbers
below against the new build first):

    npm pack glisse@0.6.0 && tar xzf glisse-0.6.0.tgz
    python3 scripts/vendor_glisse.py package
"""
import pathlib
import sys

VERSION = '0.6.0'
ROOT = pathlib.Path(__file__).resolve().parent.parent

pkg = pathlib.Path(sys.argv[1])
src = (pkg / 'dist' / 'index.js').read_text().split('\n')
css = (pkg / 'dist' / 'styles.css').read_text()
lic = (pkg / 'LICENSE').read_text().strip()
notice = '\n'.join(' * ' + line if line else ' *' for line in lic.split('\n'))


def cut(first, last, starts, ends):
    """Lines first..last (1-indexed, inclusive), checked against their first and last line."""
    lines = src[first - 1:last]
    assert lines[0].startswith(starts), (first, lines[0])
    assert lines[-1].startswith(ends), (last, lines[-1])
    return '\n'.join(lines)


def swap(text, old, new):
    assert old in text, old[:60]
    return text.replace(old, new)


# press.ts: the body of the usePress hook as a plain function. The app listens
# for presses on the whole page (its buttons are redrawn all the time), so the
# function hands back its handlers instead of adding listeners itself.
press = cut(107, 217, '// src/internal/press.ts', '}')
press = swap(press, """function usePress(ref) {
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const value = [""", """function presser(el) {
		const value = [""")
press = swap(press, """		const reset = () => end();
		el.addEventListener("pointerdown", down);
		window.addEventListener("blur", reset);
		return () => {
			end();
			springs.forEach((spring) => spring.stop());
			el.removeEventListener("pointerdown", down);
			window.removeEventListener("blur", reset);
			el.style.removeProperty("scale");
			el.style.removeProperty("translate");
		};
	}, [ref]);
}""", """		return { down, end: () => end() };
}""")

segments = cut(2788, 3066, 'const held', '}')

parts = [
    cut(23, 106, '// src/internal/spring.ts', '}'),
    press,
    cut(218, 239, '// src/internal/svg.ts', '}'),
    cut(240, 1103, '// src/internal/lens.ts', '}'),
    cut(1890, 2014, '// src/internal/refraction.ts', '}'),
    cut(2041, 2072, 'function whenIdle', 'const refractsBackdrop'),
    cut(2172, 2355, 'const SELECTION_PROPERTIES', '}'),
    segments,
]

js = f"""/*
 * Liquid Glass, from Glisse {VERSION} (https://github.com/0kzh/glisse).
 *
 * This file is Glisse's own code, copied from its published build
 * (dist/index.js) by scripts/vendor_glisse.py: the springs, the press feel,
 * the lens maps and SVG filters, the rim light, and the tab bar / segmented
 * control behaviour. Don't edit it by hand; rerun the script.
 *
 * Left out: Glisse's React components (web/js/glass.js does their job for
 * this plain-JS app) and its WebGL lens for content marked
 * data-glisse-backdrop (drawn.ts), which the app doesn't use.
 * Changed: usePress is a plain function (presser) that hands back its
 * handlers; nothing else.
 *
{notice}
 */
/* eslint-disable */
{chr(10).join(parts)}

export {{
	presser,
	paintRim,
	refractsBackdrop,
	fitBackdropLens,
	fitSelection,
	attach,
	GLASS,
	LENS$2 as TAB_LENS,
	SEGMENT_LENS
}};
"""
(ROOT / 'web' / 'js' / 'glisse.js').write_text(js)

# The stylesheet: the tokens, the glass, the button, the tab bar, the segmented
# control and the input. The switch, slider and menu aren't used by the app.
end = css.index('/* Switch and slider thumbs */')
assert css.index('/* Input */') < end
sheet = f"""/*
 * Liquid Glass styles, from Glisse {VERSION} (https://github.com/0kzh/glisse):
 * its stylesheet (dist/styles.css) up to and including the input, copied as
 * it is by scripts/vendor_glisse.py. Don't edit it by hand. The app's own
 * rules that put this glass on its controls are in styles.css.
 *
{notice}
 */
{css[:end].rstrip()}
"""
(ROOT / 'web' / 'glisse.css').write_text(sheet)
print(f'glisse.js {len(js)} bytes, glisse.css {len(sheet)} bytes')
