<script lang="ts">
	import { onMount } from 'svelte';
	import { UI_THEMES, DEFAULT_UI_THEME, currentUiTheme, setUiTheme, type UiThemeId } from '#lib/config/uiThemes.js';

	let selected = $state<UiThemeId>(DEFAULT_UI_THEME);

	onMount(() => {
		selected = currentUiTheme();
	});

	function pick(id: UiThemeId) {
		selected = id;
		setUiTheme(id);
	}
</script>

<div class="ui-theme-switcher no-print" role="radiogroup" aria-label="换颜色" data-testid="ui-theme-switcher">
	<span class="uts-label" aria-hidden="true">🎨</span>
	{#each UI_THEMES as t}
		<button
			type="button"
			role="radio"
			aria-checked={selected === t.id}
			aria-label={t.name}
			class="uts-opt"
			class:selected={selected === t.id}
			title={t.desc}
			data-testid={`ui-theme-${t.id}`}
			onclick={() => pick(t.id)}
		>
			<span class="uts-icon" aria-hidden="true">{t.icon}</span>
			<span aria-hidden="true">{t.name}</span>
		</button>
	{/each}
</div>

<style>
	.ui-theme-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: var(--h-switch-radius, 999px);
		background: var(--h-switch-bg);
		border: var(--h-switch-border, none);
		font-size: 0.95rem;
	}
	.uts-label {
		padding: 0 0.3rem 0 0.45rem;
		font-size: 1.1rem;
	}
	.uts-opt {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 44px;
		padding: 0 0.85rem;
		border: none;
		border-radius: var(--h-switch-radius, 999px);
		background: transparent;
		color: var(--h-switch-fg);
		font: inherit;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}
	.uts-opt:hover {
		background: var(--h-switch-hover);
	}
	.uts-opt.selected {
		background: var(--h-switch-on-bg);
		color: var(--h-switch-on-fg);
		font-weight: 700;
		box-shadow: var(--h-switch-on-shadow);
	}
	.uts-opt:focus-visible {
		outline: 3px solid var(--c-focus);
		outline-offset: 2px;
	}
	@media (max-width: 640px) {
		.ui-theme-switcher {
			width: 100%;
			box-sizing: border-box;
			justify-content: center;
			border-radius: 14px;
		}
		.uts-opt {
			flex: 1 1 0;
			justify-content: center;
			padding: 0 0.4rem;
			border-radius: 10px;
		}
	}
	@media print {
		.ui-theme-switcher {
			display: none !important;
		}
	}
</style>
