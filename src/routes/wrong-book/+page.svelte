<script lang="ts">
	import type { WrongRecord, AnyProblem } from '$lib/types';
	import { formatProblemText } from '$lib/format';
	import {
		getWrongRecords,
		clearWrongRecords,
		removeWrongRecord
	} from '$lib/services/wrongBook';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	let records: WrongRecord[] = $state([]);

	$effect(() => {
		if (browser) {
			records = getWrongRecords();
		}
	});

	function formatProblem(problem: AnyProblem): string {
		return formatProblemText(problem);
	}

	function formatAnswer(answer: number | string, problem: AnyProblem): string {
		// 如果答案是字符串，直接返回（格式如：商: 1, 余数: 3）
		if (typeof answer === 'string') {
			return answer;
		}

		// 如果是数字，根据题目类型处理
		if ('type' in problem && problem.type === 'remainder') {
			const p = problem as any;
			// 对于有余数除法，根据填空位置显示
			if (p.blank === 'quotient') {
				return `商 ${answer}`;
			} else if (p.blank === 'remainder') {
				return `余数 ${answer}`;
			} else {
				// both - 但这是旧数据，无法确定是商还是余数
				return `${answer}`;
			}
		}

		// 普通题目，直接返回数字
		return String(answer);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('zh-CN');
	}

	function handleClear() {
		if (confirm('真的要把错题都清掉吗？')) {
			clearWrongRecords();
			records = [];
		}
	}

	function handleRemove(timestamp: number) {
		removeWrongRecord(timestamp);
		records = getWrongRecords();
	}

	function handleReview() {
		goto('/practice?mode=wrong-review');
	}
</script>

<svelte:head>
	<title>错题本 - 小小数学家</title>
</svelte:head>

<div class="wrong-book-page list-page ui-page">
	<h1 class="ui-page-title">📕 错题本</h1>
	<p class="sub">做错的题会住在这里，再练一练就会啦</p>
	{#if records.length === 0}
		<div class="empty ui-card" data-testid="wrong-book-empty">
			<div class="emoji" aria-hidden="true">🎉</div>
			<p>太棒啦！这里还没有错题</p>
			<a href="/practice" class="ui-btn ui-btn-primary ui-btn-big">🎯 去做题</a>
		</div>
	{:else}
		<div class="actions">
			<button class="grow ui-btn ui-btn-primary ui-btn-big" onclick={handleReview} data-testid="wrong-book-review">
				💪 再练一遍（{records.length} 道）
			</button>
			<button class="ui-btn ui-btn-quiet ui-btn-big" onclick={handleClear}>🗑️ 全部清掉</button>
		</div>
		<div class="records-list">
			{#each records.slice().reverse() as record}
				<div class="record-card ui-card" data-testid="wrong-record">
					<div class="record-main">
						<div class="problem">{formatProblem(record.problem)}</div>
						<div class="answers">
							<span class="wrong">你写的：{formatAnswer(record.wrongAnswer, record.problem)}</span>
							<span class="correct">正确答案：{formatAnswer(record.correctAnswer, record.problem)}</span>
						</div>
						<div class="meta">
							<span class="date">📅 {formatDate(record.timestamp)}</span>
							<span class="review-count">🔁 练过 {record.reviewCount} 次</span>
						</div>
					</div>
					<button class="remove-btn ui-btn ui-btn-quiet" onclick={() => handleRemove(record.timestamp)} aria-label="学会了，删掉这道">✔ 学会了</button>
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
	.answers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
		margin-top: 0.35rem;
		font-size: 1.15rem;
	}
	.wrong {
		color: var(--c-danger);
	}
	.correct {
		color: var(--c-success);
		font-weight: 700;
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
