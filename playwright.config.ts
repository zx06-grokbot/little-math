import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4791);
/** E2E_UI_THEME=a|b|c：整套 e2e 在指定界面风格下跑（用来验证主题不破坏对齐 / 版式） */
const UI_THEME = process.env.E2E_UI_THEME;

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 120_000,
	fullyParallel: false,
	workers: 1,
	reporter: [['list']],
	use: {
		baseURL: `http://localhost:${PORT}`,
		viewport: { width: 1400, height: 1000 },
		timezoneId: 'Asia/Shanghai',
		locale: 'zh-CN',
		acceptDownloads: true,
		storageState: UI_THEME
			? {
					cookies: [],
					origins: [
						{
							origin: `http://localhost:${PORT}`,
							localStorage: [{ name: 'little-math-ui-theme', value: UI_THEME }]
						}
					]
				}
			: undefined
	},
	webServer: {
		command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: true,
		timeout: 180_000
	}
});
