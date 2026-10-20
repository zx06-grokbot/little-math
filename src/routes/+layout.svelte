<script lang="ts">
	// 环境变量：用于判断当前是否为开发环境
	import { browser, dev } from '$app/env';
	// 网站图标
	import favicon from "#lib/assets/favicon.svg";
	// 界面风格 A/B/C：全站 CSS 变量 + 基础样式（打印时黑白）
	import "#lib/styles/ui-themes.css";
	// 全站统一页头（导航 + 风格切换）
	import AppHeader from "#lib/components/AppHeader.svelte";
	// Vercel Analytics（页面浏览量）+ Speed Insights（Core Web Vitals）
	import { page } from '$app/state';
	import { initVercelObservability, trackRoute } from '#lib/services/vercelObservability.js';

	// 子页面插槽
	let { children } = $props();

	if (browser) initVercelObservability({ dev, routeId: page.route.id });
	// 每次换页记一次浏览（首次加载也会触发一次）
	$effect(() => {
		trackRoute(page.route.id, page.url.pathname);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppHeader />

{@render children()}
