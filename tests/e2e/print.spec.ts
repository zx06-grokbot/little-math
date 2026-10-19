import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SHOTS, expectNoOverflow, hasPoppler, openHome, pdfInfo, renderPdf, setConfig } from './helpers';

type Case = { name: string; cfg: Record<string, unknown>; sheets: number };

const CASES: Case[] = [
	{ name: '2col-20pp-40-answers', cfg: { columns: 2, countPerPage: 20, totalCount: 40, showAnswerPage: true }, sheets: 2 },
	{ name: '2col-24pp-max', cfg: { columns: 2, countPerPage: 24, totalCount: 24, range: { min: 1, max: 100 } }, sheets: 1 },
	{ name: '3col-30pp-60-answers', cfg: { columns: 3, countPerPage: 30, totalCount: 60, showAnswerPage: true }, sheets: 2 },
	{ name: '3col-51pp-max', cfg: { columns: 3, countPerPage: 51, totalCount: 51, range: { min: 1, max: 1000 }, operations: ['add', 'sub', 'mul', 'div'] }, sheets: 1 },
	{ name: 'vertical-20pp-answers', cfg: { isVertical: true, countPerPage: 20, totalCount: 40, showAnswerPage: true, range: { min: 1, max: 100 }, operations: ['add', 'sub', 'mul', 'div'] }, sheets: 2 },
	{ name: 'vertical-12pp', cfg: { isVertical: true, countPerPage: 12, totalCount: 12 }, sheets: 1 },
	{ name: 'chain4-3col-answers', cfg: { problemMode: 'chain', chainLength: 4, columns: 3, countPerPage: 30, totalCount: 30, range: { min: 1, max: 100 }, operations: ['add', 'sub', 'mul', 'div'], showAnswerPage: true }, sheets: 1 },
	{ name: 'remainder-3col', cfg: { problemMode: 'remainder', remainderBlank: 'both', columns: 3, countPerPage: 30, totalCount: 30, range: { min: 10, max: 100 }, showAnswerPage: true }, sheets: 1 },
	{ name: 'compare-2col', cfg: { problemMode: 'compare', columns: 2, countPerPage: 20, totalCount: 20, range: { min: 1, max: 100 } }, sheets: 1 },
	{ name: 'vertical-on-chain-ignored', cfg: { problemMode: 'chain', isVertical: true, columns: 2, countPerPage: 20, totalCount: 20 }, sheets: 1 }
];

for (const c of CASES) {
	test(`浏览器打印：${c.name}`, async ({ page }) => {
		await setConfig(page, c.cfg);
		await openHome(page);
		const answers = c.cfg.showAnswerPage ? 2 : 1;
		const expectedPages = c.sheets * answers;
		const dom = await expectNoOverflow(page);
		expect(dom.pages).toBe(expectedPages);
		expect(dom.cells).toBe(Number(c.cfg.totalCount) * answers);
		await page.screenshot({ path: path.join(SHOTS, `print-${c.name}-screen.png`), fullPage: true });

		await page.emulateMedia({ media: 'print' });
		const file = path.join(SHOTS, `print-${c.name}.pdf`);
		await page.pdf({ path: file, format: 'A4', printBackground: true, preferCSSPageSize: true });
		if (hasPoppler()) {
			const info = pdfInfo(file);
			expect(info.pages, 'browser print page count').toBe(expectedPages);
			expect(info.size).toContain('(A4)');
			renderPdf(file, path.join(SHOTS, `print-${c.name}`));
		}
	});
}

for (const c of [CASES[0], CASES[2], CASES[4], CASES[6]]) {
	test(`导出PDF按钮：${c.name}`, async ({ page }) => {
		await setConfig(page, c.cfg);
		// 北京时间 2026-10-20 07:30 = UTC 2026-10-19 23:30，文件名必须是 10-20
		await page.clock.setFixedTime(new Date('2026-10-19T23:30:00Z'));
		await openHome(page);
		const answers = c.cfg.showAnswerPage ? 2 : 1;
		const downloadPromise = page.waitForEvent('download');
		await page.getByTestId('export-pdf').click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe('数学练习_2026-10-20.pdf');
		const file = path.join(SHOTS, `export-${c.name}.pdf`);
		await download.saveAs(file);
		if (hasPoppler()) {
			const info = pdfInfo(file);
			expect(info.pages, 'exported pdf page count').toBe(c.sheets * answers);
			expect(info.size).toContain('(A4)');
			renderPdf(file, path.join(SHOTS, `export-${c.name}`));
		}
	});
}
