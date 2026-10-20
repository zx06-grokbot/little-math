<script lang="ts">
	import { onMount } from 'svelte';
	import type { StatisticsData } from '$lib/types';
	import { getStats, getLast7DaysStats, resetStats, getDailyProgress } from '$lib/services/statistics';
	import { OP_NAMES } from '$lib/types';
	import ProgressChart from '$lib/components/ProgressChart.svelte';
	import { downloadStatisticsJSON, downloadStatisticsCSV } from '$lib/services/export';

	let stats: StatisticsData = $state<StatisticsData>(getStats());
	let last7Days = $state(getLast7DaysStats());
	let dailyProgress = $state(getDailyProgress());
	let showPanel = $state(false);

	onMount(() => {
		const interval = setInterval(() => {
			stats = getStats();
			last7Days = getLast7DaysStats();
			dailyProgress = getDailyProgress();
		}, 1000);

		return () => clearInterval(interval);
	});

	function handleReset() {
		if (confirm('真的要把记录都清零吗？')) {
			resetStats();
			stats = getStats();
			last7Days = getLast7DaysStats();
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
		return `${month}/${day} 周${weekdays[date.getDay()]}`;
	}

	function getPercent(value: number, total: number): string {
		if (total === 0) return '0%';
		return ((value / total) * 100).toFixed(1) + '%';
	}
</script>

<div class="stats-container">
	<button
		class="stats-toggle"
		onclick={() => (showPanel = !showPanel)}
		title="看看记录"
		aria-label="看看记录"
		aria-expanded={showPanel}
		data-testid="stats-toggle"
	>
		<span aria-hidden="true">📊</span>
	</button>

	{#if showPanel}
		<div class="stats-panel" data-testid="stats-panel" role="dialog" aria-label="我的记录">
			<div class="stats-header">
				<h3>📊 我的记录</h3>
				<button class="close-btn" onclick={() => (showPanel = false)} aria-label="关上">✕</button>
			</div>

			<div class="stats-content">
				<div class="stats-section">
					<div class="stats-grid">
						<div class="stat-card" data-testid="stat-visits">
							<div class="stat-value">{stats.totalVisits}</div>
							<div class="stat-label">👋 来玩过</div>
						</div>
						<div class="stat-card" data-testid="stat-generations">
							<div class="stat-value">{stats.totalGenerations}</div>
							<div class="stat-label">📝 出过题</div>
						</div>
						<div class="stat-card" data-testid="stat-prints">
							<div class="stat-value">{stats.totalPrints}</div>
							<div class="stat-label">🖨️ 打印过</div>
						</div>
					</div>
				</div>

				{#if stats.totalGenerations > 0}
					<div class="stats-section">
						<h4>常做的题</h4>
						<div class="operation-stats">
							{#each Object.entries(stats.operationsCount) as [op, count]}
								{#if count > 0}
									<div class="operation-item">
										<div class="operation-name">{OP_NAMES[op as keyof typeof OP_NAMES]}</div>
										<div class="operation-bar">
											<div class="operation-fill" style="width: {getPercent(count, stats.totalGenerations)}"></div>
										</div>
										<div class="operation-count">{count} 次</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<div class="stats-section">
					<h4>这几天</h4>
					<div class="daily-stats">
						{#each last7Days as day}
							<div class="day-item">
								<div class="day-date">{formatDate(day.date)}</div>
								<div class="day-metrics">
									<span class="metric" title="来玩">👋 {day.visits}</span>
									<span class="metric" title="出题">📝 {day.generations}</span>
									<span class="metric" title="打印">🖨️ {day.prints}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="stats-section">
					<ProgressChart data={dailyProgress} />
				</div>
			</div>

			<div class="stats-footer">
				<div class="last-visit">上次来玩：{stats.lastVisitDate || '还没有'}</div>
				<div class="footer-buttons">
					<button class="ui-btn ui-btn-secondary" onclick={downloadStatisticsJSON} data-testid="stats-export-json">💾 存 JSON</button>
					<button class="ui-btn ui-btn-secondary" onclick={downloadStatisticsCSV} data-testid="stats-export-csv">💾 存表格</button>
					<button class="ui-btn ui-btn-quiet" onclick={handleReset} data-testid="stats-reset">🧹 清零</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.stats-container {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 1000;
	}
	.stats-toggle {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: var(--fab-bg);
		border: var(--fab-border);
		font-size: 28px;
		cursor: pointer;
		box-shadow: var(--fab-shadow);
		transition: transform 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.stats-toggle:hover {
		transform: scale(1.06);
	}
	.stats-toggle:focus-visible,
	.close-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--c-focus);
	}
	.stats-panel {
		position: absolute;
		bottom: 72px;
		right: 0;
		width: min(420px, calc(100vw - 40px));
		max-height: min(80vh, calc(100vh - 120px));
		background: var(--c-surface);
		color: var(--c-text);
		border: var(--c-card-border);
		border-radius: var(--c-radius-lg);
		box-shadow: var(--c-shadow-lg);
		overflow: hidden;
		animation: slideUp 0.25s ease;
		display: flex;
		flex-direction: column;
	}
	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.stats-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0.75rem 0.75rem 1.25rem;
		background: var(--c-primary-soft);
		color: var(--c-on-primary-soft);
	}
	.stats-header h3 {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 800;
	}
	.close-btn {
		width: 48px;
		height: 48px;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		font-size: 1.4rem;
		cursor: pointer;
	}
	.close-btn:hover {
		background: var(--c-surface);
	}
	.stats-content {
		padding: 1rem 1.25rem;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}
	.stats-section {
		margin-bottom: 1.25rem;
	}
	.stats-section h4 {
		margin: 0 0 0.6rem;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--c-text);
	}
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
	}
	.stat-card {
		background: var(--c-surface-2);
		border-radius: var(--c-radius);
		padding: 0.8rem 0.3rem;
		text-align: center;
	}
	.stat-value {
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--c-title);
		line-height: 1.15;
	}
	.stat-label {
		margin-top: 0.2rem;
		font-size: 0.95rem;
		color: var(--c-muted);
		white-space: nowrap;
	}
	.operation-stats {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.operation-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1rem;
	}
	.operation-name {
		width: 3em;
		color: var(--c-text);
	}
	.operation-bar {
		flex: 1;
		height: 12px;
		background: var(--c-surface-2);
		border-radius: 999px;
		overflow: hidden;
	}
	.operation-fill {
		height: 100%;
		background: var(--c-chart-1);
		border-radius: 999px;
		transition: width 0.3s ease;
	}
	.operation-count {
		min-width: 3.5em;
		text-align: right;
		color: var(--c-muted);
	}
	.daily-stats {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.day-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.45rem 0.75rem;
		background: var(--c-surface-2);
		border-radius: var(--ui-radius-sm);
		font-size: 1rem;
	}
	.day-date {
		color: var(--c-text);
		font-weight: 600;
		white-space: nowrap;
	}
	.day-metrics {
		display: flex;
		gap: 0.9rem;
		color: var(--c-muted);
		white-space: nowrap;
	}
	.stats-footer {
		padding: 0.9rem 1.25rem 1.1rem;
		border-top: 2px dashed var(--c-border);
		background: var(--c-surface);
	}
	.last-visit {
		font-size: 0.95rem;
		color: var(--c-muted);
		margin-bottom: 0.6rem;
	}
	.footer-buttons {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}
	.footer-buttons .ui-btn {
		min-height: 48px;
		padding: 0 0.4rem;
		font-size: 1rem;
		white-space: nowrap;
	}

	@media (max-width: 480px) {
		.stats-container {
			bottom: 14px;
			right: 14px;
		}
		.stats-panel {
			width: calc(100vw - 28px);
			bottom: 70px;
		}
		.day-metrics {
			gap: 0.6rem;
		}
	}

	@media print {
		.stats-container {
			display: none !important;
		}
	}
</style>
