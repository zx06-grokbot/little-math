<script lang="ts">
	import type { AnyProblem } from '#lib/types.js';
	import { formatProblemText } from '#lib/format.js';
	import { getFavorites, clearFavorites, removeFavorite } from '#lib/services/favorites.js';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';

	let records = $state<{ problem: AnyProblem; timestamp: number }[]>([]);

	$effect(() => {
		if (browser) {
			records = getFavorites();
		}
	});

	function formatProblem(problem: AnyProblem): string {
		return formatProblemText(problem);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('zh-CN');
	}

	function handleClear() {
		if (confirm('真的要把收藏都清掉吗？')) {
			clearFavorites();
			records = [];
		}
	}

	function handleRemove(timestamp: number) {
		removeFavorite(timestamp);
		records = getFavorites();
	}

	function handleReview() {
		goto('/practice?mode=favorite-review');
	}
</script>

<svelte:head>
	<title>收藏 - 小小数学家</title>
</svelte:head>

<div class="favorites-page list-page ui-page">
	<h1 class="ui-page-title">⭐ 收藏</h1>
	<p class="sub">喜欢的题放在这里，想玩就来玩</p>
	{#if records.length === 0}
		<div class="empty ui-card" data-testid="favorites-empty">
			<div class="emoji" aria-hidden="true">🌟</div>
			<p>这里还没有收藏的题</p>
			<p class="hint">做完题后，点一下 ☆ 就能收藏</p>
			<a href="/practice" class="ui-btn ui-btn-primary ui-btn-big">🎯 去做题</a>
		</div>
	{:else}
		<div class="actions">
			<button class="grow ui-btn ui-btn-primary ui-btn-big" onclick={handleReview}>
				🎮 玩收藏的题（{records.length} 道）
			</button>
			<button class="ui-btn ui-btn-quiet ui-btn-big" onclick={handleClear}>🗑️ 全部清掉</button>
		</div>
		<div class="records-list">
			{#each records.slice().reverse() as record}
				<div class="record-card ui-card" data-testid="favorite-record">
					<div class="record-main">
						<div class="problem">{formatProblem(record.problem)}</div>
						<div class="meta">
							<span class="date">📅 {formatDate(record.timestamp)}</span>
						</div>
					</div>
					<button class="remove-btn ui-btn ui-btn-quiet" data-testid="favorite-remove" onclick={() => handleRemove(record.timestamp)} aria-label="不收藏了">☆ 不要了</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.list-page {
		padding-top: 0.5rem;
		padding-bottom: 2.5rem;
	}
	.sub {
		margin: -0.5rem 0 1.25rem;
		text-align: center;
		color: var(--c-muted);
		font-size: 1.15rem;
	}
	.empty {
		text-align: center;
		padding: 2.75rem 1.5rem 2.5rem;
	}
	.empty .emoji {
		font-size: 4.5rem;
		line-height: 1.1;
	}
	.empty p {
		margin: 0.75rem 0 0;
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--c-text);
	}
	.empty .hint {
		font-size: 1.1rem;
		font-weight: 400;
		color: var(--c-muted);
	}
	.empty .ui-btn {
		margin-top: 1.5rem;
		min-width: 11rem;
		text-decoration: none;
	}
	.actions {
		display: flex;
		gap: 0.9rem;
		margin-bottom: 1.25rem;
	}
	.actions .grow {
		flex: 1 1 auto;
	}
	.records-list {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.record-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.1rem 1rem 1.4rem;
	}
	.record-main {
		flex: 1 1 auto;
		min-width: 0;
	}
	.problem {
		font-size: 1.7rem;
		font-weight: 700;
		color: var(--c-text);
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin-top: 0.4rem;
		font-size: 0.95rem;
		color: var(--c-muted);
	}
	.remove-btn {
		flex: 0 0 auto;
		min-width: 48px;
		padding: 0 1rem;
		font-size: 1.05rem;
	}
	@media (max-width: 560px) {
		.actions {
			flex-direction: column;
		}
		.record-card {
			padding: 0.9rem 0.8rem 0.9rem 1rem;
			gap: 0.6rem;
		}
		.problem {
			font-size: 1.45rem;
		}
	}
</style>
