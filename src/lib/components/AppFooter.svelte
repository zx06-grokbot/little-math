<script lang="ts">
	const REPO = 'https://github.com/zx06/little-math';
</script>

<!-- 每页底部的细页脚：一行小字 + GitHub 源码链接；打印 / 导出 PDF 时不显示 -->
<footer class="app-footer" data-testid="app-footer">
	<span>🧮 小小数学家</span>
	<span class="dot" aria-hidden="true">·</span>
	<span>免费开源</span>
	<span class="dot" aria-hidden="true">·</span>
	<a href={REPO} target="_blank" rel="noopener noreferrer" data-testid="github-link">
		<svg class="gh" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
			/>
		</svg>
		<span>源码 / 觉得好用点个 ⭐</span>
	</a>
</footer>

<style>
	.app-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.15rem 0.4rem;
		margin: 1.5rem auto 0;
		padding: 0.25rem 1rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
		font-family: var(--font-body);
		font-size: 0.8rem;
		line-height: 1.4;
		color: var(--ft-fg, #6b7280);
		text-align: center;
	}
	.dot {
		opacity: 0.7;
	}
	a {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		/* 和全站一样：可点区域至少 44px 高（字仍然很小） */
		min-height: 44px;
		padding: 0 0.55rem;
		border-radius: var(--ui-radius-sm, 8px);
		color: inherit;
		text-decoration: none;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}
	a:hover,
	a:focus-visible {
		color: var(--ft-fg-hover, #374151);
		background: var(--ft-hover-bg, rgba(0, 0, 0, 0.05));
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	a:focus-visible {
		outline: 2px solid var(--c-focus, currentColor);
		outline-offset: 2px;
	}
	.gh {
		flex: none;
	}

	/* 手机：右下角 📊 悬浮按钮（bottom 20px + 60px）不要压住页脚文字 */
	@media (max-width: 768px) {
		.app-footer {
			padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px));
		}
	}

	@media print {
		.app-footer {
			display: none !important;
		}
	}
	:global(html[data-ink='print']) .app-footer {
		display: none !important;
	}
</style>
