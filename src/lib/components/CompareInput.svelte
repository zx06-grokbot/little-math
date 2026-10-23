<script lang="ts">
	import type { CompareSymbol } from '#lib/types.js';
	import { playKeyFeedback } from '#lib/services/keyFeedback.js';

	interface Props {
		onSubmit: (answer: CompareSymbol) => void;
	}

	let { onSubmit }: Props = $props();

	function handleSelect(symbol: CompareSymbol) {
		playKeyFeedback();
		onSubmit(symbol);
	}
</script>

<div class="compare-input" data-testid="compare-input" role="group" aria-label="比大小">
	<button type="button" class="symbol-btn" data-testid="compare-lt" onclick={() => handleSelect('<')}>&lt;</button>
	<button type="button" class="symbol-btn" data-testid="compare-eq" onclick={() => handleSelect('=')}>=</button>
	<button type="button" class="symbol-btn" data-testid="compare-gt" onclick={() => handleSelect('>')}>&gt;</button>
</div>

<style>
	.compare-input {
		display: flex;
		justify-content: center;
		gap: 1.25rem;
		touch-action: manipulation;
	}
	.symbol-btn {
		width: 88px;
		height: 88px;
		font: inherit;
		font-size: 3rem;
		font-weight: 800;
		line-height: 1;
		color: var(--c-on-primary-soft);
		background: var(--c-primary-soft);
		border: 3px solid var(--c-primary);
		border-radius: var(--c-radius-lg);
		box-shadow: var(--c-shadow);
		cursor: pointer;
		transition: transform 0.1s;
		-webkit-tap-highlight-color: transparent;
	}
	.symbol-btn:hover {
		transform: translateY(-2px);
	}
	.symbol-btn:active {
		transform: scale(0.95);
	}
	.symbol-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--c-focus);
	}
	@media (max-width: 480px) {
		.compare-input {
			gap: 0.9rem;
			width: 100%;
			max-width: 360px;
			margin: 0 auto;
		}
		.symbol-btn {
			flex: 1 1 0;
			width: auto;
			min-width: 0;
			height: 4.5rem;
			font-size: 2.6rem;
		}
	}
</style>
