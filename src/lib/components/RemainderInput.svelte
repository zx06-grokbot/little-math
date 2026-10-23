<script lang="ts">
	import { onMount } from 'svelte';
	import NumericKeypad from '#lib/components/NumericKeypad.svelte';
	import { playKeyFeedback } from '#lib/services/keyFeedback.js';

	interface Props {
		blank: 'quotient' | 'remainder' | 'both';
		onSubmit: (answer: { quotient: number; remainder: number }) => void;
	}

	let { blank, onSubmit }: Props = $props();

	let quotient = $state('');
	let remainder = $state('');
	let active = $state<'quotient' | 'remainder'>('quotient');
	let rootEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		active = blank === 'remainder' ? 'remainder' : 'quotient';
	});

	const MAX = 4;

	const activeValue = $derived(active === 'quotient' ? quotient : remainder);

	const canSubmit = $derived.by(() => {
		const empty = (v: string) => v === '';
		if ((blank === 'quotient' || blank === 'both') && empty(quotient)) return false;
		if ((blank === 'remainder' || blank === 'both') && empty(remainder)) return false;
		return true;
	});

	function setActive(next: 'quotient' | 'remainder') {
		if (blank === 'both') active = next;
	}

	function appendDigit(d: string) {
		if (active === 'quotient') {
			if (quotient.length >= MAX) return;
			quotient += d;
		} else {
			if (remainder.length >= MAX) return;
			remainder += d;
		}
	}

	function deleteDigit() {
		if (active === 'quotient') quotient = quotient.slice(0, -1);
		else remainder = remainder.slice(0, -1);
	}

	function handleSubmit() {
		if (!canSubmit) return;
		onSubmit({
			quotient: blank === 'quotient' || blank === 'both' ? parseInt(quotient, 10) : -1,
			remainder: blank === 'remainder' || blank === 'both' ? parseInt(remainder, 10) : -1
		});
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		const t = e.target as HTMLElement | null;
		if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
		if (e.key >= '0' && e.key <= '9') {
			e.preventDefault();
			playKeyFeedback();
			appendDigit(e.key);
		} else if (e.key === 'Backspace') {
			e.preventDefault();
			playKeyFeedback();
			deleteDigit();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (blank === 'both' && active === 'quotient' && quotient && !remainder) {
				playKeyFeedback();
				active = 'remainder';
				return;
			}
			if (canSubmit) {
				playKeyFeedback();
				handleSubmit();
			}
		} else if (e.key === 'Tab' && blank === 'both') {
			e.preventDefault();
			active = active === 'quotient' ? 'remainder' : 'quotient';
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onWindowKeydown);
		return () => window.removeEventListener('keydown', onWindowKeydown);
	});

	function focus() {
		rootEl?.focus({ preventScroll: true });
	}

	function clear() {
		quotient = '';
		remainder = '';
		active = blank === 'remainder' ? 'remainder' : 'quotient';
	}

	export { focus, clear };
</script>

<div class="remainder-input" data-testid="remainder-input" bind:this={rootEl} tabindex="-1">
	<div class="fields">
		{#if blank === 'quotient' || blank === 'both'}
			<button
				type="button"
				class="field"
				class:on={active === 'quotient'}
				data-testid="remainder-field-quotient"
				aria-label="商"
				aria-pressed={active === 'quotient'}
				onclick={() => setActive('quotient')}
			>
				<span class="label">商</span>
				<span class="val">{quotient || '?'}</span>
			</button>
		{/if}
		{#if blank === 'remainder' || blank === 'both'}
			<button
				type="button"
				class="field"
				class:on={active === 'remainder'}
				data-testid="remainder-field-remainder"
				aria-label="余数"
				aria-pressed={active === 'remainder'}
				onclick={() => setActive('remainder')}
			>
				<span class="label">余数</span>
				<span class="val">{remainder || '?'}</span>
			</button>
		{/if}
	</div>
	<NumericKeypad
		value={activeValue}
		maxLength={MAX}
		canSubmit={canSubmit}
		onDigit={appendDigit}
		onDelete={deleteDigit}
		onSubmit={handleSubmit}
	/>
</div>

<style>
	.remainder-input {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		outline: none;
	}
	.fields {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.65rem;
		width: 100%;
	}
	.field {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		min-width: 7.5rem;
		padding: 0.45rem 0.85rem 0.55rem;
		border: 3px solid var(--c-border);
		border-radius: var(--c-radius);
		background: var(--c-surface);
		color: var(--c-text);
		font: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.field.on {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 3px var(--c-focus);
		background: var(--c-primary-soft);
	}
	.label {
		font-size: 1rem;
		font-weight: 700;
		color: var(--c-muted);
	}
	.val {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		min-height: 1.2em;
	}
	@media (max-width: 480px) {
		.field {
			flex: 1 1 40%;
			min-width: 0;
		}
	}
</style>
