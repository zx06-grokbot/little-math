<script lang="ts">
	import { playKeyFeedback } from '#lib/services/keyFeedback.js';

	interface Props {
		/** 当前显示的数字串（由父组件托管，便于余数双框） */
		value?: string;
		maxLength?: number;
		/** 提交按钮是否可点（默认：有内容即可） */
		canSubmit?: boolean;
		submitLabel?: string;
		onDigit?: (digit: string) => void;
		onDelete?: () => void;
		onSubmit?: () => void;
	}

	let {
		value = '',
		maxLength = 6,
		canSubmit,
		submitLabel = '好了 ✅',
		onDigit,
		onDelete,
		onSubmit
	}: Props = $props();

	const submitOk = $derived(canSubmit ?? value.length > 0);

	const ROWS: string[][] = [
		['1', '2', '3'],
		['4', '5', '6'],
		['7', '8', '9'],
		['del', '0', 'ok']
	];

	function tapDigit(d: string) {
		playKeyFeedback();
		if (value.length >= maxLength) return;
		onDigit?.(d);
	}

	function tapDelete() {
		playKeyFeedback();
		onDelete?.();
	}

	function tapSubmit() {
		if (!submitOk) return;
		playKeyFeedback();
		onSubmit?.();
	}
</script>

<div class="keypad" data-testid="numeric-keypad" role="group" aria-label="数字键盘">
	{#each ROWS as row}
		<div class="row">
			{#each row as key}
				{#if key === 'del'}
					<button
						type="button"
						class="key key-action"
						data-testid="keypad-delete"
						aria-label="删除"
						onclick={tapDelete}
					>
						⌫
					</button>
				{:else if key === 'ok'}
					<button
						type="button"
						class="key key-submit ui-btn ui-btn-primary"
						data-testid="keypad-submit"
						aria-label="好了"
						disabled={!submitOk}
						onclick={tapSubmit}
					>
						{submitLabel}
					</button>
				{:else}
					<button
						type="button"
						class="key key-digit"
						data-testid="keypad-digit-{key}"
						aria-label={key}
						onclick={() => tapDigit(key)}
					>
						{key}
					</button>
				{/if}
			{/each}
		</div>
	{/each}
</div>

<style>
	.keypad {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		width: 100%;
		max-width: 360px;
		margin: 0 auto;
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
	}
	.row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.55rem;
	}
	.key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--c-tap, 48px);
		height: 3.6rem;
		padding: 0 0.35rem;
		border-radius: var(--c-radius-lg, 20px);
		border: 3px solid var(--c-border);
		background: var(--c-surface);
		color: var(--c-text);
		font: inherit;
		font-size: 1.85rem;
		font-weight: 800;
		line-height: 1;
		box-shadow: var(--c-shadow);
		cursor: pointer;
		transition: transform 0.08s ease;
		-webkit-tap-highlight-color: transparent;
	}
	.key:active:not(:disabled) {
		transform: scale(0.96);
	}
	.key:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--c-focus);
	}
	.key-digit {
		border-color: var(--c-primary);
		background: var(--c-primary-soft);
		color: var(--c-on-primary-soft);
	}
	.key-action {
		font-size: 1.55rem;
		color: var(--c-muted);
	}
	.key-submit {
		font-size: 1.15rem;
		font-weight: 800;
		border-width: 0;
		/* ui-btn-primary 已带主题色；补齐高度与圆角一致 */
		min-height: 3.6rem;
		height: 3.6rem;
		border-radius: var(--c-radius-lg, 20px);
	}
	.key-submit:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		transform: none;
	}
	@media (max-width: 480px) {
		.keypad {
			max-width: none;
			gap: 0.45rem;
		}
		.row {
			gap: 0.45rem;
		}
		.key {
			height: 3.35rem;
			font-size: 1.7rem;
		}
		.key-submit {
			height: 3.35rem;
			min-height: 3.35rem;
			font-size: 1.05rem;
		}
	}
</style>
