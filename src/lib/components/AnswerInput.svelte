<script lang="ts">
	interface Props {
		onSubmit: (answer: number) => void;
		autoFocus?: boolean;
	}

	let { onSubmit, autoFocus = true }: Props = $props();
	let value = $state('');
	let inputEl: HTMLInputElement;

	function handleSubmit() {
		const num = parseInt(value, 10);
		if (!isNaN(num)) {
			onSubmit(num);
			value = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSubmit();
		}
	}

	$effect(() => {
		if (autoFocus && inputEl) {
			inputEl.focus();
		}
	});

	export function focus() {
		inputEl?.focus();
	}

	export function clear() {
		value = '';
	}
</script>

<div class="answer-input">
	<input
		bind:this={inputEl}
		bind:value
		type="number"
		placeholder="?"
		aria-label="写答案"
		inputmode="numeric"
		onkeydown={handleKeydown}
	/>
	<button class="submit ui-btn ui-btn-primary" onclick={handleSubmit}>好了 ✅</button>
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
	.answer-input {
		display: flex;
		gap: 1rem;
		justify-content: center;
		align-items: stretch;
		flex-wrap: wrap;
	}
	input {
		width: 9rem;
		min-height: 72px;
		box-sizing: border-box;
		padding: 0 0.75rem;
		font: inherit;
		font-size: 2.4rem;
		font-weight: 700;
		text-align: center;
		color: var(--c-text);
		background: var(--c-surface);
		border: 3px solid var(--c-primary);
		border-radius: var(--c-radius);
	}
	input::placeholder {
		color: var(--c-muted);
		opacity: 0.55;
	}
	input:focus {
		outline: none;
		box-shadow: 0 0 0 4px var(--c-focus);
	}
	.submit {
		min-height: 72px;
		min-width: 8rem;
		font-size: 1.6rem;
	}
	@media (max-width: 480px) {
		input,
		.submit {
			flex: 1 1 100%;
			max-width: 260px;
		}
	}
</style>
