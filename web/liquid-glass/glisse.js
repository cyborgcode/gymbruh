/*
 * Liquid Glass, from Glisse 0.6.0 (https://github.com/0kzh/glisse).
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
 * (attachMenu, attachSlider, attachSwitch) of the refs they read. For speed,
 * attach() paints the bar once per frame and steps its label lens's bend in
 * twentieths. Nothing else. (Don't shrink a lens filter's region to the lens:
 * Safari then draws the start of the label row inside the lens.)
 *
 * MIT License
 *
 * Copyright (c) 2026 Kelvin Zhang
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/* eslint-disable */
// src/internal/spring.ts
const moving = /* @__PURE__ */ new Set();
let frame = 0;
let last = 0;
function advance(s, dt) {
	const x = s.value - s.target;
	const v = s.velocity;
	const half = s.damping / 2;
	const discriminant = half * half - s.stiffness;
	if (Math.abs(discriminant) < 1e-4) {
		const decay = Math.exp(-half * dt);
		const b = v + half * x;
		s.value = s.target + decay * (x + b * dt);
		s.velocity = decay * (v - half * b * dt);
	} else if (discriminant > 0) {
		const root = Math.sqrt(discriminant);
		const r1 = -half + root;
		const r2 = -half - root;
		const a = (v - r2 * x) / (r1 - r2);
		const b = x - a;
		s.value = s.target + a * Math.exp(r1 * dt) + b * Math.exp(r2 * dt);
		s.velocity = a * r1 * Math.exp(r1 * dt) + b * r2 * Math.exp(r2 * dt);
	} else {
		const omega = Math.sqrt(-discriminant);
		const decay = Math.exp(-half * dt);
		const cos = Math.cos(omega * dt);
		const sin = Math.sin(omega * dt);
		s.value = s.target + decay * (x * cos + (v + half * x) / omega * sin);
		s.velocity = decay * (v * cos - (half * v + s.stiffness * x) / omega * sin);
	}
}
function tick$1(time) {
	frame = 0;
	const dt = Math.min(.1, Math.max(0, (time - last) / 1e3));
	last = time;
	for (const s of moving) {
		advance(s, dt);
		if (Math.abs(s.value - s.target) < 1e-4 && Math.abs(s.velocity) < .001) {
			s.value = s.target;
			s.velocity = 0;
			moving.delete(s);
		}
		s.paint(s.value);
	}
	if (moving.size) frame = requestAnimationFrame(tick$1);
}
function prefersReducedMotion() {
	return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function createSpring(value, stiffness, damping, paint) {
	const s = {
		value,
		target: value,
		velocity: 0,
		stiffness,
		damping,
		paint
	};
	return {
		paint: () => paint(s.value),
		set(target, instant = false) {
			s.target = target;
			if (instant || document.hidden || prefersReducedMotion()) {
				s.value = target;
				s.velocity = 0;
				moving.delete(s);
				paint(target);
				return;
			}
			moving.add(s);
			if (!frame) {
				last = Number(document.timeline?.currentTime ?? performance.now());
				frame = requestAnimationFrame(tick$1);
			}
		},
		tune(nextStiffness, nextDamping) {
			s.stiffness = nextStiffness;
			s.damping = nextDamping;
		},
		stop: () => {
			moving.delete(s);
		}
	};
}
// src/internal/press.ts
const POINTER = {
	grow: 6,
	press: [417.6, 29.2],
	release: [230, 23.7]
};
const TOUCH = {
	grow: 15,
	press: [515, 27.3],
	release: [250, 11.8]
};
function presser(el) {
		const value = [
			1,
			1,
			0,
			0
		];
		const paint = () => {
			el.style.scale = `${value[0]} ${value[1]}`;
			el.style.translate = `${value[2]}px ${value[3]}px`;
		};
		const springs = value.map((initial, i) => createSpring(initial, ...POINTER.release, (next) => {
			value[i] = next;
			paint();
		}));
		let pointer = null;
		const target = (next, [stiffness, damping]) => {
			springs.forEach((spring, i) => {
				spring.tune(stiffness, damping);
				spring.set(next[i] ?? 0);
			});
		};
		const track = (event) => {
			if (!pointer) return;
			const { box, feel } = pointer;
			el.style.setProperty("--lg-x", `${(event.clientX - box.left) / box.width * 100}%`);
			el.style.setProperty("--lg-y", `${(event.clientY - box.top) / box.height * 100}%`);
			const { width, height } = box;
			const base = 1 + feel.grow / Math.max(width, height);
			const aspect = width / height;
			const dx = (event.clientX - pointer.x) / aspect;
			const dy = event.clientY - pointer.y;
			const length = Math.hypot(dx, dy);
			if (!length) return target([
				base,
				base,
				0,
				0
			], feel.press);
			const nx = dx / length;
			const ny = dy / length;
			const rubber = 1 - 1 / (1 + length / height / (5 * aspect));
			const stretch = 1 + 6 / height * rubber * Math.abs(Math.abs(nx) - Math.abs(ny));
			const horizontal = Math.abs(nx) > Math.abs(ny);
			target([
				base * (horizontal ? stretch : 1 / stretch),
				base * (horizontal ? 1 / stretch : stretch),
				nx * 8 * rubber,
				ny * 8 * rubber
			], feel.press);
		};
		const move = (event) => {
			if (event.pointerId === pointer?.id) track(event);
		};
		const end = (event) => {
			if (event && event.pointerId !== pointer?.id) return;
			const feel = pointer?.feel ?? POINTER;
			pointer = null;
			delete el.dataset.pressed;
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", end);
			window.removeEventListener("pointercancel", end);
			target([
				1,
				1,
				0,
				0
			], feel.release);
		};
		const down = (event) => {
			if (!event.isPrimary || event.button !== 0 || pointer || el.matches(":disabled")) return;
			pointer = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				box: el.getBoundingClientRect(),
				feel: event.pointerType === "mouse" ? POINTER : TOUCH
			};
			el.dataset.pressed = "";
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", end);
			window.addEventListener("pointercancel", end);
			track(event);
		};
		return { down, end: () => end() };
}
// src/internal/svg.ts
const SVG = "http://www.w3.org/2000/svg";
let defs;
function svg(name, attributes) {
	const element = document.createElementNS(SVG, name);
	for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
	return element;
}
/** The page's one hidden `<defs>`, where every filter lives. */
function container() {
	if (defs?.isConnected) return defs;
	const root = svg("svg", {
		width: 0,
		height: 0,
		"aria-hidden": "true"
	});
	root.style.cssText = "position:absolute;pointer-events:none";
	defs = svg("defs", {});
	root.append(defs);
	document.body.append(root);
	return defs;
}
// src/internal/lens.ts
const DARK = {
	angle: 45,
	glow: .4,
	spread: .5,
	glowPower: 1.5,
	edge: .5,
	edgeWidth: 2,
	edgePower: 1.5
};
const LIGHT = {
	angle: 30,
	glow: .4,
	spread: .5,
	glowPower: 2,
	edge: .5,
	edgeWidth: 1.5,
	edgePower: 1
};
const clamp$4 = (value, min, max) => Math.min(max, Math.max(min, value));
const erf = (x) => Math.tanh(1.7724538509 * x);
function distance(x, y, halfWidth, halfHeight, radius) {
	const qx = Math.abs(x) - halfWidth + radius;
	const qy = Math.abs(y) - halfHeight + radius;
	return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}
