<script lang="ts">
	import type { CompareSymbol } from '$lib/types';

	interface Props {
		onSubmit: (answer: CompareSymbol) => void;
	}

	let { onSubmit }: Props = $props();

	function handleSelect(symbol: CompareSymbol) {
		onSubmit(symbol);
	}
</script>

<div class="compare-input">
	<button class="symbol-btn" onclick={() => handleSelect('<')}>&lt;</button>
	<button class="symbol-btn" onclick={() => handleSelect('=')}>=</button>
	<button class="symbol-btn" onclick={() => handleSelect('>')}>&gt;</button>
</div>

<style>
	.compare-input {
		display: flex;
		justify-content: center;
		gap: 1.25rem;
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
		}
		.symbol-btn {
			width: 76px;
			height: 76px;
			font-size: 2.6rem;
		}
	}
</style>
