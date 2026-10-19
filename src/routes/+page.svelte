<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import type { AnyProblem, ExerciseConfig, Operation } from '$lib/types';
	import { DEFAULT_CONFIG } from '$lib/config/presets';
	import { effectivePerPage, getLayout } from '$lib/config/layout';
	import { generateWorksheet, autoTitle, settingsSummary } from '$lib/generators/worksheet';
	import { validateConfig } from '$lib/generators/validate';
	import ConfigPanel from '$lib/components/ConfigPanel.svelte';
	import ExerciseSheet from '$lib/components/ExerciseSheet.svelte';
	import StatisticsPanel from '$lib/components/StatisticsPanel.svelte';
	import { zh } from '$lib/i18n/zh';
	import { trackVisit } from '$lib/services/statistics';
	import { loadConfig, saveConfig } from '$lib/services/configStorage';
	import { browser } from '$app/environment';

	const OPS: Operation[] = ['add', 'sub', 'mul', 'div'];

	/** 修正旧版本 / 损坏的本地配置 */
	function normalizeConfig(c: ExerciseConfig): ExerciseConfig {
		const n: ExerciseConfig = { ...DEFAULT_CONFIG, ...c };
		n.range = { ...DEFAULT_CONFIG.range, ...(c.range ?? {}) };
		n.operations = Array.isArray(c.operations) ? OPS.filter((o) => c.operations.includes(o)) : [...DEFAULT_CONFIG.operations];
		if (n.operations.length === 0) n.operations = [...DEFAULT_CONFIG.operations];
		n.blankRatio = { ...DEFAULT_CONFIG.blankRatio, ...(c.blankRatio ?? {}) };
		if (n.columns !== 2 && n.columns !== 3) n.columns = 2;
		n.chainLength = Number(n.chainLength) === 4 ? 4 : 3;
		n.isVertical = n.isVertical === true || (n.isVertical as unknown) === 'true';
		const cap = getLayout(n).maxPerPage;
		if (!Number.isInteger(n.countPerPage) || n.countPerPage < 1) n.countPerPage = getLayout(n).defaultPerPage;
		if (n.countPerPage > cap) n.countPerPage = cap;
		return n;
	}

	let config: ExerciseConfig = $state(browser ? normalizeConfig(loadConfig()) : { ...DEFAULT_CONFIG });
	let problems: AnyProblem[] = $state([]);
	/** 生成当前题目时的配置快照（标题、副标题按它计算，保证与题目一致） */
	let generatedConfig = $state<ExerciseConfig | null>(null);
	let generatedKey = $state('');
	let notice = $state<string | null>(null);
	let theme = $state('default');
	let isExportingPdf = $state(false);
	let layoutNote = $state<string | null>(null);
	let mounted = $state(false);
	let previewEl: HTMLElement | undefined = $state();
	let zoom = $state(1);

	const issues = $derived(validateConfig(config));
	const layout = $derived(getLayout(config));
	const perPage = $derived(effectivePerPage(config));

	/** 影响题目内容的设置；改动后自动重新出题（版式类设置只重新排版，不换题） */
	const contentKey = $derived(
		JSON.stringify([
			config.problemMode,
			config.range?.min,
			config.range?.max,
			[...(config.operations ?? [])].sort(),
			config.blankRatio,
			config.totalCount,
			config.makeTargetValue,
			config.chainLength,
			config.remainderBlank,
			!!config.tableMulDiv
		])
	);
	const stale = $derived(generatedKey !== contentKey);

	const sheetTitle = $derived(
		generatedConfig ? generatedConfig.customTitle?.trim() || autoTitle(generatedConfig) : ''
	);
	const sheetSubtitle = $derived(generatedConfig ? settingsSummary(generatedConfig) : '');

	function handleThemeChange(newTheme: string) {
		theme = newTheme;
	}

	$effect(() => {
		if (browser) saveConfig($state.snapshot(config) as ExerciseConfig);
	});

	function regenerate() {
		const snapshot = $state.snapshot(config) as ExerciseConfig;
		const r = generateWorksheet(snapshot);
		generatedKey = contentKey;
		if (r.issues.length) {
			problems = [];
			generatedConfig = null;
			notice = null;
			return;
		}
		problems = r.problems;
		generatedConfig = snapshot;
		notice = r.notice;
	}

	function handleGenerate() {
		regenerate();
	}

	// 设置改动后自动刷新预览（250ms 防抖）
	$effect(() => {
		const key = contentKey;
		if (!mounted) return;
		if (untrack(() => generatedKey) === key) return;
		const timer = setTimeout(() => untrack(regenerate), 250);
		return () => clearTimeout(timer);
	});

	// 版式变化（横式/竖式、列数、模式）时，若每页题数超过新版式上限则自动调小并提示
	let lastLayoutKey = '';
	$effect(() => {
		const key = `${layout.vertical}-${layout.columns}`;
		const cap = layout.maxPerPage;
		untrack(() => {
			if (lastLayoutKey && key !== lastLayoutKey && Number.isInteger(config.countPerPage) && config.countPerPage > cap) {
				layoutNote = `当前版式一页 A4 最多放 ${cap} 道，每页题数已从 ${config.countPerPage} 调整为 ${cap}`;
				config.countPerPage = cap;
			} else if (key !== lastLayoutKey) {
				layoutNote = null;
			}
			lastLayoutKey = key;
		});
	});

	/** 确保打印 / 导出的是与当前设置一致的题目 */
	async function ensureFresh(): Promise<boolean> {
		if (issues.length) return false;
		if (stale || problems.length === 0) regenerate();
		await tick();
		return problems.length > 0;
	}

	async function handlePrint() {
		if (!(await ensureFresh())) return;
		setTimeout(() => window.print(), 50);
	}

	async function handleExportPdf() {
		if (!browser || !(await ensureFresh())) return;
		const element = document.getElementById('exercise-sheet');
		if (!element) return;
		isExportingPdf = true;
		const prevZoom = zoom;
		zoom = 1;
		try {
			await tick();
			const { exportPagesToPdf } = await import('$lib/services/pdfExport');
			await exportPagesToPdf(element);
		} catch (error) {
			console.error('PDF导出失败:', error);
			alert('PDF导出失败，请重试');
		} finally {
			zoom = prevZoom;
			isExportingPdf = false;
		}
	}

	onMount(() => {
		trackVisit();
		regenerate();
		mounted = true;
		// 窄屏时按比例缩小 A4 预览（打印 / 导出不受影响）
		const ro = new ResizeObserver(() => {
			if (!previewEl || isExportingPdf) return;
			const w = previewEl.clientWidth - 16;
			const pageW = (210 / 25.4) * 96;
			zoom = w > 0 && w < pageW ? Math.max(0.3, w / pageW) : 1;
		});
		if (previewEl) ro.observe(previewEl);
		return () => ro.disconnect();
	});
