<script lang="ts">
	import { onMount } from 'svelte';
	import { UI_THEMES, currentUiTheme, setUiTheme, type UiThemeId } from '$lib/config/uiThemes';

	let selected = $state<UiThemeId>('classic');

	onMount(() => {
		selected = currentUiTheme();
	});

	function pick(id: UiThemeId) {
		selected = id;
		setUiTheme(id);
	}
</script>

<div class="ui-theme-switcher no-print" role="radiogroup" aria-label="界面风格" data-testid="ui-theme-switcher">
	<span class="uts-label">界面风格</span>
	{#each UI_THEMES as t}
		<button
			type="button"
			role="radio"
			aria-checked={selected === t.id}
			class="uts-opt"
			class:selected={selected === t.id}
			title={t.desc}
			data-testid={`ui-theme-${t.id}`}
			onclick={() => pick(t.id)}
		>
			<span class="uts-icon" aria-hidden="true">{t.icon}</span>
			<span class="uts-long">{t.id === 'classic' ? '' : `${t.id.toUpperCase()} · `}{t.name}</span>
			<span class="uts-short">{t.id === 'classic' ? '' : `${t.id.toUpperCase()} `}{t.short}</span>
		</button>
	{/each}
</div>

<style>
	.ui-theme-switcher {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		margin-top: var(--h-switch-mt, 0.75rem);
		padding: 0.3rem;
		border-radius: var(--h-switch-radius, 999px);
		background: var(--h-switch-bg, rgba(255, 255, 255, 0.22));
		border: var(--h-switch-border, none);
		font-size: var(--h-switch-size, 0.85rem);
	}
	.uts-label {
		padding: 0 0.4rem 0 0.6rem;
		color: var(--h-switch-label, rgba(255, 255, 255, 0.95));
		font-weight: 600;
	}
	.uts-opt {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: var(--h-switch-h, 34px);
		padding: 0 0.85rem;
		border: none;
		border-radius: var(--h-switch-radius, 999px);
		background: transparent;
		color: var(--h-switch-fg, #fff);
		font: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}
	.uts-opt:hover {
		background: var(--h-switch-hover, rgba(255, 255, 255, 0.25));
	}
	.uts-opt.selected {
		background: var(--h-switch-on-bg, #fff);
		color: var(--h-switch-on-fg, #e8590c);
		font-weight: 700;
		box-shadow: var(--h-switch-on-shadow, 0 1px 4px rgba(0, 0, 0, 0.15));
	}
	.uts-opt:focus-visible {
		outline: 2px solid var(--h-switch-on-fg, #e8590c);
		outline-offset: 2px;
	}
	.uts-short {
		display: none;
	}
	@media (max-width: 640px) {
		.ui-theme-switcher {
			border-radius: 14px;
			gap: 0.2rem;
		}
		.uts-label,
		.uts-long {
			display: none;
		}
		.uts-short {
			display: inline;
		}
		.uts-opt {
			padding: 0 0.6rem;
			border-radius: 10px;
		}
	}
	@media print {
		.ui-theme-switcher {
			display: none !important;
		}
	}
</style>
