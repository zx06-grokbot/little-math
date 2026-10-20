<script lang="ts">
	interface Props {
		blank: 'quotient' | 'remainder' | 'both';
		onSubmit: (answer: { quotient: number; remainder: number }) => void;
	}

	let { blank, onSubmit }: Props = $props();

	let quotient = $state('');
	let remainder = $state('');
	let quotientInput = $state<HTMLInputElement>();
	let remainderInput = $state<HTMLInputElement>();

	function handleSubmit() {
		const empty = (v: unknown) => v === '' || v === null || v === undefined || Number.isNaN(Number(v));
		if ((blank === 'quotient' || blank === 'both') && empty(quotient)) return;
		if ((blank === 'remainder' || blank === 'both') && empty(remainder)) return;

		onSubmit({
			quotient: blank === 'quotient' || blank === 'both' ? parseInt(String(quotient), 10) : -1,
			remainder: blank === 'remainder' || blank === 'both' ? parseInt(String(remainder), 10) : -1
		});
	}

	function handleKeyDown(e: KeyboardEvent, inputType: 'quotient' | 'remainder') {
		if (e.key === 'Enter') {
			if (inputType === 'quotient' && blank === 'both') {
				remainderInput?.focus();
			} else {
				handleSubmit();
			}
		}
	}

	function focus() {
		(quotientInput ?? remainderInput)?.focus();
	}

	function clear() {
		quotient = '';
		remainder = '';
	}

	export { focus, clear };
</script>

<div class="remainder-input">
	{#if blank === 'quotient' || blank === 'both'}
		<div class="input-group">
			<span class="label">商</span>
			<input
				bind:this={quotientInput}
				type="number"
				bind:value={quotient}
				onkeydown={(e) => handleKeyDown(e, 'quotient')}
				placeholder="?"
				aria-label="商"
			/>
		</div>
	{/if}

	{#if blank === 'remainder' || blank === 'both'}
		<div class="input-group">
			<span class="label">余数</span>
			<input
				bind:this={remainderInput}
				type="number"
				bind:value={remainder}
				onkeydown={(e) => handleKeyDown(e, 'remainder')}
				placeholder="?"
				aria-label="余数"
			/>
		</div>
	{/if}

	<button class="submit-btn ui-btn ui-btn-primary" onclick={handleSubmit}>好了 ✅</button>
</div>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.remainder-input {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1rem 1.25rem;
		padding: 0.5rem 0;
	}
	.input-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.label {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--c-muted);
	}
	input {
		width: 6.5rem;
		min-height: 72px;
		box-sizing: border-box;
		padding: 0 0.5rem;
		font: inherit;
		font-size: 2.2rem;
		font-weight: 700;
		text-align: center;
		color: var(--c-text);
		background: var(--c-surface);
		border: 3px solid var(--c-primary);
		border-radius: var(--c-radius);
	}
	input:focus {
		outline: none;
		box-shadow: 0 0 0 4px var(--c-focus);
	}
	.submit-btn {
		min-height: 72px;
		min-width: 8rem;
		font-size: 1.6rem;
	}
	@media (max-width: 480px) {
		.submit-btn {
			flex: 1 1 100%;
			max-width: 260px;
		}
	}
</style>
