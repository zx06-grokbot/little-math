<script lang="ts">
	import type { AnyProblem, CompareSymbol } from '#lib/types.js';
	import { addFavorite, getFavorites, removeFavorite } from '#lib/services/favorites.js';
	import { formatProblemText, problemId } from '#lib/format.js';

	interface AnswerRecord {
		problem: AnyProblem;
		userAnswer: number | CompareSymbol | string;
		correctAnswer: number | CompareSymbol | string;
		isCorrect: boolean;
	}

	interface Props {
		total: number;
		correct: number;
		timeSpent: number;
		records: AnswerRecord[];
		onRestart: () => void;
		onBackHome: () => void;
	}

	let { total, correct, timeSpent, records, onRestart, onBackHome }: Props = $props();

	let accuracy = $derived(total > 0 ? Math.round((correct / total) * 100) : 0);
	let avgTime = $derived(total > 0 ? Math.round(timeSpent / total) : 0);

	function formatTime(s: number): string {
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		if (mins === 0) return `${secs}秒`;
		return `${mins}分${secs}秒`;
	}

	function getEmoji(): string {
		if (accuracy >= 90) return '🏆';
		if (accuracy >= 70) return '⭐';
		if (accuracy >= 50) return '👍';
		return '💪';
	}

	function getPraise(): string {
		if (accuracy === 100) return '全对啦！你太棒了！';
		if (accuracy >= 90) return '真厉害！差一点就全对啦！';
		if (accuracy >= 70) return '做得很好！继续加油！';
		if (accuracy >= 50) return '不错哦！多练练会更棒！';
		return '没关系，再来一次一定更好！';
	}

	function formatProblem(problem: AnyProblem): string {
		return formatProblemText(problem);
	}

	function formatAnswer(answer: number | CompareSymbol | string, problem: AnyProblem): string {
		if (typeof answer === 'string') {
			return answer;
		}

		if ('type' in problem && problem.type === 'remainder') {
			const p = problem as any;
			if (p.blank === 'quotient') {
				return `商 ${answer}`;
			} else if (p.blank === 'remainder') {
				return `余数 ${answer}`;
			} else {
				return `${answer}`;
			}
		}

		return String(answer);
	}

	/** 已收藏题目的 id 集合（响应式，点击后星标立即点亮） */
	let favoriteIds = $state(new Set(getFavorites().map((f) => problemId(f.problem))));

	function handleFavorite(problem: AnyProblem, e: Event) {
		e.stopPropagation();
		const id = problemId($state.snapshot(problem) as AnyProblem);
		if (favoriteIds.has(id)) {
			const fav = getFavorites().find((f) => problemId(f.problem) === id);
			if (fav) removeFavorite(fav.timestamp);
		} else {
			addFavorite($state.snapshot(problem) as AnyProblem);
		}
		favoriteIds = new Set(getFavorites().map((f) => problemId(f.problem)));
	}
</script>

