import { test, expect } from '@playwright/test';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { SHOTS, hasPoppler, openHome, setConfig } from './helpers';

/** 界面风格 A/B/C：切换方式、打印黑白、原版不受影响 */

const BLACK = 'rgb(0, 0, 0)';

async function sheetColors(page: import('@playwright/test').Page) {
	return page.evaluate(() => {
		const pg = document.querySelector<HTMLElement>('[data-testid=sheet-page]')!;
		const cs = (sel: string) => {
			const el = pg.querySelector<HTMLElement>(sel);
			return el ? getComputedStyle(el).color : null;
		};
		const pcs = getComputedStyle(pg);
		const blank = pg.querySelector<HTMLElement>('.tk-blank');
		return {
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
	test(`界面风格 ${theme}：?theme= 生效、打印预览黑字白底`, async ({ page }) => {
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
		expect(print.title).toBe(BLACK);
		expect(print.num).toBe(BLACK);
		expect(print.op).toBe(BLACK);
		expect(print.qno).toBe(BLACK);
		if (print.paren) expect(print.paren).toBe(BLACK);
		expect(['none', '""', 'normal']).toContain(print.titleBefore);
		await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, `ui-theme-${theme}-print.png`) });
		await page.emulateMedia({ media: 'screen' });
	});
}

test('界面风格切换按钮：切到 B 再回原版，原版不设 data-ui-theme', async ({ page }) => {
	await setConfig(page, {});
	await openHome(page);
	await page.getByTestId('ui-theme-b').click();
	await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'b');
	expect(new URL(page.url()).searchParams.get('theme')).toBe('b');
	await page.getByTestId('ui-theme-classic').click();
	await expect(page.locator('html')).not.toHaveAttribute('data-ui-theme', /.*/);
	expect(new URL(page.url()).searchParams.get('theme')).toBeNull();
	// 刷新后仍是原版
	await page.reload();
	await page.waitForSelector('[data-testid=sheet-page]');
	await expect(page.locator('html')).not.toHaveAttribute('data-ui-theme', /.*/);
});

test('界面风格 a：导出 PDF 也是黑字白底（括号 / 标题 emoji 不带颜色）', async ({ page }) => {
	test.skip(!hasPoppler(), '需要 poppler（pdftoppm）');
	await setConfig(page, { columns: 2, countPerPage: 20, totalCount: 20, blankRatio: { first: 0.5, second: 0.5, result: 0.5 } });
	await page.goto('/?theme=a');
	await page.waitForSelector('[data-testid=sheet-page]');
	await page.evaluate(() => document.fonts.ready);
	const downloadPromise = page.waitForEvent('download');
	await page.getByTestId('export-pdf').click();
	const file = path.join(SHOTS, 'ui-theme-a-export.pdf');
	await (await downloadPromise).saveAs(file);
	// 导出结束后预览恢复彩色
	await expect(page.locator('html')).not.toHaveAttribute('data-ink', /.*/);
	const prefix = path.join(SHOTS, 'ui-theme-a-export');
	execFileSync('pdftoppm', ['-r', '40', '-f', '1', '-l', '1', '-singlefile', file, prefix]);
	const buf = readFileSync(`${prefix}.ppm`);
	// P6 头：P6\n<w> <h>\n255\n
	let off = 0;
	for (let n = 0; n < 3; off++) if (buf[off] === 0x0a) n++;
	let colored = 0;
	for (let i = off; i + 2 < buf.length; i += 3) {
		const r = buf[i], g = buf[i + 1], b = buf[i + 2];
		if (Math.max(r, g, b) - Math.min(r, g, b) > 40) colored++;
	}
	expect(colored, 'colored pixels in exported pdf').toBeLessThan(20);
});