</script>

<svelte:head>
	<title>{zh.appName}</title>
	<meta name="description" content={zh.appSubtitle} />
</svelte:head>

<div class="app">
	<header class="app-header no-print">
		<h1>{zh.appName}</h1>
		<p>{zh.appSubtitle}</p>
		<div class="header-links">
			<a href="/practice" class="practice-link">🎯 在线练习</a>
			<a href="/wrong-book" class="wrong-book-link">📕 错题本</a>
			<a href="/favorites" class="favorites-link">⭐ 收藏题库</a>
		</div>
	</header>

	<main class="app-main">
		<aside class="sidebar no-print">
			<ConfigPanel
				bind:config
				{issues}
				autoTitle={autoTitle(config)}
				{layoutNote}
				onGenerate={handleGenerate}
				onPrint={handlePrint}
				onExportPdf={handleExportPdf}
				{isExportingPdf}
				{theme}
				onThemeChange={handleThemeChange}
			/>
		</aside>

		<section class="preview" bind:this={previewEl}>
			{#if issues.length > 0}
				<div class="empty-state error-state no-print" data-testid="config-error">
					<p>⚠️ 设置有误，暂时无法出题：</p>
					<ul>
						{#each issues as issue}<li>{issue.message}</li>{/each}
					</ul>
				</div>
			{:else if problems.length > 0 && generatedConfig}
				{#if stale}
					<div class="banner no-print" data-testid="stale-banner">设置已修改，正在更新题目…</div>
				{/if}
				{#if notice}
					<div class="banner warn no-print" data-testid="fill-notice">ℹ️ {notice}</div>
				{/if}
				<div id="exercise-sheet" style="--sheet-zoom: {zoom}">
					<ExerciseSheet
						{problems}
						{perPage}
						showAnswers={false}
						vertical={layout.vertical}
						columns={layout.columns}
						title={sheetTitle}
						subtitle={sheetSubtitle}
						studentName={config.studentName}
						showDate={config.showDate}
						{theme}
					/>
					{#if config.showAnswerPage}
						<ExerciseSheet
							{problems}
							{perPage}
							showAnswers={true}
							vertical={layout.vertical}
							columns={layout.columns}
							title={sheetTitle}
							subtitle={sheetSubtitle}
							studentName={config.studentName}
							showDate={config.showDate}
							{theme}
						/>
					{/if}
				</div>
			{:else}
				<div class="empty-state">
					<p>正在生成练习题…</p>
				</div>
			{/if}
		</section>
	</main>

	<div class="no-print"><StatisticsPanel /></div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		background: #eee;
	}

	.app {
		min-height: 100vh;
	}

	.app-header {
		background: linear-gradient(135deg, #ff6b6b 0%, #ffa502 50%, #ffdd59 100%);
		color: white;
		padding: 1.25rem 2rem;
		text-align: center;
		font-family: 'Comic Sans MS', cursive, sans-serif;
	}

	.app-header h1 {
		margin: 0;
		font-size: 2rem;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
	}

	.app-header h1::before {
		content: '🧮 ';
	}

	.app-header h1::after {
		content: ' ✨';
	}

	.app-header p {
		margin: 0.5rem 0 0;
		opacity: 0.95;
		font-size: 1rem;
	}

	.header-links {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.practice-link,
	.wrong-book-link,
	.favorites-link {
		display: inline-block;
		padding: 0.5rem 1.25rem;
		background: rgba(255, 255, 255, 0.25);
		color: white;
		text-decoration: none;
		border-radius: 20px;
		font-size: 1rem;
		transition: background 0.2s;
	}

	.practice-link:hover,
	.wrong-book-link:hover,
	.favorites-link:hover {
		background: rgba(255, 255, 255, 0.4);
	}

	.app-main {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 1.5rem;
		padding: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.sidebar {
		position: sticky;
		top: 1.5rem;
		height: fit-content;
	}

	.preview {
		background: #f3f0ea;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: auto;
		padding: 16px 8px 0;
		min-width: 0;
	}

	.banner {
		max-width: 210mm;
		margin: 0 auto 10px;
		padding: 8px 12px;
		border-radius: 8px;
		background: #e7f5ff;
		color: #1c7ed6;
		font-size: 0.9rem;
	}
	.banner.warn {
		background: #fff4e6;
		color: #d9480f;
	}
	.empty-state.error-state {
		flex-direction: column;
		color: #c92a2a;
		padding: 1rem 2rem;
	}
	.error-state ul {
		margin: 0.5rem 0 0;
	}

	#exercise-sheet {
		overflow: visible;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		color: #999;
	}

	@media print {
		:global(*) {
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		:global(body) {
			margin: 0 !important;
			padding: 0 !important;
		}

		.app {
			min-height: auto !important;
		}

		.app-header,
		.no-print {
			display: none !important;
		}

		.app-main {
			display: block !important;
			padding: 0 !important;
			margin: 0 !important;
			max-width: none !important;
		}

		.preview {
			box-shadow: none !important;
			border-radius: 0 !important;
			overflow: visible !important;
			padding: 0 !important;
			background: none !important;
		}

		:global(html),
		:global(body) {
			background: white !important;
		}
	}

	@media (max-width: 768px) {
		.app-header {
			padding: 1rem 1.5rem;
		}

		.app-header h1 {
			font-size: 1.5rem;
		}

		.app-header p {
			font-size: 0.9rem;
		}

		.header-links {
			gap: 0.75rem;
			margin-top: 0.625rem;
		}

		.practice-link,
		.wrong-book-link {
			padding: 0.4rem 1rem;
			font-size: 0.9rem;
		}

		.app-main {
			grid-template-columns: 1fr;
			padding: 1rem;
			gap: 1rem;
		}

		.sidebar {
			position: static;
		}

		.empty-state {
			min-height: 300px;
		}
	}

	@media (max-width: 480px) {
		.app-header {
			padding: 0.875rem 1rem;
		}

		.app-header h1 {
			font-size: 1.25rem;
		}

		.app-header p {
			font-size: 0.85rem;
		}

		.header-links {
			gap: 0.5rem;
			margin-top: 0.5rem;
			flex-wrap: wrap;
		}

		.practice-link,
		.wrong-book-link {
			padding: 0.375rem 0.875rem;
			font-size: 0.85rem;
		}

		.app-main {
			padding: 0.75rem;
			gap: 0.75rem;
		}

		.empty-state {
			min-height: 250px;
		}
	}
</style>
