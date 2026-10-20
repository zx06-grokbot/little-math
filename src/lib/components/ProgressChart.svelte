<script lang="ts">
	interface Props {
		data: Array<{
		date: string;
		totalProblems: number;
		correctProblems: number;
		correctRate: number;
		timeSpent: number;
		avgTimePerProblem: number;
	}>;
	}

	let { data }: Props = $props();

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${month}/${day}`;
	}

	function getBarHeight(value: number, maxValue: number): number {
		if (maxValue === 0) return 0;
		return (value / maxValue) * 100;
	}

	const maxValue = $derived(Math.max(...data.map((d) => d.totalProblems), 1));
</script>

<div class="progress-chart">
	<h4>🎯 做题记录（这 7 天）</h4>
	<div class="chart-container">
		<svg viewBox="0 0 600 230" class="chart-svg" role="img" aria-label="这 7 天做题和答对的数量">
			{#each [0, 50, 100] as percent}
				{@const y = 200 - (percent / 100) * 160}
				<line class="grid" x1="20" y1={y} x2="580" y2={y} stroke-dasharray="6" />
			{/each}
			<line class="axis" x1="20" y1="200" x2="580" y2="200" stroke-width="2" />
			{#each data as item, idx}
				{@const x = 40 + idx * 78}
				{@const barWidth = 56}
				{@const correctHeight = getBarHeight(item.correctProblems, maxValue)}
				{@const totalHeight = getBarHeight(item.totalProblems, maxValue)}
				<rect class="bar-total" x={x} y={200 - totalHeight * 1.6} width={barWidth} height={totalHeight * 1.6} rx="8" />
				<rect class="bar-correct" x={x} y={200 - correctHeight * 1.6} width={barWidth} height={correctHeight * 1.6} rx="8" />
				<text class="lbl" x={x + barWidth / 2} y="224" text-anchor="middle" font-size="20">{formatDate(item.date)}</text>
				{#if item.totalProblems > 0}
					<text class="num" x={x + barWidth / 2} y={200 - totalHeight * 1.6 - 8} text-anchor="middle" font-size="20" font-weight="bold">
						{item.correctProblems}/{item.totalProblems}
					</text>
				{/if}
			{/each}
		</svg>
		<div class="legend">
			<div class="legend-item"><span class="legend-color correct"></span>答对</div>
			<div class="legend-item"><span class="legend-color total"></span>做了</div>
		</div>
	</div>
</div>

<style>
	.progress-chart h4 {
		margin: 0 0 0.6rem;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--c-text);
	}
	.chart-container {
		background: var(--c-surface-2);
		border-radius: var(--c-radius);
		padding: 0.75rem 0.75rem 0.6rem;
	}
	.chart-svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.grid {
		stroke: var(--c-border);
	}
	.axis {
		stroke: var(--c-muted);
		opacity: 0.5;
	}
	.bar-total {
		fill: var(--c-chart-2);
	}
	.bar-correct {
		fill: var(--c-chart-1);
	}
	.lbl {
		fill: var(--c-muted);
	}
	.num {
		fill: var(--c-text);
	}
	.legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 0.5rem;
		font-size: 1rem;
		color: var(--c-muted);
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.legend-color {
		width: 16px;
		height: 16px;
		border-radius: 4px;
	}
	.legend-color.correct {
		background: var(--c-chart-1);
	}
	.legend-color.total {
		background: var(--c-chart-2);
	}
</style>
