<script lang="ts">
	import type { AnyProblem } from '$lib/types';
	import { correctAnswerOf, formatProblemText } from '$lib/format';

	interface Props {
		problem: AnyProblem;
	}

	let { problem }: Props = $props();

	function formatProblem(): string {
		return formatProblemText(problem, false, '___');
	}

	function getCorrectAnswer(): number | string {
		return correctAnswerOf(problem);
	}

	export { getCorrectAnswer };
</script>

<div class="problem-display">
	{formatProblem()}
</div>

<style>
	.problem-display {
		font-size: clamp(1.6rem, 7.2vw, 3.6rem);
		font-weight: 700;
		color: var(--c-text);
		text-align: center;
		padding: 1.75rem 0.5rem 2rem;
		letter-spacing: 0.02em;
		font-variant-numeric: tabular-nums;
		word-break: keep-all;
		overflow-wrap: anywhere;
	}
</style>
