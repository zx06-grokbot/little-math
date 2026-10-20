<script lang="ts">
	interface Props {
		running: boolean;
	}

	let { running }: Props = $props();
	let seconds = $state(0);

	$effect(() => {
		if (running) {
			const interval = setInterval(() => seconds++, 1000);
			return () => clearInterval(interval);
		}
	});

	function formatTime(s: number): string {
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	export function reset() {
		seconds = 0;
	}

	export function getSeconds() {
		return seconds;
	}
</script>

<div class="timer" data-testid="timer">
	<span class="icon" aria-hidden="true">⏱️</span>
	<span class="time" data-testid="timer-value">{formatTime(seconds)}</span>
</div>

<style>
	.timer {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 48px;
		padding: 0 0.9rem;
		border-radius: 999px;
		background: var(--c-info-soft);
		color: var(--c-info);
		font-size: 1.35rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.icon {
		font-size: 1.15rem;
	}
</style>
