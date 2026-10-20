import { test, expect } from '@playwright/test';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { SHOTS, hasPoppler, openHome, setConfig } from './helpers';

/** 三个主题（糖果/森林/海洋）：切换方式、旧值回落、打印白底黑题 + 浅色点缀 */

const BLACK = 'rgb(0, 0, 0)';
const luma = (rgb: string) => {
	const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ['255', '255', '255']).map(Number);
	return 0.299 * r + 0.587 * g + 0.114 * b;
};

async function sheetColors(page: import('@playwright/test').Page) {
	return page.evaluate(() => {
		const pg = document.querySelector<HTMLElement>('[data-testid=sheet-page]')!;
		const cs = (sel: string) => {
			const el = pg.querySelector<HTMLElement>(sel);
			return el ? getComputedStyle(el).color : null;
		};
		const pcs = getComputedStyle(pg);
		const blank = pg.querySelector<HTMLElement>('.tk-blank');
		const header = pg.querySelector<HTMLElement>('.page-header')!;
		return {
			headerBg: getComputedStyle(header).backgroundColor,
			frame: getComputedStyle(pg, '::before').borderTopStyle,
			corner: getComputedStyle(pg, '::after').content,
			printAdjust: (pcs as CSSStyleDeclaration & { printColorAdjust?: string }).printColorAdjust ?? pcs.getPropertyValue('-webkit-print-color-adjust'),
			bgImage: pcs.backgroundImage,
			bgColor: pcs.backgroundColor,
			title: cs('h1'),
			titleBefore: getComputedStyle(pg.querySelector('h1')!, '::before').content,
			num: cs('.tk-num'),
			op: cs('.tk-op'),
			qno: cs('.problem-number'),
			paren: blank ? getComputedStyle(blank, '::before').color : null
		};
	});
}

for (const theme of ['a', 'b', 'c'] as const) {
	test(`界面风格 ${theme}：?theme= 生效、打印预览白底题目纯黑 + 浅色主题点缀`, async ({ page }) => {
		await setConfig(page, { columns: 2, countPerPage: 20, totalCount: 20 });
		await page.goto(`/?theme=${theme}`);
		await page.waitForSelector('[data-testid=sheet-page]');
		await expect(page.locator('html')).toHaveAttribute('data-ui-theme', theme);
		await expect(page.getByTestId(`ui-theme-${theme}`)).toHaveAttribute('aria-checked', 'true');
		// 记住选择
		expect(await page.evaluate(() => localStorage.getItem('little-math-ui-theme'))).toBe(theme);

		const screen = await sheetColors(page);
		expect(screen.num).not.toBe(BLACK);

		await page.emulateMedia({ media: 'print' });
		await page.waitForTimeout(150);
		const print = await sheetColors(page);
		expect(print.bgImage).toBe('none');
		expect(print.bgColor).toBe('rgb(255, 255, 255)');
		// 题目本身纯黑
		expect(print.num).toBe(BLACK);
		expect(print.op).toBe(BLACK);
		expect(print.qno).toBe(BLACK);
		if (print.paren) expect(print.paren).toBe(BLACK);
		// 主题点缀保留：标题带主题色、细边框、角落小图标，页眉底色很浅
		expect(print.title).not.toBe(BLACK);
		// 森林不画边框（左右没有竖线），糖果/海洋有浅色细边框
		if (theme === 'b') expect(print.frame).toBe('none');
		else expect(print.frame).not.toBe('none');
		expect(print.corner).not.toBe('none');
		expect(luma(print.headerBg)).toBeGreaterThan(240);
		expect(print.printAdjust).toBe('exact');
		await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, `ui-theme-${theme}-print.png`) });
		await page.emulateMedia({ media: 'screen' });
	});
}

test('森林：卷面左侧没有竖线（网页和打印）', async ({ page }) => {
	await setConfig(page, {});
	await page.goto('/?theme=b');
	await page.waitForSelector('[data-testid=sheet-page]');
	for (const media of ['screen', 'print'] as const) {
		await page.emulateMedia({ media });
		const r = await page.locator('[data-testid=sheet-page]').first().evaluate((pg) => {
			const cs = getComputedStyle(pg);
			const before = getComputedStyle(pg, '::before');
			return { bgImage: cs.backgroundImage, borderLeft: cs.borderLeftStyle, frameLeft: before.borderLeftStyle };
		});
		expect(r.bgImage, media).toBe('none');
		expect(r.borderLeft, media).toBe('none');
		expect(r.frameLeft, media).toBe('none');
	}
});

test('换颜色按钮：切到森林写进 URL；刷新后保持', async ({ page }) => {
	await setConfig(page, {});
	await openHome(page);
	await page.getByTestId('ui-theme-b').click();
	await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'b');
	expect(new URL(page.url()).searchParams.get('theme')).toBe('b');
	await page.goto('/');
	await page.waitForSelector('[data-testid=sheet-page]');
	await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'b');
	// 原版已移除
	await expect(page.getByTestId('ui-theme-classic')).toHaveCount(0);
	await expect(page.getByTestId('theme-selector')).toHaveCount(0);
});