function arc(sag, half) {
	const radius = (half * half + sag * sag) / (2 * sag);
	let sum = 0;
	for (let i = 0; i <= 200; i++) {
		const x = i / 200 * half;
		const slope = x / Math.sqrt(radius * radius - x * x);
		sum += i === 0 || i === 200 ? slope / 2 : slope;
	}
	const mean = sum / 200;
	return {
		radius,
		scale: mean > 0 ? .5 / mean : 1
	};
}
const slope = (x, { radius, scale }) => {
	const inside = Math.min(x, .999 * radius);
	return inside / Math.sqrt(radius * radius - inside * inside) * scale;
};
const BEZEL = (() => {
	const samples = /* @__PURE__ */ new Float32Array(256);
	let most = 0;
	for (let i = 0; i < samples.length; i++) {
		const t = Math.max(.004, i / (samples.length - 1));
		const surface = (1 - (1 - t) ** 4) ** .25;
		const incident = Math.atan((1 - t) ** 3 / surface ** 3);
		const refracted = Math.asin(Math.sin(incident) / 1.5);
		samples[i] = Math.tan(incident - refracted) * (.6 + surface);
		most = Math.max(most, samples[i]);
	}
	return samples.map((sample) => sample / most);
})();
function bezel(t) {
	const at = clamp$4(t, 0, 1) * (BEZEL.length - 1);
	const lower = Math.floor(at);
	const a = BEZEL[lower];
	return a + (BEZEL[Math.min(lower + 1, BEZEL.length - 1)] - a) * (at - lower);
}
/** The width of the band that bends, in px. */
function depthOf({ width, height }, options) {
	const depth = options.depth * (options.relative ? Math.min(width, height) : 1);
	return options.maxDepth === void 0 ? depth : Math.min(depth, options.maxDepth);
}
function puller(shape, options) {
	const halfWidth = shape.width / 2;
	const halfHeight = shape.height / 2;
	const radius = clamp$4(shape.radius, 0, Math.min(halfWidth, halfHeight));
	const depth = depthOf(shape, options);
	if (options.bezel) {
		const round = clamp$4(Math.max(radius, depth), 0, Math.min(halfWidth, halfHeight));
		return (x, y, pull) => {
			pull.edge = distance(x, y, halfWidth, halfHeight, radius);
			pull.x = pull.y = pull.amount = 0;
			if (pull.edge >= 0 || depth <= 0 || -pull.edge >= depth) return;
			const qx = Math.abs(x) - halfWidth + round;
			const qy = Math.abs(y) - halfHeight + round;
			if (qx > 0 && qy > 0) {
				const length = Math.hypot(qx, qy);
				pull.x = Math.sign(x) * qx / length;
				pull.y = Math.sign(y) * qy / length;
			} else if (qx > qy) pull.x = Math.sign(x);
			else pull.y = Math.sign(y);
			pull.amount = bezel(-pull.edge / depth);
		};
	}
	const dome = options.dome * (options.relative ? Math.min(shape.width, shape.height) : 1);
	const { splay } = options;
	const innerWidth = Math.max(0, halfWidth - depth);
	const innerHeight = Math.max(0, halfHeight - depth);
	const innerRadius = clamp$4(radius, 0, Math.min(innerWidth, innerHeight));
	const ramp = depth > 0 ? 1 / (depth * Math.SQRT2) : 1e6;
	const sag = Math.max(.01, Math.min(dome, Math.min(halfWidth, halfHeight) - 1));
	const across = dome > 0 ? arc(sag, halfWidth) : null;
	const down = dome > 0 ? arc(sag, halfHeight) : null;
	const reach = .5 * Math.min(halfWidth, halfHeight);
	return (x, y, pull) => {
		pull.edge = distance(x, y, halfWidth, halfHeight, radius);
		pull.x = pull.y = pull.amount = 0;
		if (pull.edge >= 0) return;
		const ax = Math.abs(x);
		const ay = Math.abs(y);
		let dx = across ? Math.sign(x) * slope(ax, across) : clamp$4(x / halfWidth, -1, 1);
		let dy = down ? Math.sign(y) * slope(ay, down) : clamp$4(y / halfHeight, -1, 1);
		if (splay < 1 && reach > 0) {
			const keepX = Math.max(0, 1 - (halfHeight - ay) / reach) * (1 - splay);
			const keepY = Math.max(0, 1 - (halfWidth - ax) / reach) * (1 - splay);
			if (keepX > .001 || keepY > .001) {
				const before = Math.hypot(dx, dy);
				dx *= 1 - keepX;
				dy *= 1 - keepY;
				const after = Math.hypot(dx, dy);
				if (after > .001) {
					dx *= before / after;
					dy *= before / after;
				}
			}
		}
		pull.x = dx;
		pull.y = dy;
		pull.amount = .5 * (1 + erf(distance(x, y, innerWidth, innerHeight, innerRadius) * ramp));
	};
}
const bends = ({ edge, amount }) => Math.min(1, amount * 20, -edge);
/**
* Draws a lens's map, after Aave's: within a band about `depth` wide around
* the rim, each point shows content from further in, by the slope of a
* shallow dome there (or as a bezel bends, see `LensOptions.bezel`), and the
* rest is left as it is. The light is a glow along the light's axis and a
* thin lit edge. Its alpha fades out where the bend does, so the middle
* shows the content exactly: a displacement map can't hold "none" exactly in
* a byte, and WebKit, which stretches the map across a long box, would
* otherwise shift the middle by a pixel.
*/
function lensMap(shape, options, light, density) {
	const { width, height } = shape;
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const columns = Math.max(1, Math.round(width * density));
	const rows = Math.max(1, Math.round(height * density));
	const pullAcross = new Uint8ClampedArray(columns * rows * 4);
	const pullDown = new Uint8ClampedArray(columns * rows * 4);
	const caught = new Uint8ClampedArray(columns * rows * 4);
	const shapeMask = new Uint8ClampedArray(columns * rows * 4);
	const grey = (data, i, value, alpha = 255) => {
		data[i] = data[i + 1] = data[i + 2] = value;
		data[i + 3] = alpha;
	};
	const pullAt = puller(shape, options);
	const pull = {
		edge: 0,
		x: 0,
		y: 0,
		amount: 0
	};
	const cos = Math.cos(light.angle * Math.PI / 180);
	const sin = Math.sin(light.angle * Math.PI / 180);
	const glowStart = (1 - light.spread) * Math.SQRT2;
	const glowRange = light.spread * Math.SQRT2;
	for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
		const i = (row * columns + column) * 4;
		const x = (column + .5) / columns * width - halfWidth;
		const y = (row + .5) / rows * height - halfHeight;
		pullAt(x, y, pull);
		const { edge, amount: falloff } = pull;
		const inside = Math.round(255 * clamp$4(-edge, 0, 1));
		if (edge >= 0) {
			grey(shapeMask, i, 0, inside);
			grey(pullAcross, i, 128);
			grey(pullDown, i, 128);
			grey(caught, i, 128, 0);
			continue;
		}
		grey(shapeMask, i, Math.round(255 * falloff), inside);
		grey(pullAcross, i, Math.round((.5 - .5 * pull.x * falloff) * 255));
		grey(pullDown, i, Math.round((.5 - .5 * pull.y * falloff) * 255));
		const facing = Math.abs(clamp$4(x / halfWidth, -1, 1) * cos + clamp$4(y / halfHeight, -1, 1) * sin);
		const glow = glowRange > .001 ? light.glow * clamp$4((facing - glowStart) / glowRange, 0, 1) ** light.glowPower * falloff : 0;
		const rim = light.edge * Math.max(0, 1 + edge / light.edgeWidth) * facing ** light.edgePower;
		const amount = Math.min(1, glow + rim);
		grey(caught, i, Math.round(127 * amount + 128), Math.round(255 * bends(pull)));
	}
	return {
		columns,
		rows,
		across: pullAcross,
		down: pullDown,
		light: caught,
		shape: shapeMask
	};
}
/**
* A lens's pull as numbers, for drawing the lens rather than filtering with
* it (see drawn.ts): four to each device pixel, the pull across and down
* (each from -1 to 1, as the map's greys are from 0 to 255), how far the
* lens bends there at all, and how far inside the lens's shape it is, both
* from 0 to 1 as the map's alphas are.
*/
function lensField(shape, options, density) {
	const { width, height } = shape;
	const columns = Math.max(1, Math.round(width * density));
	const rows = Math.max(1, Math.round(height * density));
	const data = new Float32Array(columns * rows * 4);
	const pullAt = puller(shape, options);
	const pull = {
		edge: 0,
		x: 0,
		y: 0,
		amount: 0
	};
	for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
		pullAt((column + .5) / columns * width - width / 2, (row + .5) / rows * height - height / 2, pull);
		if (pull.edge >= 0) continue;
		const i = (row * columns + column) * 4;
		data[i] = pull.x * pull.amount;
		data[i + 1] = pull.y * pull.amount;
		data[i + 2] = Math.max(0, bends(pull));
		data[i + 3] = clamp$4(-pull.edge, 0, 1);
	}
	return {
		columns,
		rows,
		data
	};
}
const encoded = /* @__PURE__ */ new Map();
function encode(key, draw) {
	const cached = encoded.get(key);
	if (cached) return cached;
	const map = draw();
	const canvas = document.createElement("canvas");
	canvas.width = map.columns;
	canvas.height = map.rows;
	const context = canvas.getContext("2d");
	if (!context) return null;
	const image = context.createImageData(map.columns, map.rows);
	const png = (data) => {
		image.data.set(data);
		context.putImageData(image, 0, 0);
		return canvas.toDataURL();
	};
	const result = {
		across: png(map.across),
		down: png(map.down),
		light: png(map.light),
		shape: png(map.shape)
	};
	encoded.set(key, result);
	return result;
}
/** WebKit needs filters in bounding-box units. */
const boxUnits = () => /AppleWebKit\//.test(navigator.userAgent) && !/Chrom(?:e|ium)\//.test(navigator.userAgent);
const CHANNELS = [
	"1 0 0 0 0  0 0 0 0 0  0 0 0 0 0",
	"0 0 0 0 0  0 1 0 0 0  0 0 0 0 0",
	"0 0 0 0 0  0 0 0 0 0  0 0 1 0 0"
];
const matrix = (input, values, result) => svg("feColorMatrix", {
	in: input,
	type: "matrix",
	values,
	result
});
const sum = (a, b, k2, k3, result) => svg("feComposite", {
	in: a,
	in2: b,
	operator: "arithmetic",
	k2,
	k3,
	result
});
function spread(k) {
	return [
		...CHANNELS.map((channel, i) => matrix(`ray-${k}-${i}`, `${channel}  0 0 0 0.3333 0`, `light-${k}-${i}`)),
		sum(`light-${k}-0`, `light-${k}-1`, 1, 1, `light-${k}-01`),
		sum(`light-${k}-01`, `light-${k}-2`, 1, 1, `spread-${k}`),
		matrix(`spread-${k}`, "3 0 0 0 0  0 3 0 0 0  0 0 3 0 0  0 0 0 1 0", `bent-${k}`)
	];
}
function inked(k, page) {
	const white = page === "light" ? 1 : 0;
	const steps = [];
	const own = (i) => [
		0,
		1,
		2
	].map((r) => r === i ? `${[
		0,
		1,
		2
	].map((c) => c === i ? white ? -1 : 1 : 0).join(" ")} 0 ${white}` : "0 0 0 0 0").join("  ") + "  0 0 0 1 0";
	CHANNELS.forEach((_, i) => {
		const ray = `ray-${k}-${i}`;
		steps.push(matrix(ray, "0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1", `cover-${k}-${i}`), matrix(ray, "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", `covers-${k}-${i}`), matrix(ray, own(i), `inks-${k}-${i}`));
	});
	steps.push(svg("feBlend", {
		in: `cover-${k}-0`,
		in2: `cover-${k}-1`,
		mode: "lighten",
		result: `most-${k}-01`
	}), svg("feBlend", {
		in: `most-${k}-01`,
		in2: `cover-${k}-2`,
		mode: "lighten",
		result: `most-${k}`
	}), matrix(`most-${k}`, `0 0 0 0 ${white}  0 0 0 0 ${white}  0 0 0 0 ${white}  1 0 0 0 0`, `inked-${k}`));
	let at = `inked-${k}`;
	CHANNELS.forEach((_, i) => {
		const [gain, loss] = white ? [`covers-${k}-${i}`, `inks-${k}-${i}`] : [`inks-${k}-${i}`, `covers-${k}-${i}`];
		steps.push(sum(at, gain, i === 0 ? .5 : 1, .5, `inked-${k}-${i}a`), sum(`inked-${k}-${i}a`, loss, 1, -.5, `inked-${k}-${i}b`));
		at = `inked-${k}-${i}b`;
	});
	const double = svg("feComponentTransfer", {
		in: at,
		result: `bent-${k}`
	});
	double.append(svg("feFuncA", {
		type: "linear",
		slope: 2,
		intercept: 0
	}));
	steps.push(double);
	return steps;
}
function graph(lenses, box, standIn) {
	const unit = box ? "objectBoundingBox" : "userSpaceOnUse";
	const filter = svg("filter", {
		filterUnits: unit,
		primitiveUnits: unit,
		"color-interpolation-filters": "sRGB"
	});
	if (box) for (const [key, value] of Object.entries({
		x: 0,
		y: 0,
		width: 1,
		height: 1
	})) filter.setAttribute(key, String(value));
	const single = lenses.length === 1;
	const parts = lenses.map(({ maps, shine, blur, ink }, k) => {
		const merged = (name) => single ? name : `${name}-${k}`;
		const image = (href, result) => svg("feImage", {
			href,
			preserveAspectRatio: "none",
			result
		});
		const boxed = [
			image(maps.across, `across-${k}`),
			image(maps.down, `down-${k}`),
			image(maps.light, merged("raw")),
			svg("feFlood", {
				"flood-color": "rgb(128, 128, 128)",
				result: `neutral-${k}`
			})
		];
		if (standIn) boxed.push(image(maps.shape, merged("shape")));
		filter.append(...boxed);
		for (const pull of ["across", "down"]) {
			const half = svg("feComponentTransfer", {
				in: `${pull}-grey-${k}`,
				result: `${pull}-pull-${k}`
			});
			half.append(svg("feFuncA", {
				type: "linear",
				slope: 0,
				intercept: .5
			}));
			filter.append(svg("feComposite", {
				in: `${pull}-${k}`,
				in2: `neutral-${k}`,
				operator: "over",
				result: `${pull}-grey-${k}`
			}), half);
		}
		const rays = CHANNELS.map((_, i) => {
			const across = svg("feDisplacementMap", {
				in: "SourceGraphic",
				in2: `across-pull-${k}`,
				xChannelSelector: "R",
				yChannelSelector: "A",
				result: `across-${k}-${i}`
			});
			const down = svg("feDisplacementMap", {
				in: `across-${k}-${i}`,
				in2: `down-pull-${k}`,
				xChannelSelector: "A",
				yChannelSelector: "R",
				result: `ray-${k}-${i}`
			});
			boxed.push(across);
			filter.append(across, down);
			return [across, down];
		});
		filter.append(...ink ? inked(k, ink) : spread(k));
		let soften;
		if (blur) {
			soften = svg("feGaussianBlur", {
				in: `bent-${k}`,
				result: `soft-${k}`
			});
			const weight = image(maps.shape, `weight-${k}`);
			boxed.push(weight);
			filter.append(weight, svg("feColorMatrix", {
				in: `weight-${k}`,
				type: "matrix",
				values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0",
				result: `bends-${k}`
			}), soften, svg("feComposite", {
				in: `soft-${k}`,
				in2: `bends-${k}`,
				operator: "in",
				result: `soft-in-${k}`
			}), svg("feComposite", {
				in: `bent-${k}`,
				in2: `bends-${k}`,
				operator: "out",
				result: `sharp-${k}`
			}), svg("feComposite", {
				in: `soft-in-${k}`,
				in2: `sharp-${k}`,
				operator: "arithmetic",
				k2: 1,
				k3: 1,
				result: `softened-${k}`
			}));
		}
		const bent = blur ? `softened-${k}` : `bent-${k}`;
		let lit = bent;
		if (shine > 0) {
			const white = `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 ${-128 / 255}`;
			filter.append(svg("feColorMatrix", {
				in: merged("raw"),
				type: "matrix",
				values: white,
				result: `glint-${k}`
			}), svg("feComposite", {
				in: `glint-${k}`,
				in2: bent,
				operator: "arithmetic",
				k2: shine,
				k3: 1,
				result: `lit-${k}`
			}));
			lit = `lit-${k}`;
		} else if (shine < 0) {
			const row = `0 0 ${shine} 0 ${1 - 128 * shine / 255}`;
			filter.append(svg("feColorMatrix", {
				in: merged("raw"),
				type: "matrix",
				values: `${row}  ${row}  ${row}  0 0 0 0 1`,
				result: `shade-${k}`
			}), svg("feComposite", {
				in: `shade-${k}`,
				in2: bent,
				operator: "arithmetic",
				k1: 1,
				result: `lit-${k}`
			}));
			lit = `lit-${k}`;
		}
		filter.append(svg("feComposite", {
			in: lit,
			in2: merged("raw"),
			operator: "in",
			result: merged("inside")
		}));
		return {
			boxed,
			rays,
			soften
		};
	});
	if (!single) for (const name of [
		"raw",
		"inside",
		...standIn ? ["shape"] : []
	]) {
		const merge = svg("feMerge", { result: name });
		lenses.forEach((_, k) => merge.append(svg("feMergeNode", { in: `${name}-${k}` })));
		filter.append(merge);
	}
	filter.append(svg("feComposite", {
		in: "SourceGraphic",
		in2: "raw",
		operator: "out",
		result: "outside"
	}), svg("feComposite", {
		in: "inside",
		in2: "outside",
		operator: "arithmetic",
		k2: 1,
		k3: 1,
		result: "seen"
	}));
	if (standIn) filter.append(svg("feComposite", {
		in: "seen",
		in2: "shape",
		operator: "in"
	}));
	return {
		filter,
		parts
	};
}
function place$1(graph, placed, across, down, box) {
	if (!box) for (const [key, value] of Object.entries({
		x: 0,
		y: 0,
		width: across,
		height: down
	})) graph.filter.setAttribute(key, String(value));
	placed.forEach((lens, k) => {
		const part = graph.parts[k];
		const spectrum = [
			1 + .2 * lens.dispersion,
			1 + .1 * lens.dispersion,
			1
		];
		part.rays.forEach(([pullAcross, pullDown], i) => {
			pullAcross.setAttribute("scale", String((box ? lens.reach / across : lens.reach) * spectrum[i]));
			pullDown.setAttribute("scale", String((box ? lens.reach / down : lens.reach) * spectrum[i]));
		});
		const blur = Math.max(lens.blur, .01);
		part.soften?.setAttribute("stdDeviation", box ? `${blur / across} ${blur / down}` : String(blur));
		const rect = box ? {
			x: lens.x / across,
			y: lens.y / down,
			width: lens.width / across,
			height: lens.height / down
		} : {
			x: lens.x,
			y: lens.y,
			width: lens.width,
			height: lens.height
		};
		for (const element of part.boxed) for (const [key, value] of Object.entries(rect)) element.setAttribute(key, String(value));
	});
}
/** The glass's size and corner radius, in px, or null while it has no size. */
function shapeOf(glass, style = getComputedStyle(glass)) {
	const width = glass.offsetWidth;
	const height = glass.offsetHeight;
	if (!width || !height) return null;
	const corner = style.borderTopLeftRadius;
	return {
		width,
		height,
		radius: Math.min(width / 2, height / 2, corner.endsWith("%") ? Math.min(width, height) * parseFloat(corner) / 100 : parseFloat(corner) || 0)
	};
}
/** What a lens reads off its glass: how far it reaches, in px, and how far its colours split. */
function tuning(style, shape, options) {
	const page = parseFloat(style.getPropertyValue("--lg-lens-shine")) || 0;
	const tuned = options.strengthProperty ? parseFloat(style.getPropertyValue(options.strengthProperty)) : NaN;
	const own = page > 0 ? options.darkStrength ?? options.strength : options.strength;
	const strength = Number.isFinite(tuned) ? tuned : own;
	const split = options.dispersionProperty ? parseFloat(style.getPropertyValue(options.dispersionProperty)) : NaN;
	const dispersion = Number.isFinite(split) ? Math.max(0, split) : options.dispersion;
	return {
		reach: strength * (options.bezel ? depthOf(shape, options) : Math.min(shape.width, shape.height)),
		dispersion,
		page
	};
}
function fit(glass, options) {
	const style = getComputedStyle(glass);
	const shape = shapeOf(glass, style);
	if (!shape) return null;
	const { width, height, radius } = shape;
	const { reach, dispersion, page } = tuning(style, shape, options);
	const shine = options.paintsLight ? 0 : options.shine === void 0 ? page : Math.sign(page) * options.shine;
	const density = Math.min(devicePixelRatio || 1, 2);
	const theme = page < 0 && !options.paintsLight ? LIGHT : DARK;
	const light = options.edgeWidth === void 0 ? theme : {
		...theme,
		edgeWidth: options.edgeWidth
	};
	const key = [
		width,
		height,
		radius,
		density,
		JSON.stringify(light),
		JSON.stringify(options)
	].join("|");
	const maps = encode(key, () => lensMap(shape, options, light, density));
	const blur = options.blur ?? 0;
	const ink = options.ink ? page < 0 ? "light" : "dark" : void 0;
	return maps ? {
		maps,
		key: `${key}|${shine}|${ink}`,
		shine,
		ink,
		blur,
		reach,
		dispersion,
		width,
		height
	} : null;
}
const surfaces = /* @__PURE__ */ new Map();
let made = 0;
function render(surface) {
	const { content } = surface;
	const across = content.offsetWidth;
	const down = content.offsetHeight;
	const from = content.getBoundingClientRect();
	const shown = [];
	if (across && down) {
		const unit = from.width / across || 1;
		for (const member of surface.members) {
			const at = member.glass.getBoundingClientRect();
			if (!member.fit || !at.width || !at.height) continue;
			const width = at.width / unit;
			const height = at.height / unit;
			const reach = member.fit.reach * (Math.min(width, height) / Math.min(member.fit.width, member.fit.height)) * member.amount;
			const { dispersion } = member.fit;
			const blur = member.fit.blur * member.amount;
			member.placed = {
				x: (at.left - from.left) / unit,
				y: (at.top - from.top) / unit,
				width,
				height,
				reach,
				dispersion,
				blur
			};
			shown.push(member);
		}
	}
	if (!shown.length) {
		surface.placed = "";
		content.style.removeProperty("filter");
		if (surface.standIn) content.style.removeProperty("visibility");
		surface.standIn = false;
		return;
	}
	const box = boxUnits();
	const standIn = shown.some((member) => member.replaces);
	surface.standIn = standIn;
	const structure = shown.map((member) => member.fit.key).join("\n") + (standIn ? "\nstand-in" : "");
	if (structure !== surface.built || !surface.graph) {
		surface.graph?.filter.remove();
		surface.graph = graph(shown.map((member) => member.fit), box, standIn);
		container().append(surface.graph.filter);
		surface.built = structure;
		surface.placed = "";
	}
	const placed = shown.map((member) => member.placed);
	const next = [
		across,
		down,
		...placed.flatMap(({ x, y, width, height, reach, dispersion, blur }) => [
			x,
			y,
			width,
			height,
			reach,
			dispersion,
			blur
		])
	].map((value) => value.toFixed(2)).join(" ");
	if (next === surface.placed) return;
	surface.placed = next;
	place$1(surface.graph, placed, across, down, box);
	surface.graph.filter.id = `${surface.name}-${++surface.version}`;
	content.style.filter = `url("#${surface.graph.filter.id}")`;
	for (const member of shown) {
		if (!member.replaces) continue;
		content.style.visibility = "visible";
		const { x, y, width, height } = member.placed;
		const behind = member.replaces.getBoundingClientRect();
		const unit = from.width / across || 1;
		mask(member.replaces, {
			image: `url("${member.fit.maps.shape}"), linear-gradient(#000, #000)`,
			position: `${x + (from.left - behind.left) / unit}px ${y + (from.top - behind.top) / unit}px, 0 0`,
			size: `${width}px ${height}px, 100% 100%`
		});
	}
}
const MASKING = [
	"image",
	"position",
	"size",
	"repeat",
	"composite"
];
function mask(element, layers) {
	for (const part of MASKING) {
		element.style.removeProperty(`-webkit-mask-${part}`);
		element.style.removeProperty(`mask-${part}`);
	}
	if (!layers) return;
	const values = {
		...layers,
		repeat: "no-repeat",
		composite: "exclude"
	};
	for (const part of MASKING) {
		element.style.setProperty(`-webkit-mask-${part}`, part === "composite" ? "xor" : values[part]);
		element.style.setProperty(`mask-${part}`, values[part]);
	}
}
/**
* Makes `glass` a lens over `content`, which must have room for the whole
* lens. Given `replaces`, the content is a stand-in for it under the glass:
* the content is shown only within the lens (keep it hidden otherwise), and
* `replaces` is hidden there. Unless the glass paints its own light, the
* glass's `--lg-lens-shine` sets the light on its rim: above 0 it brightens,
* below 0 it darkens, as on a light page. Both it and the strength property
* are read each time the lens becomes active or is refitted.
*/
function createLens(glass, content, options, replaces) {
	let surface = surfaces.get(content);
	if (!surface) {
		surface = {
			content,
			lenses: 0,
			members: [],
			name: `glisse-lens-${made++}`,
			standIn: false,
			built: "",
			placed: "",
			version: 0
		};
		surfaces.set(content, surface);
	}
	const shared = surface;
	shared.lenses++;
	const member = {
		glass,
		options,
		replaces,
		amount: 1
	};
	let active = false;
	const prepare = () => {
		member.fit = fit(glass, options) ?? void 0;
	};
	const lens = {
		setActive(next) {
			if (next === active) return;
			active = next;
			if (active) {
				shared.members.push(member);
				prepare();
			} else {
				shared.members.splice(shared.members.indexOf(member), 1);
				if (replaces) mask(replaces);
			}
			render(shared);
		},
		update(amount) {
			if (amount !== void 0) member.amount = clamp$4(amount, 0, 1);
			if (active) render(shared);
		},
		refit() {
			if (!active) return;
			prepare();
			render(shared);
		},
		destroy() {
			lens.setActive(false);
			if (--shared.lenses > 0) return;
			shared.graph?.filter.remove();
			surfaces.delete(content);
		}
	};
	return lens;
}
/**
* Bends the glass's backdrop with the same lens, unlit, as the glass bends
* content of its own: a filter of its own, set as `--lg-filter` for its
* `backdrop-filter`, rescaled as its bend grows. Its maps are those of the
* glass's other lenses with the same options, so cost nothing more.
*/
function createBackdropLens(glass, options) {
	const name = `glisse-bend-${made++}`;
	let fitted = null;
	let built = null;
	let key = "";
	let amount = 0;
	let version = 0;
	const draw = () => {
		if (!fitted || !built) return;
		const { width, height, dispersion, blur } = fitted;
		const reach = fitted.reach * amount;
		place$1(built, [{
			x: 0,
			y: 0,
			width,
			height,
			reach,
			dispersion,
			blur: blur * amount
		}], width, height, false);
		built.filter.id = `${name}-${++version}`;
		glass.style.setProperty("--lg-filter", `url("#${built.filter.id}")`);
	};
	return {
		update(next) {
			next = Math.round(clamp$4(next, 0, 1) * 20) / 20;
			if (next === amount) return;
			amount = next;
			draw();
		},
		refit() {
			fitted = fit(glass, options);
			if (!fitted) return;
			if (fitted.key !== key) {
				built?.filter.remove();
				built = graph([{
					maps: fitted.maps,
					shine: 0,
					blur: fitted.blur
				}], false, false);
				container().append(built.filter);
				key = fitted.key;
			}
			draw();
		},
		destroy() {
			built?.filter.remove();
			built = null;
			glass.style.removeProperty("--lg-filter");
		}
	};
}
const backdrops = /* @__PURE__ */ new Map();
/**
* Fits glass that bends its own backdrop, as only Chromium can: a lens's
* filter drawn for the glass's box, set as `--lg-filter` for its
* `backdrop-filter`.
*/
function fitBackdropLens(glass, options) {
	const fitted = fit(glass, options);
	if (!fitted) return;
	const { maps, key, shine, reach, dispersion, width, height } = fitted;
	const id = `${key}|${reach}|${dispersion}`;
	let name = backdrops.get(id);
	if (!name) {
		const built = graph([{
			maps,
			shine
		}], false, false);
		place$1(built, [{
			x: 0,
			y: 0,
			width,
			height,
			reach,
			dispersion,
			blur: 0
		}], width, height, false);
		name = `glisse-backdrop-${backdrops.size}`;
		built.filter.id = name;
		container().append(built.filter);
		backdrops.set(id, name);
	}
	glass.style.setProperty("--lg-filter", `url("#${name}") saturate(1.5)`);
}
// src/internal/refraction.ts
const GLASS = {
	strength: 2,
	strengthProperty: "--lg-glass-bend",
	dispersion: .6,
	dispersionProperty: "--lg-glass-dispersion",
	depth: .3,
	maxDepth: 36,
	dome: 0,
	splay: 1,
	relative: true,
	bezel: true,
	paintsLight: true
};
const clamp$2 = (value, min, max) => Math.min(max, Math.max(min, value));
const RIM_WIDTH = 1.22;
const EDGE_WIDTH = .5;
/** The rim's light, white, over its edge line, at `density` pixels to the px. */
function rimMap({ width, height, radius }, shine, density, edge = [
	0,
	0,
	0,
	0
]) {
	const columns = Math.max(1, Math.round(width * density));
	const rows = Math.max(1, Math.round(height * density));
	const data = new Uint8ClampedArray(columns * rows * 4);
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const corner = clamp$2(radius, 0, Math.min(halfWidth, halfHeight));
	const half = .5 / density;
	for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
		const x = (column + .5) / columns * width - halfWidth;
		const y = (row + .5) / rows * height - halfHeight;
		const depth = -distance(x, y, halfWidth, halfHeight, corner);
		if (depth < -half || depth > 2 * RIM_WIDTH) continue;
		const qx = Math.abs(x) - halfWidth + corner;
		const qy = Math.abs(y) - halfHeight + corner;
		let nx = 0;
		let ny = 0;
		if (qx > 0 && qy > 0) {
			const length = Math.hypot(qx, qy);
			nx = Math.sign(x) * qx / length;
			ny = Math.sign(y) * qy / length;
		} else if (qx > qy) nx = Math.sign(x);
		else ny = Math.sign(y);
		const facing = Math.abs(nx + ny);
		const along = Math.max(0, depth) / (RIM_WIDTH * Math.sqrt(Math.max(1, facing)));
		const cover = clamp$2((depth + half) * density, 0, 1);
		const lined = clamp$2((Math.min(EDGE_WIDTH, depth + half) - Math.max(0, depth - half)) * density, 0, 1);
		const light = along < 1 ? shine * Math.min(1, facing) ** 1.5 * (1 - along ** 1.5) * cover : 0;
		const line = edge[3] * lined * (1 - light);
		const alpha = light + line;
		if (alpha <= 0) continue;
		const i = (row * columns + column) * 4;
		for (let channel = 0; channel < 3; channel++) data[i + channel] = Math.round((255 * light + edge[channel] * line) / alpha);
		data[i + 3] = Math.round(255 * alpha);
	}
	return {
		columns,
		rows,
		data
	};
}
function parseColour(context, colour) {
	context.fillStyle = "#0000";
	context.fillStyle = colour;
	const value = String(context.fillStyle);
	if (value.startsWith("#")) {
		const [r, g, b] = [
			1,
			3,
			5
		].map((at) => parseInt(value.slice(at, at + 2), 16));
		return [
			r,
			g,
			b,
			1
		];
	}
	const [r = 0, g = 0, b = 0, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number);
	return [
		r,
		g,
		b,
		a
	];
}
const rims = /* @__PURE__ */ new Map();
let palette;
function paintRim(element) {
	const style = getComputedStyle(element);
	const shape = shapeOf(element, style);
	palette ??= document.createElement("canvas").getContext("2d");
	if (!shape || !palette) return;
	const tuned = parseFloat(style.getPropertyValue("--lg-rim-shine"));
	const shine = Number.isFinite(tuned) ? clamp$2(tuned, 0, 1) : .13;
	const edge = parseColour(palette, style.getPropertyValue("--lg-edge").trim() || "transparent");
	const density = Math.min(devicePixelRatio || 1, 3);
	const key = [
		shape.width,
		shape.height,
		shape.radius,
		shine,
		edge,
		density
	].join("|");
	let url = rims.get(key);
	if (!url) {
		const { columns, rows, data } = rimMap(shape, shine, density, edge);
		const canvas = document.createElement("canvas");
		canvas.width = columns;
		canvas.height = rows;
		const context = canvas.getContext("2d");
		if (!context) return;
		const image = context.createImageData(columns, rows);
		image.data.set(data);
		context.putImageData(image, 0, 0);
		url = `url("${canvas.toDataURL()}")`;
		rims.set(key, url);
	}
	element.style.setProperty("--lg-rim", url);
	element.setAttribute("data-rim", "");
}
const repaints = /* @__PURE__ */ new Set();
let unwatch;
function onThemeChange(repaint) {
	repaints.add(repaint);
	if (!unwatch) {
		const run = () => repaints.forEach((each) => each());
		const observer = new MutationObserver(run);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
			subtree: true
		});
		const scheme = matchMedia("(prefers-color-scheme: dark)");
		scheme.addEventListener?.("change", run);
		unwatch = () => {
			observer.disconnect();
			scheme.removeEventListener?.("change", run);
		};
	}
	return () => {
		repaints.delete(repaint);
		if (repaints.size) return;
		unwatch?.();
		unwatch = void 0;
	};
}
function whenIdle(callback) {
	if ("requestIdleCallback" in window) {
		const handle = requestIdleCallback(callback, { timeout: 500 });
		return () => cancelIdleCallback(handle);
	}
	const handle = setTimeout(callback, 50);
	return () => clearTimeout(handle);
}
function refitting(element, fit, properties) {
	let cancel;
	let fitted = false;
	const observer = new ResizeObserver(() => {
		cancel?.();
		cancel = whenIdle(() => {
			fitted = true;
			fit();
		});
	});
	observer.observe(element);
	return {
		refit: () => {
			if (fitted) fit();
		},
		stop: () => {
			cancel?.();
			observer.disconnect();
			for (const name of properties) element.style.removeProperty(name);
		}
	};
}
/** Only Chromium applies SVG filters to the live backdrop. */
const refractsBackdrop = () => /Chrom(?:e|ium)\//.test(navigator.userAgent);
const SELECTION_PROPERTIES = [
	"--lg-filter",
	"--lg-rim",
	"--lg-rim-bright"
];
const selections = /* @__PURE__ */ new Map();
function profile(bezel, thickness) {
	const samples = /* @__PURE__ */ new Float32Array(128);
	let maximum = 0;
	for (let i = 0; i < samples.length; i++) {
		const t = Math.max(.001, i / (samples.length - 1));
		const surface = (1 - (1 - t) ** 4) ** .25;
		const incident = Math.atan((1 - t) ** 3 / surface ** 3);
		const refracted = Math.asin(Math.sin(incident) / 1.5);
		samples[i] = Math.tan(incident - refracted) * (thickness + surface * bezel);
		maximum = Math.max(maximum, samples[i]);
	}
	return {
		samples,
		maximum
	};
}
function selectionMaps(width, height, radius) {
	const density = Math.min(devicePixelRatio || 1, 2);
	const bezel = clamp$2(Math.min(width, height) * .12, 4, 10);
	const { samples, maximum } = profile(bezel, clamp$2(Math.min(width, height) * .2, 8, 24));
	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(width * density);
	canvas.height = Math.ceil(height * density);
	const context = canvas.getContext("2d");
	const field = context.createImageData(canvas.width, canvas.height);
	const shine = context.createImageData(canvas.width, canvas.height);
	const bright = context.createImageData(canvas.width, canvas.height);
	for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
		const px = (x + .5) * width / canvas.width - width / 2;
		const py = (y + .5) * height / canvas.height - height / 2;
		const qx = Math.abs(px) - (width / 2 - radius);
		const qy = Math.abs(py) - (height / 2 - radius);
		const ox = Math.max(qx, 0);
		const oy = Math.max(qy, 0);
		const length = Math.hypot(ox, oy);
		const distance = radius - (length + Math.min(Math.max(qx, qy), 0));
		const nx = length > 0 ? ox / length * Math.sign(px) : qx > qy ? Math.sign(px) : 0;
		const ny = length > 0 ? oy / length * Math.sign(py) : qx > qy ? 0 : Math.sign(py);
		let shift = 0;
		if (distance >= 0 && distance < bezel) {
			const sample = distance / bezel * (samples.length - 1);
			const lower = Math.floor(sample);
			const a = samples[lower];
			shift = a + (samples[Math.min(lower + 1, samples.length - 1)] - a) * (sample - lower);
		}
		const i = (y * canvas.width + x) * 4;
		field.data[i] = Math.round(127.5 + nx * shift / maximum * 127.5);
		field.data[i + 1] = Math.round(127.5 + ny * shift / maximum * 127.5);
		field.data[i + 2] = 128;
		field.data[i + 3] = 255;
		const light = -(nx + ny) * Math.SQRT1_2;
		const glint = Math.max(light, 0) ** 3;
		const reflected = Math.max(-light, 0) ** 3;
		shine.data[i] = shine.data[i + 1] = shine.data[i + 2] = 255;
		let alpha = 0;
		if (distance >= 0) {
			const bands = [
				.18,
				.42,
				.66
			].map((centre) => Math.exp(-(((distance - centre) / .22) ** 2)));
			const peak = Math.max(...bands);
			alpha = peak * (.06 + .8 * glint + .35 * reflected) * .85;
			for (let channel = 0; channel < 3; channel++) shine.data[i + channel] = Math.round(255 * (.65 + .35 * (peak ? bands[channel] / peak : 0)));
			const wide = [
				.4,
				.5,
				.6
			].map((centre) => Math.exp(-(((distance - centre) / .4) ** 2)));
			const top = Math.max(...wide);
			for (let channel = 0; channel < 3; channel++) bright.data[i + channel] = Math.round(255 * (.85 + .15 * (top ? wide[channel] / top : 0)));
			bright.data[i + 3] = Math.round(clamp$2(top * (.55 + .3 * glint + .15 * reflected), 0, 1) * 255);
		}
		shine.data[i + 3] = Math.round(clamp$2(alpha, 0, 1) * 255);
	}
	context.putImageData(field, 0, 0);
	const displacement = canvas.toDataURL();
	context.putImageData(shine, 0, 0);
	const highlight = canvas.toDataURL();
	context.putImageData(bright, 0, 0);
	return {
		displacement,
		highlight,
		brightHighlight: canvas.toDataURL(),
		scale: maximum * 2
	};
}
function selectionLens(width, height, radius) {
	const key = [
		width,
		height,
		radius
	].join("-");
	const cached = selections.get(key);
	if (cached) return cached;
	const { displacement, highlight, brightHighlight, scale } = selectionMaps(width, height, radius);
	const id = `glisse-selection-${selections.size}`;
	const box = {
		x: 0,
		y: 0,
		width,
		height
	};
	const filter = svg("filter", {
		id,
		...box,
		filterUnits: "userSpaceOnUse",
		primitiveUnits: "userSpaceOnUse",
		"color-interpolation-filters": "sRGB"
	});
	filter.append(svg("feImage", {
		href: displacement,
		...box,
		preserveAspectRatio: "none",
		result: "field"
	}));
	for (const [name, factor, values] of [
		[
			"r",
			1.035,
			"1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
		],
		[
			"g",
			1,
			"0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
		],
		[
			"b",
			.965,
			"0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
		]
	]) filter.append(svg("feDisplacementMap", {
		in: "SourceGraphic",
		in2: "field",
		scale: scale * factor,
		xChannelSelector: "R",
		yChannelSelector: "G",
		result: `${name}-ray`
	}), svg("feColorMatrix", {
		in: `${name}-ray`,
		type: "matrix",
		values,
		result: name
	}));
	filter.append(svg("feComposite", {
		in: "r",
		in2: "g",
		operator: "arithmetic",
		k2: 1,
		k3: 1,
		result: "rg"
	}), svg("feComposite", {
		in: "rg",
		in2: "b",
		operator: "arithmetic",
		k2: 1,
		k3: 1
	}));
	container().append(filter);
	const result = {
		filter: `url("#${id}")`,
		rim: `url("${highlight}")`,
		brightRim: `url("${brightHighlight}")`
	};
	selections.set(key, result);
	return result;
}
function fitSelection(element, filtered) {
	const width = element.offsetWidth;
	const height = element.offsetHeight;
	if (!width || !height) return;
	const corner = getComputedStyle(element).borderTopLeftRadius;
	const { filter, rim, brightRim } = selectionLens(width, height, Math.min(width / 2, height / 2, corner.endsWith("%") ? Math.min(width, height) * parseFloat(corner) / 100 : parseFloat(corner)));
	if (filtered) element.style.setProperty("--lg-filter", filter);
	element.style.setProperty("--lg-rim", rim);
	element.style.setProperty("--lg-rim-bright", brightRim);
}
// src/menu.tsx (its effect)
const clamp$1 = (value) => Math.min(1, Math.max(0, value));
const resistance = (value) => Math.sign(value) * 7 * (1 - Math.exp(-Math.abs(value) * .12 / 7));
function attachMenu({ triggerRef, cardRef, surfaceRef, glyphRef, contentRef, plateRef, morphRef, latest, setPhase }) {
		const trigger = triggerRef.current;
		const card = cardRef.current;
		const surface = surfaceRef.current;
		const glyph = glyphRef.current;
		const content = contentRef.current;
		const plate = plateRef.current;
		const from = {
			width: trigger.offsetWidth,
			height: trigger.offsetHeight
		};
		const to = {
			width: card.offsetWidth,
			height: card.offsetHeight
		};
		const radius = parseFloat(getComputedStyle(surface).borderTopLeftRadius);
		const trailing = card.dataset.align !== "start";
		const origin = {
			x: trailing ? to.width - from.width / 2 : from.width / 2,
			y: from.height / 2
		};
		content.style.transformOrigin = `${origin.x}px ${origin.y}px`;
		glyph.style.width = `${from.width}px`;
		glyph.style.height = `${from.height}px`;
		let leaving = false;
		const shape = createSpring(0, 600, 46, (value) => {
			const t = clamp$1(value);
			const settled = t === 1;
			const width = from.width + (to.width - from.width) * t;
			const height = from.height + (to.height - from.height) * t;
			const scale = .5 + .5 * t;
			const local = (edge, centre) => centre + (edge - centre) / scale;
			const left = local(trailing ? to.width - width : 0, origin.x);
			const right = local(trailing ? to.width : width, origin.x);
			const bottom = local(height, origin.y);
			const top = local(0, origin.y);
			surface.style.width = settled ? "" : `${width}px`;
			surface.style.height = settled ? "" : `${height}px`;
			surface.style.opacity = String(clamp$1(t / .2));
			trigger.style.opacity = t === 0 ? "" : String(1 - clamp$1(t / .2));
			const drift = .3 * t;
			const dx = ((trailing ? to.width - width / 2 : width / 2) - origin.x) * drift;
			const dy = (height / 2 - origin.y) * drift;
			glyph.style.opacity = String(1 - clamp$1(t / .45));
			glyph.style.transform = `translate(${dx}px, ${dy}px) scale(${1 + .6 * t})`;
			glyph.style.filter = `blur(${8 * t}px)`;
			content.style.opacity = String(leaving ? clamp$1((t - .55) / .45) : clamp$1((t - .15) / .6));
			content.style.transform = settled ? "" : `scale(${scale})`;
			content.style.filter = settled ? "" : `blur(${6 * (1 - t)}px)`;
			content.style.clipPath = settled ? "" : `inset(${top}px ${to.width - right}px ${to.height - bottom}px ${left}px round ${radius / scale}px)`;
			if (leaving && value === 0) setPhase("closed");
		});
		const morph = {
			...shape,
			set(target, instant) {
				leaving = target === 0;
				if (leaving) shape.tune(900, 57);
				else shape.tune(600, 46);
				shape.set(target, instant);
			}
		};
		morphRef.current = morph;
		shape.paint();
		morph.set(1);
		const rows = () => [...card.querySelectorAll(".lg-menu-item:not(:disabled)")];
		rows()[0]?.focus({ preventScroll: true });
		const offset = {
			scale: 1,
			x: 0,
			y: 0
		};
		const paint = () => {
			card.style.scale = String(offset.scale);
			card.style.translate = `${offset.x}px ${offset.y}px`;
		};
		const scale = createSpring(1, 650, 36, (value) => {
			offset.scale = value;
			paint();
		});
		const x = createSpring(0, 600, 30, (value) => {
			offset.x = value;
			paint();
		});
		const y = createSpring(0, 600, 30, (value) => {
			offset.y = value;
			paint();
		});
		let gesture = null;
		let current = null;
		let suppressClickUntil = 0;
		const close = (restoreFocus = true) => {
			setPhase("leaving");
			if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
		};
		const highlight = (row) => {
			if (current === row) return;
			const first = !current;
			current = row;
			if (!row) {
				delete card.dataset.scrubbing;
				plate.style.opacity = "0";
				return;
			}
			card.dataset.scrubbing = "";
			plate.style.width = `${row.offsetWidth}px`;
			plate.style.height = `${row.offsetHeight}px`;
			if (first) plate.style.transition = "none";
			plate.style.transform = `translate(${row.offsetLeft}px, ${row.offsetTop}px)`;
			plate.style.opacity = "1";
			if (first) {
				plate.offsetWidth;
				plate.style.transition = "";
			}
		};
		const rowAt = (clientX, clientY) => {
			const row = document.elementFromPoint(clientX, clientY)?.closest(".lg-menu-item");
			return row && !row.disabled && card.contains(row) ? row : null;
		};
		const down = (event) => {
			if (!event.isPrimary || event.button !== 0) return;
			gesture = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY
			};
			card.setPointerCapture(event.pointerId);
			card.dataset.pressed = "";
			scale.set(1 + 5 / Math.max(card.offsetWidth, card.offsetHeight, 200));
			highlight(rowAt(event.clientX, event.clientY));
		};
		const move = (event) => {
			if (!gesture) {
				const row = event.pointerType === "mouse" ? rowAt(event.clientX, event.clientY) : null;
				if (row) highlight(row);
				return;
			}
			if (event.pointerId !== gesture.id) return;
			highlight(rowAt(event.clientX, event.clientY));
			x.set(resistance(event.clientX - gesture.x), true);
			y.set(resistance(event.clientY - gesture.y), true);
		};
		const end = (event) => {
			if (event.pointerId !== gesture?.id) return;
			const chosen = event.type === "pointerup" ? rowAt(event.clientX, event.clientY) : null;
			highlight(null);
			gesture = null;
			delete card.dataset.pressed;
			scale.set(1);
			x.set(0);
			y.set(0);
			suppressClickUntil = performance.now() + 500;
			chosen?.click();
		};
		const leave = (event) => {
			if (!gesture && event.pointerType === "mouse") highlight(null);
		};
		const click = (event) => {
			const row = event.target.closest(".lg-menu-item");
			if (!row || event.detail !== 0 && performance.now() < suppressClickUntil) return;
			const item = latest.current[Number(row.dataset.index)];
			if (!item || item === "separator") return;
			close();
			item.onSelect?.();
		};
		const key = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close();
			} else if (event.key === "Tab") close(false);
			else if ([
				"ArrowDown",
				"ArrowUp",
				"Home",
				"End"
			].includes(event.key)) {
				event.preventDefault();
				if (!gesture) highlight(null);
				const list = rows();
				const index = list.indexOf(document.activeElement);
				list[event.key === "Home" ? 0 : event.key === "End" ? list.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
			}
		};
		const outside = (event) => {
			const target = event.target;
			if (!card.contains(target) && !triggerRef.current?.contains(target)) close(false);
		};
		card.addEventListener("pointerdown", down);
		card.addEventListener("pointermove", move);
		card.addEventListener("pointerleave", leave);
		card.addEventListener("pointerup", end);
		card.addEventListener("pointercancel", end);
		card.addEventListener("lostpointercapture", end);
		card.addEventListener("click", click);
		card.addEventListener("keydown", key);
		document.addEventListener("pointerdown", outside, true);
		return () => {
			[
				shape,
				scale,
				x,
				y
			].forEach((spring) => spring.stop());
			morphRef.current = null;
			trigger.style.opacity = "";
			card.removeEventListener("pointerdown", down);
			card.removeEventListener("pointermove", move);
			card.removeEventListener("pointerleave", leave);
			card.removeEventListener("pointerup", end);
			card.removeEventListener("pointercancel", end);
			card.removeEventListener("lostpointercapture", end);
			card.removeEventListener("click", click);
			card.removeEventListener("keydown", key);
			document.removeEventListener("pointerdown", outside, true);
		};
}
const held = (at, moved) => moved || performance.now() - at >= 150;
// src/internal/segments.tsx
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const keys = [
	"ArrowLeft",
	"ArrowRight",
	"Home",
	"End"
];
const REST = [
	1024,
	58.9,
	676,
	47.8
];
const UNDER = .5;
const DRAG = [
	2500,
	94,
	576,
	44.2
];
const LENS$2 = {
	strength: .2,
	strengthProperty: "--lg-tab-bend",
	dispersion: 2,
	dispersionProperty: "--lg-tab-dispersion",
	depth: 4,
	dome: 0,
	splay: 1,
	ink: true,
	blur: 2
};
const SEGMENT_LENS = {
	strength: .3,
	strengthProperty: "--lg-segment-bend",
	dispersion: .1,
	depth: 2.5,
	dome: 0,
	splay: 1
};
function attach({ bar, glass, thumb, labels, lensed, lens, tint, row }, options, bendsBackdrop, select) {
	const tabs = [...bar.querySelectorAll(".lg-tab")];
	let slot = 0;
	let width = 0;
	let height = 0;
	let inset = 0;
	let padding = 0;
	let growX = 16;
	let growY = 12;
	let active = -1;
	let shown = false;
	let settleFrame = 0;
	let gesture = null;
	const state = {
		x: 0,
		lift: 0
	};
	const refraction = createLens(lens, lensed, options, labels);
	const backdrop = bendsBackdrop && refractsBackdrop() ? createBackdropLens(lens, options) : null;
	let lensing = false;
	const mark = () => bar.toggleAttribute("data-away", active < 0 || Math.abs(state.x - active * slot) > .5);
	const measure = () => {
		const style = getComputedStyle(bar);
		padding = parseFloat(style.paddingLeft) || 0;
		slot = (bar.clientWidth - padding - (parseFloat(style.paddingRight) || 0)) / tabs.length;
		inset = parseFloat(style.getPropertyValue("--lg-thumb-inset")) || 0;
		width = slot - 2 * inset;
		height = lens.offsetHeight;
		growX = parseFloat(style.getPropertyValue("--lg-lens-grow-x")) || 0;
		growY = parseFloat(style.getPropertyValue("--lg-lens-grow-y")) || 0;
	};
	const paint = () => {
		const { x, lift } = state;
		const sx = 1 + growX / width * lift;
		const sy = 1 + growY / height * lift;
		const transform = `translateX(${x}px) scale(${sx}, ${sy})`;
		lens.style.transform = tint.style.transform = transform;
		if (thumb) thumb.style.transform = transform;
		lens.style.setProperty("--lg-lift", String(clamp(lift, 0, 1)));
		lens.style.setProperty("--lg-lift-y", String(sy));
		row.style.transform = `scale(${1 / sx}, ${1 / sy}) translate(${-x + (sx - 1) * (inset + width / 2)}px, ${(sy - 1) * (inset + height / 2)}px)`;
		if (!gesture && lift < .01) delete bar.dataset.refracting;
		mark();
		if (lift > .01 !== lensing) {
			lensing = lift > .01;
			bar.toggleAttribute("data-lensing", lensing);
			refraction.setActive(lensing);
		}
		const amount = clamp(lift, 0, 1);
		const under = clamp((lift - UNDER) / .5, 0, 1);
		lens.style.setProperty("--lg-rest", String(clamp(1 - lift / UNDER, 0, 1)));
		lens.style.setProperty("--lg-under", String(under));
		bar.toggleAttribute("data-under", lift > UNDER);
		refraction.update(Math.round(amount * 20) / 20);
		backdrop?.update(under);
	};
	let painting = false;
	const repaint = () => {
		if (painting) return;
		painting = true;
		queueMicrotask(() => {
			painting = false;
			paint();
		});
	};
	const x = createSpring(0, REST[0], REST[1], (value) => {
		state.x = value;
		repaint();
	});
	const lift = createSpring(0, REST[2], REST[3], (value) => {
		state.lift = value;
		repaint();
	});
	const move = (target, lifted, instant = false) => {
		const [slideStiffness, slideDamping, liftStiffness, liftDamping] = gesture ? DRAG : REST;
		x.tune(slideStiffness, slideDamping);
		lift.tune(liftStiffness, liftDamping);
		x.set(target, instant);
		lift.set(lifted ? 1 : 0, instant);
	};
	const settle = (instant = false) => {
		mark();
		if (gesture) return;
		const show = active >= 0;
		if (show) delete bar.dataset.hidden;
		else bar.dataset.hidden = "";
		if (show) move(active * slot, false, instant || !shown);
		shown = show;
	};
	const position = (event) => clamp(gesture.anchor + event.clientX - gesture.x, 0, slot * (tabs.length - 1));
	const light = (event, box) => {
		glass.style.setProperty("--lg-x", `${clamp((event.clientX - box.left) / box.width * 100, 0, 100)}%`);
		lens.style.setProperty("--lg-x", `${clamp((event.clientX - box.left - padding - inset - state.x) / width * 100, 0, 100)}%`);
	};
	const release = () => {
		const old = gesture;
		gesture = null;
		delete bar.dataset.lifted;
		delete lens.dataset.pressed;
		if (old && bar.hasPointerCapture(old.id)) bar.releasePointerCapture(old.id);
		return old;
	};
	let suppressClick = false;
	const onPointerDown = (event) => {
		const tab = event.target.closest(".lg-tab");
		if (!event.isPrimary || event.button !== 0 || gesture || !tab) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		cancelAnimationFrame(settleFrame);
		settleFrame = 0;
		measure();
		bar.toggleAttribute("data-light", parseFloat(getComputedStyle(lens).getPropertyValue("--lg-lens-shine")) < 0);
		backdrop?.refit();
		const box = bar.getBoundingClientRect();
		gesture = {
			id: event.pointerId,
			x: event.clientX,
			anchor: tabs.indexOf(tab) * slot,
			moved: false,
			box,
			at: performance.now()
		};
		suppressClick = false;
		bar.dataset.lifted = "";
		bar.dataset.refracting = "";
		delete bar.dataset.hidden;
		lens.dataset.pressed = "";
		light(event, box);
		move(gesture.anchor, true, !shown);
		shown = true;
	};
	const onPointerMove = (event) => {
		if (event.pointerId !== gesture?.id) return;
		if (!gesture.moved && Math.abs(event.clientX - gesture.x) > 6) {
			gesture.moved = true;
			bar.setPointerCapture(event.pointerId);
		}
		if (gesture.moved) move(position(event), true);
		light(event, gesture.box);
	};
	const onPointerEnd = (event) => {
		if (event.pointerId !== gesture?.id) return;
		if (event.type === "lostpointercapture" && event.target !== bar) return;
		const index = Math.round(position(event) / slot);
		const { moved, box } = release();
		const near = event.clientY >= box.top - 24 && event.clientY <= box.bottom + 24;
		if (event.type === "pointerup" && (moved || near)) {
			suppressClick = true;
			settleFrame = requestAnimationFrame(() => {
				settleFrame = 0;
				settle();
			});
			tabs[index]?.click();
		} else {
			suppressClick = moved;
			settle();
		}
	};
	const onTouchMove = (event) => {
		if (gesture && event.cancelable && held(gesture.at, gesture.moved)) event.preventDefault();
	};
	const onClick = (event) => {
		if (event.isTrusted && suppressClick && event.detail !== 0) {
			suppressClick = false;
			event.preventDefault();
			return;
		}
		const tab = event.target.closest(".lg-tab");
		if (!tab || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const index = tabs.indexOf(tab);
		if (tab instanceof HTMLAnchorElement) {
			active = index;
			settle();
		}
		select(index);
	};
	const onKeyDown = (event) => {
		const tab = event.target.closest(".lg-tab");
		if (!tab || tab instanceof HTMLAnchorElement || !keys.includes(event.key)) return;
		event.preventDefault();
		const current = tabs.indexOf(tab);
		const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
		select(index);
		tabs[index]?.focus();
	};
	const reset = () => {
		cancelAnimationFrame(settleFrame);
		settleFrame = 0;
		release();
		settle(true);
	};
	const onVisibilityChange = () => {
		if (document.hidden) reset();
	};
	const observer = new ResizeObserver(() => {
		measure();
		if (!gesture) settle(true);
	});
	measure();
	bar.dataset.ready = "";
	bar.addEventListener("pointerdown", onPointerDown);
	window.addEventListener("pointermove", onPointerMove);
	window.addEventListener("pointerup", onPointerEnd);
	window.addEventListener("pointercancel", onPointerEnd);
	bar.addEventListener("lostpointercapture", onPointerEnd);
	bar.addEventListener("touchmove", onTouchMove, { passive: false });
	bar.addEventListener("click", onClick, true);
	bar.addEventListener("keydown", onKeyDown);
	document.addEventListener("visibilitychange", onVisibilityChange);
	window.addEventListener("blur", reset);
	observer.observe(bar);
	return {
		setActive(index) {
			cancelAnimationFrame(settleFrame);
			settleFrame = 0;
			active = index;
			settle();
		},
		destroy() {
			cancelAnimationFrame(settleFrame);
			x.stop();
			lift.stop();
			refraction.destroy();
			backdrop?.destroy();
			observer.disconnect();
			for (const key of [
				"ready",
				"hidden",
				"lifted",
				"refracting",
				"lensing",
				"away",
				"light",
				"under"
			]) delete bar.dataset[key];
			bar.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerEnd);
			window.removeEventListener("pointercancel", onPointerEnd);
			bar.removeEventListener("lostpointercapture", onPointerEnd);
			bar.removeEventListener("touchmove", onTouchMove);
			bar.removeEventListener("click", onClick, true);
			bar.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("visibilitychange", onVisibilityChange);
			window.removeEventListener("blur", reset);
		}
	};
}
// src/slider.tsx (its effect)
const LENS$1 = {
	strength: .75,
	strengthProperty: "--lg-slider-bend",
	dispersion: .65,
	depth: 2,
	dome: 5,
	splay: .5
};
function attachSlider({ rootRef, inputRef, bedRef, magnifiedRef, thumbRef, faceRef, lensRef }) {
		const input = inputRef.current;
		const thumb = thumbRef.current;
		const face = faceRef.current;
		const root = rootRef.current;
		const lens = createLens(thumb, magnifiedRef.current, LENS$1, bedRef.current);
		lensRef.current = lens;
		const lift = createSpring(0, 2e3, 80, (amount) => {
			const lifted = Math.min(1, Math.max(0, amount));
			thumb.style.scale = String(.6 + .4 * amount);
			root.style.setProperty("--lg-lift", String(lifted));
			face.style.opacity = String(1 - .85 * lifted);
			lens.setActive(amount > .01);
			lens.update();
		});
		const hold = () => {
			if (!input.disabled) lift.set(1);
		};
		const release = () => lift.set(0);
		const ends = [
			"pointerup",
			"pointercancel",
			"lostpointercapture",
			"blur"
		];
		input.addEventListener("pointerdown", hold);
		ends.forEach((type) => input.addEventListener(type, release));
		window.addEventListener("pointerup", release);
		return () => {
			lift.stop();
			lens.destroy();
			lensRef.current = null;
			input.removeEventListener("pointerdown", hold);
			ends.forEach((type) => input.removeEventListener(type, release));
			window.removeEventListener("pointerup", release);
		};
}
// src/switch.tsx (its effect)
const TRAVEL = 21.7125;
const unit = (value) => Math.min(1, Math.max(0, value));
const LENS = {
	strength: .45,
	strengthProperty: "--lg-switch-bend",
	dispersion: 1,
	depth: 2,
	dome: 6,
	splay: .4
};
function attachSwitch({ ref, bedRef, insetRef, fillRef, insetFillRef, thumbRef, faceRef, latest, springs }) {
		const el = ref.current;
		const fills = [fillRef.current, insetFillRef.current];
		const thumb = thumbRef.current;
		const face = faceRef.current;
		const lens = createLens(thumb, insetRef.current, LENS, bedRef.current);
		let x = 0;
		let scale = .65;
		const paint = () => {
			thumb.style.transform = `translate(${x}px, -50%) scale(${scale})`;
			lens.update();
		};
		const initial = latest.current.checked ? 1 : 0;
		const position = createSpring(initial, 1e3, 80, (value) => {
			x = value * latest.current.travel;
			paint();
		});
		const color = createSpring(initial, 1e3, 80, (value) => {
			for (const fill of fills) fill.style.opacity = String(unit(value));
		});
		const lift = createSpring(0, 2e3, 80, (value) => {
			scale = .65 + .25 * value;
			face.style.opacity = String(1 - .85 * unit(value));
			el.style.setProperty("--lg-lift", String(unit(value)));
			lens.setActive(value > .01);
			paint();
		});
		springs.current = {
			position,
			color
		};
		position.paint();
		color.paint();
		lift.paint();
		let gesture = null;
		let ignoreClick = false;
		const sync = () => {
			position.set(latest.current.checked ? 1 : 0);
			color.set(latest.current.checked ? 1 : 0);
		};
		const settle = (next) => {
			const old = gesture;
			gesture = null;
			lift.set(0);
			if (old && el.hasPointerCapture(old.id)) el.releasePointerCapture(old.id);
			if (next === void 0 || next === latest.current.checked) return sync();
			latest.current.setChecked(next);
			requestAnimationFrame(sync);
		};
		const down = (event) => {
			if (!event.isPrimary || event.button !== 0 || el.disabled) return;
			event.preventDefault();
			ignoreClick = false;
			gesture = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				from: latest.current.checked ? 1 : 0,
				moved: false,
				at: performance.now(),
				box: el.getBoundingClientRect()
			};
			el.setPointerCapture(event.pointerId);
			lift.set(1);
		};
		const move = (event) => {
			if (event.pointerId !== gesture?.id) return;
			const dx = event.clientX - gesture.x;
			const dy = Math.abs(event.clientY - gesture.y);
			if (!held(gesture.at, gesture.moved) && dy > 10 && dy > Math.abs(dx) + 4) {
				ignoreClick = true;
				return settle();
			}
			if (!gesture.moved && Math.abs(dx) < 4) return;
			gesture.moved = true;
			const value = gesture.from + dx / latest.current.travel;
			const overshoot = value < 0 ? value : value > 1 ? value - 1 : 0;
			position.set(unit(value) + overshoot / 22);
			color.set(value > .5 ? 1 : 0);
		};
		const up = (event) => {
			if (event.pointerId !== gesture?.id) return;
			ignoreClick = true;
			const { from, x, moved, box } = gesture;
			const value = from + (event.clientX - x) / latest.current.travel;
			const near = event.clientY >= box.top - 24 && event.clientY <= box.bottom + 24;
			settle(moved ? value > .5 : near ? !latest.current.checked : void 0);
		};
		const keep = (event) => {
			if (gesture && event.cancelable && held(gesture.at, gesture.moved)) event.preventDefault();
		};
		const cancel = () => {
			if (!gesture) return;
			ignoreClick = true;
			settle();
		};
		const click = () => {
			if (ignoreClick) ignoreClick = false;
			else if (!el.disabled) latest.current.setChecked(!latest.current.checked);
		};
		el.addEventListener("pointerdown", down);
		el.addEventListener("pointermove", move);
		el.addEventListener("pointerup", up);
		el.addEventListener("pointercancel", cancel);
		el.addEventListener("lostpointercapture", cancel);
		el.addEventListener("touchmove", keep, { passive: false });
		el.addEventListener("click", click);
		return () => {
			springs.current = null;
			[
				position,
				color,
				lift
			].forEach((spring) => spring.stop());
			lens.destroy();
			el.removeEventListener("pointerdown", down);
			el.removeEventListener("pointermove", move);
			el.removeEventListener("pointerup", up);
			el.removeEventListener("pointercancel", cancel);
			el.removeEventListener("lostpointercapture", cancel);
			el.removeEventListener("touchmove", keep);
			el.removeEventListener("click", click);
		};
}

export {
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
};
