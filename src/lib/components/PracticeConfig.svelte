<script lang="ts">
	import type { ExerciseConfig, Operation } from '$lib/types';
	import { OP_NAMES } from '$lib/types';
	import { GRADE_PRESETS } from '$lib/config/presets';
	import { zh } from '$lib/i18n/zh';
	import { usesOperations, usesRange, type ValidationIssue } from '$lib/generators/validate';

	interface Props {
		config: ExerciseConfig;
		issues?: ValidationIssue[];
		error?: string | null;
		onStart: () => void;
	}

	let { config = $bindable(), issues = [], error = null, onStart }: Props = $props();

	function handlePresetChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const preset = GRADE_PRESETS[target.value];
		if (preset && target.value !== 'custom') {
			config.range = { ...preset.range };
			config.operations = [...preset.operations];
		}
	}

	function toggleOperation(op: Operation, checked: boolean) {
		const set = new Set(config.operations);
		if (checked) set.add(op);
		else set.delete(op);
		config.operations = (['add', 'sub', 'mul', 'div'] as Operation[]).filter((o) => set.has(o));
	}
</script>

<div class="practice-config">
	<h2>🎯 开始练习</h2>

	<div class="config-row">
		<label
			>年级
			<select bind:value={config.gradePreset} onchange={handlePresetChange}>
				{#each Object.entries(GRADE_PRESETS) as [key, preset]}
					<option value={key}>{preset.label}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="config-row">
		<label
			>模式
			<select bind:value={config.problemMode} data-testid="practice-mode">
				<option value="normal">{zh.config.normalMode}</option>
				<option value="makeTarget">{zh.config.makeTargetMode}</option>
				<option value="chain">{zh.config.chainMode}</option>
				<option value="compare">{zh.config.compareMode}</option>
				<option value="remainder">{zh.config.remainderMode}</option>
			</select>
		</label>
	</div>

	{#if config.problemMode === 'remainder'}
		<div class="config-row">
			<label
				>{zh.config.remainderBlank}
				<select bind:value={config.remainderBlank}>
					<option value="quotient">{zh.config.remainderBlankQuotient}</option>
					<option value="remainder">{zh.config.remainderBlankRemainder}</option>
					<option value="both">{zh.config.remainderBlankBoth}</option>
				</select>
			</label>
		</div>
	{/if}

	{#if config.problemMode === 'makeTarget'}
		<div class="config-row">
			<label
				>目标
				<select bind:value={config.makeTargetValue}>
					<option value={10}>凑 10</option>
					<option value={20}>凑 20</option>
					<option value={100}>凑 100</option>
				</select>
			</label>
		</div>
	{/if}

	{#if config.problemMode === 'chain'}
		<div class="config-row">
			<label
				>{zh.config.chainLength}
				<select bind:value={config.chainLength}>
					<option value={3}>{zh.config.chainLength3}</option>
					<option value={4}>{zh.config.chainLength4}</option>
				</select>
			</label>
		</div>
	{/if}

	{#if usesOperations(config.problemMode)}
		<div class="config-row">
			<span>运算</span>
			<div class="checkbox-group">
				{#each Object.entries(OP_NAMES) as [op, name]}
					<label>
						<input
							type="checkbox"
							checked={config.operations.includes(op as Operation)}
							onchange={(e) => toggleOperation(op as Operation, (e.target as HTMLInputElement).checked)}
						/>
						{name}
					</label>
				{/each}
			</div>
		</div>
	{/if}

	{#if usesRange(config.problemMode)}
		<div class="config-row">
			<span>{config.problemMode === 'remainder' ? '被除数范围' : '数字范围'}</span>
			<div class="range-row">
				<input type="number" bind:value={config.range.min} min="0" max="9999" aria-label="最小值" />
				<span>～</span>
				<input type="number" bind:value={config.range.max} min="1" max="9999" aria-label="最大值" />
			</div>
		</div>
	{/if}

	<div class="config-row">
		<label
			>题数
			<input type="number" bind:value={config.totalCount} min="1" max="50" />
		</label>
	</div>

	{#each issues as issue}<p class="error" role="alert">{issue.message}</p>{/each}
	{#if error && issues.length === 0}<p class="error" role="alert">{error}</p>{/if}

	<button class="start-btn" onclick={onStart} disabled={issues.length > 0} data-testid="practice-start">开始答题 🚀</button>
</div>

<style>
	.practice-config {
		max-width: 400px;
		margin: 2rem auto;
		padding: 2rem;
		background: linear-gradient(180deg, #fff5f5, #fff9db);
		border-radius: 20px;
		border: 3px solid #ffc078;
		font-family: 'Comic Sans MS', cursive;
	}
	h2 {
		text-align: center;
		color: #ff6b6b;
		margin-bottom: 1.5rem;
	}
	.config-row {
		margin-bottom: 1rem;
	}
	.config-row > label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 1rem;
		color: #555;
	}
	select,
	input[type='number'] {
		padding: 0.5rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
	}
	.checkbox-group {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.checkbox-group label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
	}
	.range-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.range-row input {
		width: 6rem;
	}
	.error {
		color: #e03131;
		font-size: 0.9rem;
		margin: 0.4rem 0;
	}
	.start-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.start-btn {
		width: 100%;
		margin-top: 1.5rem;
		padding: 1rem;
		font-size: 1.5rem;
		background: linear-gradient(135deg, #ff6b6b, #ffa502);
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		font-family: inherit;
	}
	.start-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
	}

	/* 移动端适配 */
	@media (max-width: 768px) {
		.practice-config {
			max-width: 350px;
			margin: 1.5rem auto;
			padding: 1.5rem;
			border-radius: 16px;
		}

		h2 {
			font-size: 1.5rem;
			margin-bottom: 1.25rem;
		}

		.config-row {
			margin-bottom: 0.875rem;
		}

		.config-row > label {
			font-size: 0.9rem;
		}

		select,
		input[type='number'] {
			padding: 0.6rem;
			font-size: 0.95rem;
		}

		.checkbox-group {
			gap: 0.75rem;
		}

		.checkbox-group label {
			font-size: 0.9rem;
		}

		.start-btn {
			margin-top: 1.25rem;
			padding: 0.875rem;
			font-size: 1.25rem;
			min-height: 48px;
		}
	}

	@media (max-width: 480px) {
		.practice-config {
			max-width: 100%;
			margin: 1rem auto;
			padding: 1.25rem;
			border-radius: 12px;
		}

		h2 {
			font-size: 1.35rem;
			margin-bottom: 1rem;
		}

		.config-row {
			margin-bottom: 0.75rem;
		}

		.config-row > label {
			font-size: 0.85rem;
		}

		select,
		input[type='number'] {
			padding: 0.5rem;
			font-size: 0.9rem;
		}

		.checkbox-group {
			gap: 0.5rem;
		}

		.checkbox-group label {
			font-size: 0.85rem;
		}

		.start-btn {
			margin-top: 1rem;
			padding: 0.75rem;
			font-size: 1.1rem;
		}
	}
</style>
