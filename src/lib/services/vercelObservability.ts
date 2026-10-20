/**
 * Vercel Web Analytics + Speed Insights。
 *
 * @vercel/analytics@2 和 @vercel/speed-insights@2 自带的 `/sveltekit` 入口还在用 SvelteKit 3 已经移除的
 * `$app/stores`（一订阅就抛错）和已弃用的 `$app/environment`，所以这里改用它们的通用入口，
 * 按官方 sveltekit 入口同样的参数注入，路由变化由 +layout.svelte 用 `$app/state` 通知。
 * 等官方 sveltekit 入口支持 Kit 3 后可以换回去。
 */
import { inject, pageview } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

function viteEnv(key: 'VITE_VERCEL_OBSERVABILITY_BASEPATH' | 'VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG'): string | undefined {
	try {
		return (import.meta.env as Record<string, string | undefined>)[key];
	} catch {
		return undefined;
	}
}

let speedInsights: ReturnType<typeof injectSpeedInsights> = null;

/** 只在浏览器里调用一次 */
export function initVercelObservability(opts: { dev: boolean; routeId: string | null }) {
	const basePath = viteEnv('VITE_VERCEL_OBSERVABILITY_BASEPATH');
	const conf = viteEnv('VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG');
	inject({ mode: opts.dev ? 'development' : 'production', basePath, disableAutoTrack: true, framework: 'sveltekit' }, conf);
	speedInsights = injectSpeedInsights({ route: opts.routeId, basePath, framework: 'sveltekit' }, conf);
}

/** 每次路由变化调用：记一次页面浏览，并更新 Speed Insights 的路由 */
export function trackRoute(routeId: string | null, path: string) {
	if (!routeId) return;
	pageview({ route: routeId, path });
	speedInsights?.setRoute(routeId);
}
