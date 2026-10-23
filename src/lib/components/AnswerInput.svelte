<script lang="ts">
	import { onMount } from 'svelte';
	import NumericKeypad from '#lib/components/NumericKeypad.svelte';
	import { playKeyFeedback } from '#lib/services/keyFeedback.js';

	interface Props {
		onSubmit: (answer: number) => void;
		autoFocus?: boolean;
	}

	let { onSubmit, autoFocus = true }: Props = $props();
	let value = $state('');
	let rootEl: HTMLDivElement | undefined = $state();

	const MAX = 6;

	function appendDigit(d: string) {
		if (value.length >= MAX) return;
		value += d;
	}

	function deleteDigit() {
		value = value.slice(0, -1);
	}

	function handleSubmit() {
		const num = parseInt(value, 10);
		if (!isNaN(num)) {
			onSubmit(num);
			value = '';
		}
	}

	/** 桌面实体键盘：不弹系统键盘，但仍可敲数字 */
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
			if (value.length) {
				playKeyFeedback();
				handleSubmit();
			}
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onWindowKeydown);
		return () => window.removeEventListener('keydown', onWindowKeydown);
	});

	export function focus() {
		rootEl?.focus({ preventScroll: true });
	}

	export function clear() {
		value = '';
	}

	$effect(() => {
		if (autoFocus && rootEl) rootEl.focus({ preventScroll: true });
	});
</script>

<div class="answer-input" data-testid="answer-input" bind:this={rootEl} tabindex="-1">
	<div class="display" data-testid="answer-display" aria-live="polite" aria-label="答案">
		{value || '?'}
	</div>
	<NumericKeypad
		{value}
		maxLength={MAX}
		onDigit={appendDigit}
		onDelete={deleteDigit}
		onSubmit={handleSubmit}
	/>
</div>

<style>
	.answer-input {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		outline: none;
	}
	.display {
		min-width: 9rem;
		min-height: 4rem;
		padding: 0.35rem 1rem;
		box-sizing: border-box;
		font-size: 2.4rem;
		font-weight: 800;
		text-align: center;
		color: var(--c-text);
		background: var(--c-surface);
		border: 3px solid var(--c-primary);
		border-radius: var(--c-radius);
		letter-spacing: 0.04em;
	}
	@media (max-width: 480px) {
		.display {
			width: 100%;
			max-width: 360px;
			font-size: 2.1rem;
		}
	}
</style>
