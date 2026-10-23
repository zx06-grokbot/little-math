import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SHOTS, openHome, setConfig, enterPracticeAnswer } from './helpers';

test('改设置后自动刷新预览，打印的是新题', async ({ page }) => {
	await setConfig(page, { operations: ['mul'], range: { min: 1, max: 100 } });
	await openHome(page);
	await expect(page.locator('[data-testid=problem]').first()).toContainText('×');
	await page.getByTestId('op-div').check();
	await page.getByTestId('op-mul').uncheck();
	await expect(page.getByTestId('stale-banner')).toHaveCount(0, { timeout: 2000 });
	const texts = await page.locator('[data-testid=sheet-page] [data-testid=problem]').allInnerTexts();
	expect(texts.length).toBe(20);
	for (const t of texts) expect(t).toContain('÷');
	await expect(page.locator('.page-header h1').first()).toContainText('除法');
});

test('输入校验：最小值大于最大值、清空最大值、取消全部运算', async ({ page }) => {
	await setConfig(page, {});
	await openHome(page);
	await page.getByTestId('range-min').fill('50');
	await page.getByTestId('range-max').fill('10');
	await expect(page.getByText('最小的数（50）要比最大的数（10）小哦').first()).toBeVisible();
	await expect(page.getByTestId('print')).toBeDisabled();
	await expect(page.getByTestId('export-pdf')).toBeDisabled();
	await expect(page.locator('[data-testid=sheet-page]')).toHaveCount(0);
	await page.getByTestId('range-min').fill('1');
	await page.getByTestId('range-max').fill('');
	await expect(page.getByText('请写上最大的数').first()).toBeVisible();
	await page.getByTestId('range-max').fill('20');
	await page.getByTestId('op-add').uncheck();
	await page.getByTestId('op-sub').uncheck();
	await expect(page.getByTestId('op-sub')).not.toBeChecked();
	await expect(page.getByText('至少选一种题哦').first()).toBeVisible();
	await expect(page.getByTestId('print')).toBeDisabled();
	await page.screenshot({ path: path.join(SHOTS, 'validation-errors.png') });
	await page.getByTestId('op-add').check();
	await expect(page.locator('[data-testid=sheet-page]')).toHaveCount(1);
});

test('竖式下切到连续运算 / 比较大小 / 有余数，预览不空白', async ({ page }) => {
	await setConfig(page, { isVertical: true, countPerPage: 12, totalCount: 12 });
	await openHome(page);
	for (const mode of ['chain', 'compare', 'remainder', 'makeTarget', 'normal']) {
		await page.getByTestId('mode').selectOption(mode);
		await page.waitForTimeout(400);
		await expect(page.locator('[data-testid=sheet-page] [data-testid=problem]')).toHaveCount(12);
	}
	await page.getByTestId('mode').selectOption('chain');
	await page.waitForTimeout(400);
	await page.screenshot({ path: path.join(SHOTS, 'vertical-then-chain.png') });
});

test('横式/竖式切换不改总题数；每页超过上限时自动调小并提示', async ({ page }) => {
	await setConfig(page, { columns: 3, countPerPage: 40, totalCount: 40 });
	await openHome(page);
	await page.getByTestId('vertical').selectOption('true');
	await expect(page.getByTestId('per-page')).toHaveValue('20');
	await expect(page.getByTestId('layout-note')).toBeVisible();
	await expect(page.getByTestId('total-count')).toHaveValue('40');
	await page.getByTestId('vertical').selectOption('false');
	await expect(page.getByTestId('per-page')).toHaveValue('20');
	await expect(page.getByTestId('total-count')).toHaveValue('40');
});

test('题目不够时补足并提示', async ({ page }) => {
	await setConfig(page, { range: { min: 1, max: 3 }, operations: ['add'], totalCount: 30, columns: 3, countPerPage: 30 });
	await openHome(page);
	await expect(page.getByTestId('fill-notice')).toContainText('只有 3 道不一样的题');
	await expect(page.locator('[data-testid=sheet-page] [data-testid=problem]')).toHaveCount(30);
});

test('在线练习：即时反馈，比较大小错题进错题本，不会出现 0 道题', async ({ page }) => {
	await page.goto('/practice');
	await page.getByTestId('practice-mode').selectOption('compare');
	await page.getByTestId('practice-start').click();
	await expect(page.getByTestId('practice-progress')).toContainText('第 1 /');
	const text = (await page.locator('.problem-display').innerText()).trim();
	const [l, r] = text.split('○').map((x) => {
		const [a, op, b] = x.trim().split(/\s+/);
		const A = Number(a), B = Number(b);
		return op === '+' ? A + B : op === '-' ? A - B : op === '×' ? A * B : A / B;
	});
	const answer = l > r ? '>' : l < r ? '<' : '=';
	const wrong = ['<', '>', '='].find((s) => s !== answer)!;
	await page.getByRole('button', { name: wrong, exact: true }).click();
	await expect(page.getByTestId('feedback')).toContainText('正确答案');
	await page.screenshot({ path: path.join(SHOTS, 'practice-feedback.png') });
	const wrongBook = await page.evaluate(() => JSON.parse(localStorage.getItem('little-math-wrong-book') || '[]'));
	expect(wrongBook.length).toBe(1);
	expect(wrongBook[0].problem.type).toBe('compare');
	const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('little-math-stats') || '{}'));
	expect(stats.totalAnswered).toBe(1);
});

test('练习结果页收藏后星标立即点亮；纯除法 4 个数也能开始练习', async ({ page }) => {
	await page.goto('/practice');
	await page.getByTestId('practice-mode').selectOption('chain');
	await page.getByLabel('几个数').selectOption('4');
	for (const op of ['加法', '减法']) await page.getByLabel(op, { exact: true }).uncheck();
	await page.getByLabel('除法', { exact: true }).check();
	await page.getByLabel('做几道').fill('1');
	await page.getByTestId('practice-start').click();
	await expect(page.getByTestId('practice-progress')).toHaveText('第 1 / 1 题');
	await enterPracticeAnswer(page, '99999');
	await expect(page.getByTestId('feedback')).toContainText('正确答案');
	await page.getByRole('button', { name: /看看成绩/ }).click();
	const star = page.getByTestId('favorite-btn').first();
	await expect(star).toHaveText('☆');
	await star.click();
	await expect(star).toHaveText('⭐');
	const favs = await page.evaluate(() => JSON.parse(localStorage.getItem('little-math-favorites') || '[]'));
	expect(favs.length).toBe(1);
	const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('little-math-stats') || '{}'));
	const days = Object.values(stats.dailyStats) as { practiceProgress?: unknown[] }[];
	expect(days.some((d) => (d.practiceProgress ?? []).length === 1)).toBe(true);
});
