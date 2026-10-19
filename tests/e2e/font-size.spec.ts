import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SHOTS, openHome, setConfig } from './helpers';

async function lineFontReport(page: import('@playwright/test').Page) {
	return page.evaluate(() => {
		const pages = [...document.querySelectorAll<HTMLElement>('[data-testid=sheet-page]')];
		return pages.map((pg) => {
			const lines = [...pg.querySelectorAll<HTMLElement>('.line')];
			const fontSizes = lines.map((el) => getComputedStyle(el).fontSize);
			const inlines = lines.map((el) => el.style.fontSize || '');
			const gridVar = pg.querySelector<HTMLElement>('.grid')?.style.getPropertyValue('--fit-line-size').trim() ?? '';
			const overflow = lines.filter((el) => {
				const parent = el.parentElement;
				if (!parent) return false;
				return el.scrollWidth > parent.clientWidth + 1;
			}).length;
			return {
				count: lines.length,
				unique: [...new Set(fontSizes)],
				uniqueInline: [...new Set(inlines.filter(Boolean))],
				allInlineEmpty: inlines.every((s) => !s),
				gridVar,
				overflow
			};
		});
	});
}

test('2列↔3列切换后同页题目字号统一且无残留', async ({ page }) => {
	await setConfig(page, {
		isVertical: false,
		columns: 3,
		countPerPage: 30,
		totalCount: 30,
		problemMode: 'chain',
		chainLength: 4,
		range: { min: 1, max: 100 },
		operations: ['add', 'sub', 'mul', 'div']
	});
	await openHome(page);
	await page.waitForTimeout(400);

	const assertUniform = async (label: string) => {
		const reports = await lineFontReport(page);
		expect(reports.length, label).toBeGreaterThan(0);
		for (const r of reports) {
			expect(r.count, label).toBeGreaterThan(0);
			expect(r.unique, `${label} unique sizes`).toHaveLength(1);
			// 不再使用 per-item inline；统一走 grid CSS 变量或纯 CSS
			expect(r.allInlineEmpty, `${label} no per-line inline`).toBe(true);
			expect(r.overflow, `${label} overflow`).toBe(0);
		}
		return reports;
	};

	await assertUniform('initial 3col');
	await page.screenshot({ path: path.join(SHOTS, 'font-uniform-3col.png') });

	await page.getByTestId('columns').selectOption('2');
	await page.waitForTimeout(400);
	const after2 = await assertUniform('after →2col');
	await page.screenshot({ path: path.join(SHOTS, 'font-uniform-2col.png') });

	await page.getByTestId('columns').selectOption('3');
	await page.waitForTimeout(400);
	const after3 = await assertUniform('after →3col again');
	await page.screenshot({ path: path.join(SHOTS, 'font-uniform-3col-again.png') });

	// 快速来回切换也不应残留多种字号
	for (const c of ['2', '3', '2', '3']) {
		await page.getByTestId('columns').selectOption(c);
		await page.waitForTimeout(80);
	}
	await page.waitForTimeout(400);
	await assertUniform('after rapid toggles');
	await page.screenshot({ path: path.join(SHOTS, 'font-uniform-rapid.png') });

	expect(after2[0].unique[0]).not.toBe(after3[0].unique[0]);
});
