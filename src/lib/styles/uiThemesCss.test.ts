/**
 * 守卫：三套主题（糖果 a / 森林 b / 海洋 c）只许换「颜色、背景、阴影、滤镜、装饰 emoji、线型」，
 * 不许各自写一套字号、行高、字距、对齐、间距、尺寸、圆角、边框粗细、字体。
 * 这些版式值只在 ui-themes.css 的 :root 里定义一次，三个主题共用。
 * 屏幕、@media print、导出 PDF（data-ink='print'）三处的主题块都受这条约束。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());
const CSS_PATH = join(ROOT, 'src/lib/styles/ui-themes.css');
const css = readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

type Block = { selector: string; decls: [string, string][] };

/** 只取最内层的 `选择器 { 声明 }`，@media 外壳自动跳过。 */
function blocks(src: string): Block[] {
	const out: Block[] = [];
	for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selector = m[1].trim().replace(/\s+/g, ' ');
		const decls = m[2]
			.split(';')
			.map((d) => d.trim())
			.filter(Boolean)
			.map((d) => {
				const i = d.indexOf(':');
				return [d.slice(0, i).trim(), d.slice(i + 1).trim()] as [string, string];
			});
		out.push({ selector, decls });
	}
	return out;
}

const all = blocks(css);
const THEME_SEL = /data-ui-theme=['"]?[abc]['"]?/;
const themeBlocks = all.filter((b) => THEME_SEL.test(b.selector));
const themeOf = (sel: string) => sel.match(/data-ui-theme=['"]?([abc])/)![1];
const kindOf = (sel: string) => (sel.includes("data-ink='print'") ? 'pdf' : sel.startsWith('html:root[') ? 'print' : 'screen');

/** 颜色类变量：名字以这些结尾，或者在下面的清单里。 */
const ALLOWED_SUFFIX = /-(fg|bg|color|shadow|shadow-lg|filter|before|after|style|hover|label|value|ring|accent|track|ink|soft)$/;
const ALLOWED_NAMES = new Set([
	'--c-text',
	'--c-muted',
	'--c-title',
	'--c-surface',
	'--c-surface-2',
	'--c-border',
	'--c-focus',
	'--c-primary',
	'--c-success',
	'--c-danger',
	'--c-warn',
	'--c-info',
	'--c-chart-1',
	'--c-chart-2',
	'--c-badge-border',
	'--cp-focus-border',
	'--s-qno',
	'--s-num',
	'--s-op',
	'--s-blank',
	'--s-paren',
	'--s-ans',
	'--s-sep',
	'--s-cmp',
	'--s-vbox',
	'--s-corner',
	'--ui-muted'
]);
/** 名字里一旦出现这些词，就是版式变量，主题块里一律不许写。 */
const LAYOUT_WORD =
	/(size|radius|pad|margin|gap|width|height|-h$|-w$|-bw$|font|weight|-ls$|spacing|align|line-height|inset|transform|indent|offset|-top|-left|-right|-bottom|^--[\w-]*-border$|-frame$|-rule$|-line$)/;
const LENGTH = /\d(px|rem|em|mm|cm|ch|ex|vh|vw|vmin|vmax|pt|pc|in)\b/;
const SHADOWISH = /-(shadow|shadow-lg|ring|bg)$|^--s-cell-shadow$/;

function allowed(name: string) {
	return ALLOWED_SUFFIX.test(name) || ALLOWED_NAMES.has(name);
}

describe('ui-themes.css 主题块只换颜色，不换版式', () => {
	it('能找到屏幕 / 打印 / PDF 三处、每处三个主题的块', () => {
		const seen = new Set(themeBlocks.map((b) => `${kindOf(b.selector)}:${themeOf(b.selector)}`));
		for (const k of ['screen', 'print', 'pdf']) for (const t of 'abc') expect(seen.has(`${k}:${t}`), `${k}:${t}`).toBe(true);
	});

	it('主题选择器只用来放变量：不带后代、伪类、伪元素', () => {
		for (const b of themeBlocks) {
			for (const part of b.selector.split(',').map((s) => s.trim())) {
				if (part === ':root') continue;
				expect(part, b.selector).toMatch(/^html(:root)?(\[data-ink='print'\])?\[data-ui-theme='[abc]'\]$/);
			}
		}
	});

	it('每条声明都是允许清单里的颜色 / 背景 / 阴影 / 装饰变量', () => {
		const bad: string[] = [];
		for (const b of themeBlocks)
			for (const [name, value] of b.decls) {
				const where = `${b.selector} → ${name}: ${value}`;
				if (!name.startsWith('--')) bad.push(`普通属性 ${where}`);
				else if (LAYOUT_WORD.test(name) && !allowed(name)) bad.push(`版式变量 ${where}`);
				else if (!allowed(name)) bad.push(`不在允许清单 ${where}`);
				else if (!SHADOWISH.test(name) && LENGTH.test(value)) bad.push(`带长度单位 ${where}`);
				else if (name.endsWith('-style') && !/^(solid|dashed|dotted|double|none)$/.test(value)) bad.push(`线型不对 ${where}`);
				else if (/-(before|after)$|^--s-corner$/.test(name) && !/^(none|'[^']*'|"[^"]*")$/.test(value)) bad.push(`装饰不是字符串 ${where}`);
			}
		expect(bad).toEqual([]);
	});

	it('同一处的三个主题给出同一组变量（谁都不偷偷多改一项）', () => {
		for (const k of ['screen', 'print', 'pdf']) {
			const keys = (t: string) =>
				themeBlocks
					.filter((b) => kindOf(b.selector) === k && themeOf(b.selector) === t)
					.flatMap((b) => b.decls.map(([n]) => n))
					.sort();
			// 打印 / PDF 块只覆盖少量颜色，允许某个主题不写某一项（沿用屏幕值），但不能多出允许清单以外的东西——上一条已管
			if (k === 'screen') {
				expect(keys('b'), `${k} b`).toEqual(keys('a'));
				expect(keys('c'), `${k} c`).toEqual(keys('a'));
			}
		}
	});

	it('版式变量在 :root 里定义且只有一个值', () => {
		const root = all.filter((b) => b.selector === ':root');
		const names = root.flatMap((b) => b.decls.map(([n]) => n));
		for (const n of ['--h-title-size', '--cp-h2-size', '--cp-h2-align', '--cp-radius', '--cp-btn-h', '--cp-btn-radius', '--cp-input-radius', '--s-page-radius', '--s-frame-bw', '--s-grid-rule-bw'])
			expect(names, n).toContain(n);
	});

	it('主题块以外，没有任何规则按主题区分（组件里也不许写 data-ui-theme=x）', () => {
		const offenders: string[] = [];
		const walk = (dir: string) => {
			for (const f of readdirSync(dir)) {
				const p = join(dir, f);
				if (statSync(p).isDirectory()) walk(p);
				else if (/\.(svelte|css|ts)$/.test(f) && !f.endsWith('.test.ts') && p !== CSS_PATH) {
					if (/data-ui-theme=\\?['"]?[abc]\b/.test(readFileSync(p, 'utf8'))) offenders.push(p.replace(ROOT + '/', ''));
				}
			}
		};
		walk(join(ROOT, 'src'));
		expect(offenders).toEqual([]);
	});
});
