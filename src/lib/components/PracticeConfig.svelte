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

<div class="practice-config ui-card">
	<h2>🎯 来做题吧</h2>

	<div class="config-row">
		<label
			><span class="lbl"><span class="ico" aria-hidden="true">🎓</span>几年级</span>
			<select class="ui-input" bind:value={config.gradePreset} onchange={handlePresetChange}>
				{#each Object.entries(GRADE_PRESETS) as [key, preset]}
					<option value={key}>{preset.label}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="config-row">
		<label
			><span class="lbl"><span class="ico" aria-hidden="true">🧩</span>玩什么</span>
			<select class="ui-input" bind:value={config.problemMode} data-testid="practice-mode">
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
				><span class="lbl"><span class="ico" aria-hidden="true">❓</span>{zh.config.remainderBlank}</span>
				<select class="ui-input" bind:value={config.remainderBlank}>
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
				><span class="lbl"><span class="ico" aria-hidden="true">🎯</span>{zh.config.makeTargetValue}</span>
				<select class="ui-input" bind:value={config.makeTargetValue}>
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
				><span class="lbl"><span class="ico" aria-hidden="true">🔗</span>{zh.config.chainLength}</span>
				<select class="ui-input" bind:value={config.chainLength}>
					<option value={3}>{zh.config.chainLength3}</option>
					<option value={4}>{zh.config.chainLength4}</option>
				</select>
			</label>
		</div>
	{/if}

	{#if usesOperations(config.problemMode)}
		<div class="config-row">
			<span class="lbl row-label"><span class="ico" aria-hidden="true">➕</span>做什么题</span>
			<div class="checkbox-group">
				{#each Object.entries(OP_NAMES) as [op, name]}
					<label class="chip">
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
			<span class="lbl row-label"><span class="ico" aria-hidden="true">🔢</span>{config.problemMode === 'remainder' ? '被除数多大' : '数字多大'}</span>
			<div class="range-row">
				<input class="ui-input" type="number" bind:value={config.range.min} min="0" max="9999" aria-label="最小" />
				<span class="tilde" aria-hidden="true">到</span>
				<input class="ui-input" type="number" bind:value={config.range.max} min="1" max="9999" aria-label="最大" />
			</div>
		</div>
	{/if}

	<div class="config-row">
		<label
			><span class="lbl"><span class="ico" aria-hidden="true">📚</span>做几道</span>
			<input class="ui-input" type="number" bind:value={config.totalCount} min="1" max="50" />
		</label>
	</div>

	{#each issues as issue}<p class="error" role="alert">{issue.message}</p>{/each}
	{#if error && issues.length === 0}<p class="error" role="alert">{error}</p>{/if}

	<button class="start-btn ui-btn ui-btn-primary ui-btn-big" onclick={onStart} disabled={issues.length > 0} data-testid="practice-start">开始 🚀</button>
</div>

<style>
	.practice-config {
		max-width: 460px;
		margin: 0.5rem auto 2rem;
		padding: 1.75rem 1.6rem 1.9rem;
		box-sizing: border-box;
	}
	h2 {
		text-align: center;
		color: var(--c-title);
		font-family: var(--cp-h2-font, inherit);
		font-size: 1.9rem;
		margin: 0 0 1.5rem;
	}
	.config-row {
		margin-bottom: 1.2rem;
	}
	.config-row > label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.lbl {
		display: inline-flex;
		align-items: center;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--cp-label-fg);
	}
	.row-label {
		margin-bottom: 0.5rem;
	}
	.ico {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--cp-ico-size);
		height: var(--cp-ico-size);
		margin-right: 0.45em;
		border-radius: var(--cp-ico-radius, 50%);
		background: var(--cp-ico-bg);
		font-size: var(--cp-ico-font);
		filter: var(--cp-ico-filter, none);
	}
	select.ui-input,
	.config-row > label > input.ui-input {
		width: 100%;
	}
	.checkbox-group {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6rem;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 52px;
		padding: 0 0.9rem;
		box-sizing: border-box;
		border: var(--cp-chip-border);
		border-radius: var(--cp-chip-radius);
		background: var(--cp-chip-bg);
		font-size: 1.1rem;
		cursor: pointer;
	}
	.chip:has(input:checked) {
		background: var(--cp-chip-on-bg);
		border: var(--cp-chip-on-border);
		color: var(--cp-chip-on-fg);
		font-weight: 600;
	}
	.chip input {
		width: 22px;
		height: 22px;
		margin: 0;
		accent-color: var(--cp-accent);
	}
	.range-row {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.6rem;
	}
	.range-row input {
		width: 100%;
		min-width: 0;
		text-align: center;
	}
	.tilde {
		color: var(--c-muted);
		font-size: 1.05rem;
	}
	.error {
		color: var(--c-danger);
		background: var(--c-danger-soft);
		border-radius: var(--ui-radius-sm);
		padding: 0.55rem 0.8rem;
		font-size: 1rem;
		margin: 0.5rem 0;
	}
	.start-btn {
		width: 100%;
		margin-top: 1.25rem;
	}

	@media (max-width: 480px) {
		.practice-config {
			padding: 1.25rem 1rem 1.5rem;
		}
		h2 {
			font-size: 1.6rem;
		}
	}
</style>
