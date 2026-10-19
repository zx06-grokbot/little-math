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
		font-size: clamp(1.8rem, 6vw, 3.4rem);
		font-family: 'Comic Sans MS', cursive;
		color: #333;
		text-align: center;
		padding: 2rem;
		word-break: keep-all;
		overflow-wrap: anywhere;
	}

	/* 移动端适配 */
	@media (max-width: 768px) {
		.problem-display {
			font-size: 2.5rem;
			padding: 1.5rem;
		}
	}

	@media (max-width: 480px) {
		.problem-display {
			font-size: 2rem;
			padding: 1rem;
		}
	}
</style>
