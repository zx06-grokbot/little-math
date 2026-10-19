import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4791);

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
		acceptDownloads: true
	},
	webServer: {
		command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: true,
		timeout: 180_000
	}
});
