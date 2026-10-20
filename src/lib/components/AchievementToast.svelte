<script lang="ts">
	import type { Achievement } from '$lib/services/achievements';

	interface Props {
		achievement: Achievement;
		onClose: () => void;
	}

	let { achievement, onClose }: Props = $props();

	let visible = $state(true);

	// 5秒后自动关闭
	$effect(() => {
		const timer = setTimeout(() => {
			visible = false;
			setTimeout(onClose, 300); // 等待动画完成
		}, 5000);

		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div class="achievement-toast" data-testid="achievement-toast" role="status">
		<div class="toast-content">
			<div class="icon" aria-hidden="true">{achievement.icon}</div>
			<div class="text">
				<div class="title">🎁 得到新奖章啦！</div>
				<div class="name">{achievement.name}</div>
				<div class="description">{achievement.description}</div>
			</div>
			<button class="close-btn" onclick={onClose} aria-label="关上">✕</button>
		</div>
	</div>
{/if}

<style>
	.achievement-toast {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 9999;
		animation: slideIn 0.4s ease;
	}
	@keyframes slideIn {
		from {
			transform: translateY(-20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	.toast-content {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: min(400px, calc(100vw - 40px));
		box-sizing: border-box;
		padding: 1rem 0.75rem 1rem 1.25rem;
		background: var(--c-warn-soft);
		color: var(--c-text);
		border: 3px solid var(--c-badge-border);
		border-radius: var(--c-radius-lg);
		box-shadow: var(--c-shadow-lg);
	}
	.icon {
		font-size: 3rem;
		line-height: 1;
		animation: bounce 1s ease;
	}
	@keyframes bounce {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
	}
	.text {
		flex: 1;
		min-width: 0;
	}
	.title {
		font-size: 1rem;
		color: var(--c-warn);
		font-weight: 700;
	}
	.name {
		font-size: 1.4rem;
		font-weight: 800;
		margin: 0.15rem 0;
	}
	.description {
		font-size: 1rem;
		color: var(--c-muted);
	}
	.close-btn {
		flex: 0 0 auto;
		width: 48px;
		height: 48px;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		font-size: 1.3rem;
		cursor: pointer;
	}
	.close-btn:hover {
		background: var(--c-surface);
	}
	@media (max-width: 560px) {
		.achievement-toast {
			top: 10px;
			right: 10px;
			left: 10px;
		}
		.toast-content {
			width: 100%;
		}
		.icon {
			font-size: 2.5rem;
		}
	}
</style>
