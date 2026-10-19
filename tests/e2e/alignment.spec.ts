import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SHOTS, openHome, setConfig } from './helpers';

/** 每一页、每一列内所有「=」的 left 应一致（允许亚像素误差） */
async function expectEqualsAligned(
	page: import('@playwright/test').Page,
	root = '[data-testid=sheet-page], [data-testid=answer-page]'
) {
	const pages = await page.evaluate((sel) => {
		return [...document.querySelectorAll(sel)].map((pg) => {
			const byCol = new Map<number, number[]>();
			for (const c of pg.querySelectorAll<HTMLElement>('.h-cell')) {
				const col = Math.round(c.getBoundingClientRect().left);
				const eq = [...c.querySelectorAll('.tk-op')].find((t) => t.textContent === '=');
				if (!eq) continue;
				const arr = byCol.get(col) ?? [];
				arr.push(eq.getBoundingClientRect().left);
				byCol.set(col, arr);
			}
			return [...byCol.values()].map((lefts) => ({
				min: Math.min(...lefts),
				max: Math.max(...lefts),
				n: lefts.length
			}));
		});
	}, root);
	expect(pages.length).toBeGreaterThan(0);
	for (const cols of pages) {
		expect(cols.length).toBeGreaterThan(0);
		for (const { min, max, n } of cols) {
			expect(n).toBeGreaterThan(0);
			expect(max - min, `= drift ${min}..${max}`).toBeLessThanOrEqual(0.75);
		}
	}
}

async function expectVerticalOnesAligned(page: import('@playwright/test').Page) {
	const bad = await page.evaluate(() => {
		const out: string[] = [];
		for (const cell of document.querySelectorAll('.v-cell')) {
			const nums = [...cell.querySelectorAll<HTMLElement>('.v-num')];
			if (nums.length < 2) continue;
			const rights = nums.map((n) => n.getBoundingClientRect().right);
			const widths = nums.map((n) => n.getBoundingClientRect().width);
			if (Math.max(...rights) - Math.min(...rights) > 0.75) out.push(cell.textContent?.trim() ?? '');
			if (Math.max(...widths) - Math.min(...widths) > 0.75) out.push('w:' + (cell.textContent?.trim() ?? ''));
		}
		return out;
	});
	expect(bad, `vertical misaligned: ${bad.join(' | ')}`).toEqual([]);
}

test('横式 2/3 列：同列等号对齐；答案页与打印预览亦对齐', async ({ page }) => {
	await setConfig(page, {
		columns: 2,
		countPerPage: 20,
		totalCount: 20,
		range: { min: 1, max: 100 },
		operations: ['add', 'sub', 'mul', 'div'],
		problemMode: 'normal',
		showAnswerPage: true
	});
	await openHome(page);
	await page.waitForTimeout(400);
	await expectEqualsAligned(page);
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-2col.png') });

	await page.getByTestId('columns').selectOption('3');
	await page.waitForTimeout(400);
	await expectEqualsAligned(page);
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-3col.png') });

	await expect(page.locator('[data-testid=answer-page]').first()).toBeVisible();
	await expectEqualsAligned(page, '[data-testid=answer-page]');
	await page.locator('[data-testid=answer-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-answers.png') });

	await page.emulateMedia({ media: 'print' });
	await page.waitForTimeout(200);
	await expectEqualsAligned(page, '[data-testid=sheet-page]');
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-print-2col.png') });
	await page.emulateMedia({ media: 'screen' });
});

test('竖式个位右齐；打印预览亦右齐', async ({ page }) => {
	await setConfig(page, {
		isVertical: true,
		columns: 2,
		countPerPage: 12,
		totalCount: 12,
		range: { min: 1, max: 100 },
		operations: ['add', 'sub', 'mul', 'div'],
		problemMode: 'normal'
	});
	await openHome(page);
	await page.waitForTimeout(400);
	await expectVerticalOnesAligned(page);
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-vertical.png') });

	await page.emulateMedia({ media: 'print' });
	await page.waitForTimeout(200);
	await expectVerticalOnesAligned(page);
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-print-vertical.png') });
	await page.emulateMedia({ media: 'screen' });
});

test('连续运算 / 有余数 / 比较大小：等号或○同列对齐', async ({ page }) => {
	await setConfig(page, {
		isVertical: false,
		columns: 2,
		countPerPage: 20,
		totalCount: 20,
		range: { min: 1, max: 100 },
		operations: ['add', 'sub', 'mul', 'div'],
		problemMode: 'chain',
		chainLength: 4
	});
	await openHome(page);
	await page.waitForTimeout(400);
	await expectEqualsAligned(page, '[data-testid=sheet-page]');
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-chain.png') });

	await page.getByTestId('mode').selectOption('remainder');
	await page.waitForTimeout(450);
	await expectEqualsAligned(page, '[data-testid=sheet-page]');
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-remainder.png') });

	await page.getByTestId('mode').selectOption('compare');
	await page.waitForTimeout(450);
	const ok = await page.evaluate(() => {
		const pg = document.querySelector('[data-testid=sheet-page]');
		if (!pg) return false;
		const byCol = new Map<number, number[]>();
		for (const c of pg.querySelectorAll<HTMLElement>('.h-cell')) {
			const col = Math.round(c.getBoundingClientRect().left);
			const mid = c.querySelector('.tk-cmp, .tk-ans');
			if (!mid) continue;
			const arr = byCol.get(col) ?? [];
			arr.push(mid.getBoundingClientRect().left);
			byCol.set(col, arr);
		}
		return [...byCol.values()].every((xs) => xs.length > 0 && Math.max(...xs) - Math.min(...xs) <= 0.75);
	});
	expect(ok).toBe(true);
	await page.locator('[data-testid=sheet-page]').first().screenshot({ path: path.join(SHOTS, 'align-e2e-compare.png') });
});

test('对齐后整页字号仍统一（不破坏 --fit-line-size）', async ({ page }) => {
	await setConfig(page, {
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
	const fonts = await page.evaluate(() => {
		const lines = [...document.querySelectorAll<HTMLElement>('[data-testid=sheet-page] .line')];
		return [...new Set(lines.map((l) => getComputedStyle(l).fontSize))];
	});
	expect(fonts).toHaveLength(1);
});
