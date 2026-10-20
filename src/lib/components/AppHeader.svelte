<script lang="ts">
	import { page } from '$app/state';
	import { zh } from '#lib/i18n/zh.js';
	import UiThemeSwitcher from '#lib/components/UiThemeSwitcher.svelte';

	/** 全站统一页头：品牌 + 大按钮导航 + 风格切换（打印时隐藏） */
	const NAV = [
		{ href: '/', icon: '📝', label: '打印题', testid: 'nav-home' },
		{ href: '/practice', icon: '🎯', label: '做题', testid: 'nav-practice' },
		{ href: '/wrong-book', icon: '📕', label: '错题本', testid: 'nav-wrong-book' },
		{ href: '/favorites', icon: '⭐', label: '收藏', testid: 'nav-favorites' }
	];

	const path = $derived(page.url?.pathname ?? '/');
	function active(href: string): boolean {
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<header class="app-header no-print" data-testid="app-header">
	<div class="ah-inner">
		<a href="/" class="ah-brand" aria-label={zh.appName}>
			<span class="ah-logo" aria-hidden="true">🧮</span>
			<span class="ah-name">{zh.appName}</span>
		</a>
		<nav class="ah-nav" aria-label="主导航">
			{#each NAV as item}
				<a href={item.href} class="ah-link" class:on={active(item.href)} aria-current={active(item.href) ? 'page' : undefined} data-testid={item.testid}>
					<span class="ah-icon" aria-hidden="true">{item.icon}</span>{item.label}
				</a>
			{/each}
		</nav>
		<UiThemeSwitcher />
	</div>
</header>

<style>
	.app-header {
		background: var(--h-bg);
		color: var(--h-fg);
		border-bottom: var(--h-border, none);
		box-shadow: var(--h-shadow, none);
		font-family: var(--h-font);
	}
	.ah-inner {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.75rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
	}
	.ah-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 48px;
		color: var(--h-title-fg);
		text-decoration: none;
		font-size: var(--h-title-size, 1.7rem);
		font-weight: var(--h-title-weight, 800);
		letter-spacing: var(--h-title-ls);
		text-shadow: var(--h-title-shadow);
		white-space: nowrap;
	}
	.ah-brand::after {
		content: var(--h-title-after);
	}
	.ah-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.ah-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 48px;
		box-sizing: border-box;
		padding: 0 1.1rem;
		border-radius: var(--h-link-radius);
		border: var(--h-link-border, 1px solid transparent);
		background: var(--h-link-bg);
		color: var(--h-link-fg);
		text-decoration: none;
		font-size: 1.05rem;
		font-weight: 600;
		white-space: nowrap;
		transition: background 0.15s;
	}
	.ah-link:hover {
		background: var(--h-link-hover);
	}
	.ah-link.on {
		background: var(--h-switch-on-bg);
		color: var(--h-switch-on-fg);
		border-color: transparent;
		box-shadow: var(--h-switch-on-shadow);
	}
	.ah-link:focus-visible,
	.ah-brand:focus-visible {
		outline: 3px solid var(--c-focus);
		outline-offset: 2px;
	}

	@media (max-width: 1100px) {
		.ah-inner {
			justify-content: center;
		}
	}
	@media (max-width: 640px) {
		.ah-inner {
			padding: 0.6rem 0.75rem 0.75rem;
			gap: 0.5rem;
		}
		.ah-brand {
			font-size: 1.4rem;
			min-height: 44px;
		}
		.ah-nav {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			width: 100%;
			gap: 0.35rem;
		}
		.ah-link {
			flex-direction: column;
			justify-content: center;
			gap: 0.1rem;
			min-height: 56px;
			padding: 0.25rem 0.2rem;
			font-size: 0.85rem;
			border-radius: 14px;
		}
		.ah-icon {
			font-size: 1.3rem;
		}
	}
	@media print {
		.app-header {
			display: none !important;
		}
	}
</style>