<div class="result ui-card" data-testid="practice-result">
	<div class="emoji" aria-hidden="true">{getEmoji()}</div>
	<h2>{getPraise()}</h2>
	<div class="stats">
		<div class="stat">
			<span class="value" data-testid="result-accuracy">{accuracy}%</span>
			<span class="label">🎯 答对</span>
		</div>
		<div class="stat">
			<span class="value">{correct}/{total}</span>
			<span class="label">✅ 对了几道</span>
		</div>
		<div class="stat">
			<span class="value">{formatTime(timeSpent)}</span>
			<span class="label">⏱️ 用时</span>
		</div>
		<div class="stat">
			<span class="value">{formatTime(avgTime)}</span>
			<span class="label">🐢 每道</span>
		</div>
	</div>
	<div class="details">
		<h3>📋 看看每一道</h3>
		<p class="star-tip">点 ☆ 可以收藏喜欢的题</p>
		<div class="records-list">
			{#each records as record, idx}
				<div class="record-card" class:correct={record.isCorrect} class:wrong={!record.isCorrect}>
					<div class="record-header">
						<span class="index">{idx + 1}</span>
						<span class="problem">{formatProblem(record.problem)}</span>
						<span class="status" aria-label={record.isCorrect ? '对' : '错'}>{record.isCorrect ? '✅' : '❌'}</span>
						<button
							class="favorite-btn"
							class:on={favoriteIds.has(problemId($state.snapshot(record.problem) as AnyProblem))}
							onclick={(e) => handleFavorite(record.problem, e)}
							title={favoriteIds.has(problemId($state.snapshot(record.problem) as AnyProblem)) ? '不收藏了' : '收藏这道题'}
							aria-label={favoriteIds.has(problemId($state.snapshot(record.problem) as AnyProblem)) ? '不收藏了' : '收藏这道题'}
							data-testid="favorite-btn"
						>{favoriteIds.has(problemId($state.snapshot(record.problem) as AnyProblem)) ? '⭐' : '☆'}</button>
					</div>
					{#if !record.isCorrect}
						<div class="answers">
							<span class="wrong">你写的：{formatAnswer(record.userAnswer, record.problem)}</span>
							<span class="correct">正确答案：{formatAnswer(record.correctAnswer, record.problem)}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="actions">
		<button class="ui-btn ui-btn-primary ui-btn-big" onclick={onRestart}>🔁 再玩一次</button>
		<button class="ui-btn ui-btn-secondary ui-btn-big" onclick={onBackHome}>🏠 回首页</button>
	</div>
</div>

<style>
	.result {
		max-width: 640px;
		margin: 0.5rem auto 2rem;
		padding: 1.75rem 1.5rem 2rem;
		text-align: center;
		box-sizing: border-box;
	}
	.emoji {
		font-size: 4.5rem;
		line-height: 1.1;
	}
	h2 {
		color: var(--c-title);
		font-size: 1.8rem;
		margin: 0.6rem 0 1.5rem;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.75rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.9rem 0.4rem;
		border-radius: var(--c-radius);
		background: var(--c-primary-soft);
		color: var(--c-on-primary-soft);
	}
	.value {
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--c-title);
		white-space: nowrap;
	}
	.label {
		font-size: 1rem;
		color: var(--c-muted);
	}
	.details {
		text-align: left;
	}
	h3 {
		font-size: 1.3rem;
		color: var(--c-text);
		margin: 0 0 0.25rem;
	}
	.star-tip {
		margin: 0 0 0.75rem;
		color: var(--c-muted);
		font-size: 1rem;
	}
	.records-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		max-height: 420px;
		overflow-y: auto;
		padding: 2px;
	}
	.record-card {
		padding: 0.6rem 0.8rem;
		border-radius: var(--c-radius);
		border: 2px solid var(--c-border);
		background: var(--c-surface);
	}
	.record-card.correct {
		border-color: var(--c-success-soft);
	}
	.record-card.wrong {
		border-color: var(--c-danger-soft);
		background: color-mix(in srgb, var(--c-danger-soft) 40%, var(--c-surface));
	}
	.record-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.index {
		flex: 0 0 auto;
		min-width: 1.8em;
		height: 1.8em;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--c-surface-2);
		color: var(--c-muted);
		font-size: 0.95rem;
		font-weight: 700;
	}
	.problem {
		flex: 1 1 auto;
		min-width: 0;
		font-size: 1.35rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.status {
		font-size: 1.3rem;
	}
	.favorite-btn {
		flex: 0 0 auto;
		width: 48px;
		height: 48px;
		border: none;
		border-radius: 50%;
		background: transparent;
		font-size: 1.6rem;
		color: var(--c-warn);
		cursor: pointer;
	}
	.favorite-btn:hover,
	.favorite-btn:focus-visible {
		background: var(--c-warn-soft);
	}
	.answers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1.25rem;
		margin: 0.35rem 0 0 2.4em;
		font-size: 1.1rem;
	}
	.answers .wrong {
		color: var(--c-danger);
	}
	.answers .correct {
		color: var(--c-success);
		font-weight: 700;
	}
	.actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1.75rem;
	}
	.actions .ui-btn {
		min-width: 10rem;
	}

	@media (max-width: 560px) {
		.result {
			padding: 1.25rem 0.9rem 1.5rem;
		}
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		h2 {
			font-size: 1.45rem;
		}
		.actions .ui-btn {
			flex: 1 1 100%;
		}
	}
</style>
