#!/usr/bin/env python3
"""Rebuilds web/liquid-glass/glisse.js and glisse.css from the Glisse package.

The Liquid Glass kit (web/liquid-glass/) is Glisse's own code
(https://github.com/0kzh/glisse, MIT): its springs, press feel, lens maps and
filters, rim light, the behaviour of its tab bar, segmented control, switch,
slider and menu, and its stylesheet. Glisse ships them inside React
components; this script copies the parts that are plain DOM code out of its
published build, so a page with no React and no build step can use them.
liquid-glass.js, beside them, does what the React components did.

Usage (only needed to move to another Glisse version; check the line numbers
below against the new build first, the script stops if they no longer fit):

    npm pack glisse@0.6.0 && tar xzf glisse-0.6.0.tgz
    python3 scripts/vendor_glisse.py package
"""
import pathlib
import sys

VERSION = '0.6.0'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'liquid-glass'

pkg = pathlib.Path(sys.argv[1])
src = (pkg / 'dist' / 'index.js').read_text().split('\n')
css = (pkg / 'dist' / 'styles.css').read_text()
lic = (pkg / 'LICENSE').read_text().strip()
notice = '\n'.join(' * ' + line if line else ' *' for line in lic.split('\n'))


def cut(first, last, starts, ends):
    """Lines first..last (1-indexed, inclusive), checked against their first and last line."""
    lines = src[first - 1:last]
    assert lines[0].strip().startswith(starts), (first, lines[0])
    assert lines[-1].strip().startswith(ends), (last, lines[-1])
    return '\n'.join(lines)


def swap(text, old, new):
    assert old in text, old[:60]
    return text.replace(old, new)


def effect(name, refs, first, last, starts, opened):
    """The body of a component's effect as a function of the refs it reads.

    Glisse keeps a component's DOM work in a React effect that reads its
    elements off refs ({ current }) and returns its own clean-up. Given
    objects of the same shape, the body runs as it is.
    """
    assert src[first - 2].strip() == opened, (first - 1, src[first - 2])
    body = cut(first, last, starts, '};')
    return f'function {name}({{ {", ".join(refs)} }}) {{\n{body}\n}}'


# press.ts: the body of the usePress hook as a plain function. A page listens
# for presses as a whole (its buttons may be redrawn at any time), so the
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

parts = [
    cut(23, 106, '// src/internal/spring.ts', '}'),
    press,
    cut(218, 239, '// src/internal/svg.ts', '}'),
    cut(240, 1103, '// src/internal/lens.ts', '}'),
    cut(1890, 2014, '// src/internal/refraction.ts', '}'),
    cut(2015, 2040, 'const repaints', '}'),
    cut(2041, 2072, 'function whenIdle', 'const refractsBackdrop'),
    cut(2172, 2355, 'const SELECTION_PROPERTIES', '}'),
    '// src/menu.tsx (its effect)',
    cut(2451, 2452, 'const clamp$1', 'const resistance'),
    effect('attachMenu', ['triggerRef', 'cardRef', 'surfaceRef', 'glyphRef', 'contentRef', 'plateRef', 'morphRef', 'latest', 'setPhase'],
           2495, 2707, 'const trigger = triggerRef.current;', 'if (!mounted) return;'),
    cut(2788, 3066, 'const held', '}'),
    '// src/slider.tsx (its effect)',
    cut(3233, 3240, 'const LENS$1', '};'),
    effect('attachSlider', ['rootRef', 'inputRef', 'bedRef', 'magnifiedRef', 'thumbRef', 'faceRef', 'lensRef'],
           3253, 3287, 'const input = inputRef.current;', 'useEffect(() => {'),
    '// src/switch.tsx (its effect)',
    cut(3341, 3350, 'const TRAVEL', '};'),
    effect('attachSwitch', ['ref', 'bedRef', 'insetRef', 'fillRef', 'insetFillRef', 'thumbRef', 'faceRef', 'latest', 'springs'],
           3385, 3506, 'const el = ref.current;', 'useEffect(() => {'),
]

js = f"""/*
 * Liquid Glass, from Glisse {VERSION} (https://github.com/0kzh/glisse).
 *
 * This file is Glisse's own code, copied from its published build
 * (dist/index.js) by scripts/vendor_glisse.py: the springs, the press feel,
 * the lens maps and SVG filters, the rim light, and the behaviour of the tab
 * bar, segmented control, switch, slider and menu. Don't edit it by hand;
 * rerun the script.
 *
 * Left out: Glisse's React components (liquid-glass.js does their job) and
 * its WebGL lens for content marked data-glisse-backdrop (drawn.ts).
 * Changed: usePress is a plain function (presser) that hands back its
 * handlers, and the effects of Menu, Slider and Switch are functions
 * (attachMenu, attachSlider, attachSwitch) of the refs they read. Nothing
 * else.
 *
{notice}
 */
/* eslint-disable */
{chr(10).join(parts)}

export {{
	presser,
	paintRim,
	onThemeChange,
	refractsBackdrop,
	fitBackdropLens,
	fitSelection,
	attach,
	attachMenu,
	attachSlider,
	attachSwitch,
	GLASS,
	LENS$2 as TAB_LENS,
	SEGMENT_LENS,
	TRAVEL
}};
"""
OUT.mkdir(exist_ok=True)
(OUT / 'glisse.js').write_text(js)

sheet = f"""/*
 * Liquid Glass styles, from Glisse {VERSION} (https://github.com/0kzh/glisse):
 * its stylesheet (dist/styles.css), copied as it is by
 * scripts/vendor_glisse.py. Don't edit it by hand; put your own rules in a
 * stylesheet loaded after this one.
 *
{notice}
 */
{css.rstrip()}
"""
(OUT / 'glisse.css').write_text(sheet)
(OUT / 'GLISSE-LICENSE').write_text(lic + '\n')
print(f'glisse.js {len(js)} bytes, glisse.css {len(sheet)} bytes')