test('主题名：只有糖果/森林/海洋三个，界面上没有英文字母', async ({ page }) => {
	await setConfig(page, {});
	await openHome(page);
	const group = page.getByRole('radiogroup', { name: '换颜色' });
	await expect(group.getByRole('radio')).toHaveCount(3);
	const text = (await group.innerText()).replace(/\s+/g, '');
	expect(text).toContain('糖果');
	expect(text).toContain('森林');
	expect(text).toContain('海洋');
	expect(text).not.toMatch(/[A-Za-z]/);
	expect(text).not.toContain('原版');
});

for (const [q, want] of [
	['classic', 'a'],
	['zzz', 'a'],
	['candy', 'a'],
	['forest', 'b'],
	['ocean', 'c'],
	[encodeURIComponent('海洋'), 'c']
] as const) {
	test(`?theme=${q} → ${want}`, async ({ page }) => {
		await page.goto(`/?theme=${q}`);
		await expect(page.locator('html')).toHaveAttribute('data-ui-theme', want);
		await expect(page.getByTestId(`ui-theme-${want}`)).toHaveAttribute('aria-checked', 'true');
	});
}

test('旧的 localStorage（classic / 乱码）回落到糖果', async ({ page }) => {
	for (const v of ['classic', 'x']) {
		await page.addInitScript((val) => {
			if (!sessionStorage.getItem('seeded')) {
				localStorage.setItem('little-math-ui-theme', val);
				sessionStorage.setItem('seeded', '1');
			}
		}, v);
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'a');
		await page.evaluate(() => sessionStorage.clear());
	}
});

for (const route of ['/', '/practice', '/wrong-book', '/favorites']) {
	test(`每个页面都有主题：${route}`, async ({ page }) => {
		await page.goto(`${route}?theme=c`);
		await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'c');
		await expect(page.getByTestId('app-header')).toBeVisible();
		const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
		expect(font).not.toMatch(/Comic Sans/);
		// 可点的按钮/链接不小于 44px
		const small = await page.evaluate(() =>
			[...document.querySelectorAll<HTMLElement>('button, a, select, input:not([type=checkbox]):not([type=radio]):not([type=range])')]
				.filter((el) => el.offsetParent !== null && !el.closest('.sheet-container'))
				.map((el) => ({ h: el.getBoundingClientRect().height, t: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 20) }))
				.filter((r) => r.h > 0 && r.h < 44)
		);
		expect(small).toEqual([]);
	});
}

for (const theme of ['a', 'b', 'c'] as const) {
	test(`主题 ${theme}：导出 PDF 白底、题目纯黑，带浅色主题点缀`, async ({ page }) => {
		test.skip(!hasPoppler(), '需要 poppler（pdftoppm）');
		await setConfig(page, { columns: 2, countPerPage: 20, totalCount: 20, blankRatio: { first: 0.5, second: 0.5, result: 0.5 } });
		await page.goto(`/?theme=${theme}`);
		await page.waitForSelector('[data-testid=sheet-page]');
		await page.evaluate(() => document.fonts.ready);
		const downloadPromise = page.waitForEvent('download');
		await page.getByTestId('export-pdf').click();
		const file = path.join(SHOTS, `ui-theme-${theme}-export.pdf`);
		await (await downloadPromise).saveAs(file);
		// 导出结束后预览恢复
		await expect(page.locator('html')).not.toHaveAttribute('data-ink', /.*/);
		const prefix = path.join(SHOTS, `ui-theme-${theme}-export`);
		execFileSync('pdftoppm', ['-r', '40', '-f', '1', '-l', '1', '-singlefile', file, prefix]);
		const buf = readFileSync(`${prefix}.ppm`);
		// P6 头：P6\n<w> <h>\n255\n
		let off = 0;
		const head: string[] = [];
		for (let n = 0; n < 3; off++) {
			if (buf[off] === 0x0a) n++;
			head.push(String.fromCharCode(buf[off]));
		}
		const [w, h] = head.join('').split(/\s+/).slice(1, 3).map(Number);
		let tinted = 0, darkColored = 0, sum = 0, px = 0;
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const i = off + (y * w + x) * 3;
				const r = buf[i], g = buf[i + 1], b = buf[i + 2];
				const sat = Math.max(r, g, b) - Math.min(r, g, b);
				sum += 0.299 * r + 0.587 * g + 0.114 * b;
				px++;
				if (sat > 12) tinted++;
				// 题目区（页眉以下、页脚小图标以上）：不应出现深色彩色像素 → 数字和符号是黑的
				if (y > h * 0.16 && y < h * 0.93 && sat > 60 && Math.min(r, g, b) < 110) darkColored++;
			}
		}
		expect(tinted, 'theme tints present in pdf').toBeGreaterThan(50);
		expect(darkColored, 'dark colored pixels in question area').toBeLessThan(15);
		expect(sum / px, 'page stays light').toBeGreaterThan(235);
	});
}
