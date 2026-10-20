import { test, expect } from '@playwright/test';

const REPO = 'https://github.com/zx06/little-math';

test.describe('页脚 GitHub 链接', () => {
	for (const route of ['/', '/practice', '/wrong-book', '/favorites']) {
		test(`${route} 底部有页脚和源码链接（新标签页打开）`, async ({ page }) => {
			await page.goto(route);
			const footer = page.getByTestId('app-footer');
			await expect(footer).toBeVisible();
			await expect(footer).toContainText('小小数学家');
			await expect(footer).toContainText('免费开源');
			const link = page.getByTestId('github-link');
			await expect(link).toHaveAttribute('href', REPO);
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
			await expect(link).toContainText('源码');
			await expect(link.locator('svg')).toHaveCount(1);
			// 页脚在页面内容之后，不是悬浮层
			expect(await footer.evaluate((el) => getComputedStyle(el).position)).toBe('static');
		});
	}

	test('页脚颜色跟随主题，字比正文小', async ({ page }) => {
		const colors = new Set<string>();
		for (const t of ['a', 'b', 'c']) {
			await page.goto(`/?theme=${t}`);
			const s = await page.getByTestId('app-footer').evaluate((el) => {
				const cs = getComputedStyle(el);
				return { color: cs.color, size: parseFloat(cs.fontSize), body: parseFloat(getComputedStyle(document.body).fontSize) };
			});
			expect(s.size).toBeLessThan(s.body);
			colors.add(s.color);
		}
		expect(colors.size).toBe(3);
	});

	test('打印时页脚隐藏', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('[data-testid=sheet-page]');
		await page.emulateMedia({ media: 'print' });
		await expect(page.getByTestId('app-footer')).toBeHidden();
		await page.emulateMedia({ media: 'screen' });
		await expect(page.getByTestId('app-footer')).toBeVisible();
	});

	test('导出 PDF 期间（data-ink=print）页脚也隐藏', async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => document.documentElement.setAttribute('data-ink', 'print'));
		await expect(page.getByTestId('app-footer')).toBeHidden();
	});

	test('手机：滚到底时页脚不被右下角 📊 按钮挡住，链接好点', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		const link = await page.getByTestId('github-link').boundingBox();
		const fab = await page.getByTestId('stats-toggle').boundingBox();
		expect(link && fab).toBeTruthy();
		expect(link!.height).toBeGreaterThanOrEqual(44);
		const overlap = !(link!.x + link!.width <= fab!.x || fab!.x + fab!.width <= link!.x || link!.y + link!.height <= fab!.y || fab!.y + fab!.height <= link!.y);
		expect(overlap).toBe(false);
	});
});
