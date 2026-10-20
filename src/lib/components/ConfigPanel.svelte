<script lang="ts">
	import type { ExerciseConfig, Operation, BlankPosition, MakeTargetValue } from '$lib/types';
	import { OP_NAMES } from '$lib/types';
	import { GRADE_PRESETS } from '$lib/config/presets';
	import { getLayout, supportsVertical } from '$lib/config/layout';
	import { usesOperations, usesRange, TOTAL_COUNT_LIMIT, type ValidationIssue, type ConfigField } from '$lib/generators/validate';
	import { RANGE_RULE_TEXT } from '$lib/generators/rules';
	import { REMAINDER_DIVISOR_MAX, REMAINDER_DIVISOR_MIN } from '$lib/generators/remainder';
	import { zh } from '$lib/i18n/zh';
	import { track } from '$lib/actions/track';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';

	const MAKE_TARGET_OPTIONS: MakeTargetValue[] = [10, 20, 100];

	interface Props {
		config: ExerciseConfig;
		issues: ValidationIssue[];
		autoTitle: string;
		layoutNote?: string | null;
		onGenerate: () => void;
		onPrint: () => void;
		onExportPdf?: () => void;
		isExportingPdf?: boolean;
		theme: string;
		onThemeChange: (theme: string) => void;
	}

	let {
		config = $bindable(),
		issues,
		autoTitle,
		layoutNote = null,
		onGenerate,
		onPrint,
		onExportPdf,
		isExportingPdf = false,
		theme,
		onThemeChange
	}: Props = $props();

	const t = zh.config;
	const layout = $derived(getLayout(config));
	const canPrint = $derived(issues.length === 0);
	const verticalSupported = $derived(supportsVertical(config.problemMode));
	const showOps = $derived(usesOperations(config.problemMode));
	const showRange = $derived(usesRange(config.problemMode));
	const hasMulDiv = $derived(config.operations.includes('mul') || config.operations.includes('div'));

	function errorsFor(...fields: ConfigField[]): string[] {
		return issues.filter((i) => fields.includes(i.field)).map((i) => i.message);
	}

	function handlePresetChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const preset = GRADE_PRESETS[target.value];
		if (preset && target.value !== 'custom') {
			config.range = { ...preset.range };
			config.operations = [...preset.operations];
		}
	}

	/** 允许取消到 0 个运算：界面和实际状态保持一致，并提示“至少选择一种运算” */
	function toggleOperation(op: Operation, checked: boolean) {
		const set = new Set(config.operations);
		if (checked) set.add(op);
		else set.delete(op);
		config.operations = (['add', 'sub', 'mul', 'div'] as Operation[]).filter((o) => set.has(o));
	}

	/** 三个滑块是独立的权重，互不影响；实际比例 = 权重 / 总和 */
	function updateBlankRatio(pos: BlankPosition, value: number) {
		config.blankRatio = { ...config.blankRatio, [pos]: value / 100 };
	}
	const ratioTotal = $derived(
		(config.blankRatio.first ?? 0) + (config.blankRatio.second ?? 0) + (config.blankRatio.result ?? 0)
	);
	function share(pos: BlankPosition): number {
		if (ratioTotal <= 0) return pos === 'result' ? 100 : 0;
		return Math.round(((config.blankRatio[pos] ?? 0) / ratioTotal) * 100);
	}

	const rangeHints = $derived.by(() => {
		if (config.problemMode === 'remainder')
			return [`被除数在范围内；除数 ${REMAINDER_DIVISOR_MIN}～${REMAINDER_DIVISOR_MAX}；余数小于除数`];
		if (config.problemMode === 'chain')
			return ['按「先乘除、后加减」计算', '每一步的中间结果和答案都在 0～最大值 之间，除法都能整除'];
		return config.operations.map((op) => RANGE_RULE_TEXT[op]);
	});
</script>

<div class="config-panel">
	<h2>配置</h2>

	<div class="config-section print-theme-section">
		<ThemeSelector selectedTheme={theme} onChange={onThemeChange} />
	</div>

	<div class="config-section">
		<label>
			<span class="lbl"><span class="ico" aria-hidden="true">🎓</span>{t.gradePreset}</span>
			<select bind:value={config.gradePreset} onchange={handlePresetChange} data-testid="preset">
				{#each Object.entries(GRADE_PRESETS) as [key, preset]}
					<option value={key}>{preset.label}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="config-section">
		<label>
			<span class="lbl"><span class="ico" aria-hidden="true">🧩</span>{t.problemMode}</span>
			<select bind:value={config.problemMode} data-testid="mode">
				<option value="normal">{t.normalMode}</option>
				<option value="makeTarget">{t.makeTargetMode}</option>
				<option value="chain">{t.chainMode}</option>
				<option value="compare">{t.compareMode}</option>
				<option value="remainder">{t.remainderMode}</option>
			</select>
		</label>
	</div>

	{#if config.problemMode === 'remainder'}
		<div class="config-section">
			<label>
				<span class="lbl"><span class="ico" aria-hidden="true">❓</span>{t.remainderBlank}</span>
				<select bind:value={config.remainderBlank} data-testid="remainder-blank">
					<option value="quotient">{t.remainderBlankQuotient}</option>
					<option value="remainder">{t.remainderBlankRemainder}</option>
					<option value="both">{t.remainderBlankBoth}</option>
				</select>
			</label>
		</div>
	{/if}

	{#if config.problemMode === 'chain'}
		<div class="config-section">
			<label>
				<span class="lbl"><span class="ico" aria-hidden="true">🔗</span>{t.chainLength}</span>
				<select bind:value={config.chainLength} data-testid="chain-length">
					<option value={3}>{t.chainLength3}</option>
					<option value={4}>{t.chainLength4}</option>
				</select>
			</label>
		</div>
	{/if}

	{#if config.problemMode === 'makeTarget'}
		<div class="config-section">
			<label>
				<span class="lbl"><span class="ico" aria-hidden="true">🎯</span>{t.makeTargetValue}</span>
				<select bind:value={config.makeTargetValue} data-testid="make-target">
					{#each MAKE_TARGET_OPTIONS as value}
						<option {value}>凑 {value}</option>
					{/each}
				</select>
			</label>
		</div>
	{/if}

	<div class="config-section">
		{#if verticalSupported}
			<label>
				<span class="lbl"><span class="ico" aria-hidden="true">📐</span>{t.exerciseType}</span>
				<select bind:value={config.isVertical} data-testid="vertical">
					<option value={false}>{t.horizontal}</option>
					<option value={true}>{t.vertical}</option>
				</select>
			</label>
		{:else}
			<span class="label"><span class="ico" aria-hidden="true">📐</span>{t.exerciseType}</span>
			<p class="hint">该模式只支持横式</p>
		{/if}
	</div>

	{#if !layout.vertical}
		<div class="config-section">
			<label>
				<span class="lbl"><span class="ico" aria-hidden="true">🧱</span>{t.columns}</span>
				<select bind:value={config.columns} data-testid="columns">
					<option value={2}>{t.columns2}</option>
					<option value={3}>{t.columns3}</option>
				</select>
			</label>
		</div>
	{/if}

	{#if showOps}
		<div class="config-section">
			<span class="label"><span class="ico" aria-hidden="true">➕</span>{t.operations}</span>
			<div class="checkbox-group" class:invalid={errorsFor('operations').length > 0}>
				{#each Object.entries(OP_NAMES) as [op, name]}
					<label class="checkbox-label">
						<input
							type="checkbox"
							data-testid="op-{op}"
							checked={config.operations.includes(op as Operation)}
							onchange={(e) => toggleOperation(op as Operation, (e.target as HTMLInputElement).checked)}
						/>
						{name}
					</label>
				{/each}
			</div>
			{#each errorsFor('operations') as msg}<p class="error" role="alert">{msg}</p>{/each}
			{#if hasMulDiv}
				<label class="checkbox-label table-opt">
					<input type="checkbox" bind:checked={config.tableMulDiv} data-testid="table-muldiv" />
					乘除只出表内（因数、除数和商不超过 9）
				</label>
			{/if}
		</div>
	{/if}

	{#if showRange}
		<div class="config-section">
			<span class="label"><span class="ico" aria-hidden="true">🔢</span>{config.problemMode === 'remainder' ? '被除数范围' : t.range}</span>
			<div class="range-inputs">
				<label>
					{t.rangeMin}
					<input
						type="number"
						data-testid="range-min"
						bind:value={config.range.min}
						min="0"
						max="9999"
						step="1"
						class:invalid={errorsFor('rangeMin', 'range').length > 0}
					/>
				</label>
				<label>
					{t.rangeMax}
					<input
						type="number"
						data-testid="range-max"
						bind:value={config.range.max}
						min="1"
						max="9999"
						step="1"
						class:invalid={errorsFor('rangeMax', 'range').length > 0}
					/>
				</label>
			</div>
			{#each errorsFor('rangeMin', 'rangeMax', 'range') as msg}<p class="error" role="alert">{msg}</p>{/each}
			<ul class="hint-list">
				{#each rangeHints as h}<li>{h}</li>{/each}
			</ul>
		</div>
	{/if}

	{#if config.problemMode === 'normal'}
		<div class="config-section">
			<span class="label"><span class="ico" aria-hidden="true">⬜</span>{t.blankPosition}</span>
			<div class="ratio-inputs">
				{#each [['first', t.blankFirst], ['second', t.blankSecond], ['result', t.blankResult]] as [pos, name]}
					<label>
						{name}
						<input
							type="range"
							min="0"
							max="100"
							value={Math.round((config.blankRatio[pos as BlankPosition] ?? 0) * 100)}
							oninput={(e) => updateBlankRatio(pos as BlankPosition, Number((e.target as HTMLInputElement).value))}
						/>
						<span>{share(pos as BlankPosition)}%</span>
					</label>
				{/each}
			</div>
			<p class="hint">三个滑块互不影响，右侧是实际占比{ratioTotal <= 0 ? '（全为 0 时只留空结果）' : ''}</p>
		</div>
	{/if}

	<div class="config-section">
		<label>
			<span class="lbl"><span class="ico" aria-hidden="true">📚</span>{t.totalCount}</span>
			<input
				type="number"
				data-testid="total-count"
				bind:value={config.totalCount}
				min="1"
				max={TOTAL_COUNT_LIMIT}
				step="1"
				class:invalid={errorsFor('totalCount').length > 0}
			/>
		</label>
		{#each errorsFor('totalCount') as msg}<p class="error" role="alert">{msg}</p>{/each}
	</div>

	<div class="config-section">
		<label>
			<span class="lbl"><span class="ico" aria-hidden="true">📄</span>{t.countPerPage}</span>
			<input
				type="number"
				data-testid="per-page"
				bind:value={config.countPerPage}
				min="1"
				max={layout.maxPerPage}
				step="1"
				class:invalid={errorsFor('countPerPage').length > 0}
			/>
		</label>
		{#each errorsFor('countPerPage') as msg}<p class="error" role="alert">{msg}</p>{/each}
		<p class="hint">当前版式一页 A4 最多 {layout.maxPerPage} 道</p>
		{#if layoutNote}<p class="note" data-testid="layout-note">{layoutNote}</p>{/if}
	</div>

	<div class="config-section">
		<label>
			<span class="lbl"><span class="ico" aria-hidden="true">✏️</span>{t.customTitle}</span>
			<input type="text" bind:value={config.customTitle} placeholder={autoTitle} maxlength="30" data-testid="custom-title" />
		</label>
		<p class="hint">留空则按设置自动生成：{autoTitle}</p>
	</div>

	<div class="config-section">
		<label>
			<span class="lbl"><span class="ico" aria-hidden="true">🙂</span>{t.studentName}</span>
			<input type="text" bind:value={config.studentName} placeholder="请输入姓名" data-testid="student-name" />
		</label>
	</div>

	<div class="config-section">
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={config.showDate} data-testid="show-date" />
			{t.showDate}
		</label>
	</div>

	<div class="config-section">
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={config.showAnswerPage} data-testid="show-answer-page" />
			{t.showAnswerPage}
		</label>
	</div>

	<div class="button-group">
		<button
			class="btn primary"
			onclick={onGenerate}
			disabled={!canPrint}
			data-testid="generate"
			use:track={{
				type: 'generation',
				data: { operations: config.operations, gradePreset: config.gradePreset }
			}}
		>
			<span class="ico" aria-hidden="true">✨</span>{zh.buttons.generate}
		</button>
		<button class="btn secondary" onclick={onPrint} disabled={!canPrint} data-testid="print" use:track={{ type: 'print' }}>
			<span class="ico" aria-hidden="true">🖨️</span>{zh.buttons.print}
		</button>
		{#if onExportPdf}
			<button
				class="btn pdf"
				onclick={onExportPdf}
				disabled={isExportingPdf || !canPrint}
				data-testid="export-pdf"
				use:track={{ type: 'pdf' }}
			>
				<span class="ico" aria-hidden="true">📄</span>{isExportingPdf ? '导出中...' : zh.buttons.exportPdf}
			</button>
		{/if}
	</div>
	{#if !canPrint}<p class="error center">请先修正上面标红的设置</p>{/if}
</div>

<style>
	/* 所有 var(--cp-*, 默认值)：默认值即原版样式；界面风格 A/B/C 在 $lib/styles/ui-themes.css 里覆盖 */
	.config-panel {
		padding: var(--cp-pad, 1.5rem);
		background: var(--cp-bg, linear-gradient(180deg, #fff5f5 0%, #fff9db 100%));
		border-radius: var(--cp-radius, 16px);
		height: fit-content;
		border: var(--cp-border, 2px solid #ffc078);
		box-shadow: var(--cp-shadow, none);
		font-family: var(--cp-font, 'Comic Sans MS', cursive, sans-serif);
		color: var(--cp-fg, inherit);
	}

	h2 {
		margin: var(--cp-h2-margin, 0 0 1.5rem);
		padding-bottom: var(--cp-h2-pb, 0);
		border-bottom: var(--cp-h2-border, none);
		font-size: var(--cp-h2-size, 1.4rem);
		font-family: var(--cp-h2-font, inherit);
		font-weight: var(--cp-h2-weight, bold);
		letter-spacing: var(--cp-h2-ls, normal);
		color: var(--cp-h2-fg, #ff6b6b);
		text-align: var(--cp-h2-align, center);
	}

	h2::before {
		content: var(--cp-h2-before, '⚙️ ');
	}

	.config-section {
		margin-bottom: var(--cp-gap, 1.25rem);
	}
	.print-theme-section {
		display: var(--cp-print-theme-display, block);
	}

	.config-section > label {
		display: flex;
		flex-direction: column;
		gap: var(--cp-label-gap, 0.5rem);
		font-size: var(--cp-label-size, 0.875rem);
		font-weight: var(--cp-label-weight, normal);
		color: var(--cp-label-fg, #555);
	}

	.label {
		font-size: var(--cp-label-size, 0.875rem);
		font-weight: var(--cp-label-weight, normal);
		color: var(--cp-label-fg, #555);
		display: block;
		margin-bottom: var(--cp-label-gap, 0.5rem);
	}

	.lbl {
		display: var(--cp-lbl-display, block);
		align-items: center;
	}

	/* 标签 / 按钮前的小图标：原版不显示 */
	.ico {
		display: var(--cp-ico-display, none);
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: var(--cp-ico-size, 1.6em);
		height: var(--cp-ico-size, 1.6em);
		margin-right: 0.45em;
		border-radius: var(--cp-ico-radius, 50%);
		background: var(--cp-ico-bg, transparent);
		font-size: var(--cp-ico-font, 1em);
		line-height: 1;
		filter: var(--cp-ico-filter, none);
	}
	.btn .ico {
		width: auto;
		height: auto;
		background: none;
		margin-right: 0.4em;
		filter: var(--cp-btn-ico-filter, none);
	}

	select,
	input[type='number'],
	input[type='text'] {
		padding: var(--cp-input-pad, 0.5rem);
		min-height: var(--cp-input-h, auto);
		border: var(--cp-input-border, 1px solid #ddd);
		border-radius: var(--cp-input-radius, 4px);
		font-size: var(--cp-input-size, 1rem);
		width: 100%;
		box-sizing: border-box;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	/* 以下只在界面风格 A/B/C 下接管，原版保持浏览器默认（字体 / 颜色 / 焦点） */
	:global(html[data-ui-theme]) select,
	:global(html[data-ui-theme]) input[type='number'],
	:global(html[data-ui-theme]) input[type='text'] {
		background-color: var(--cp-input-bg);
		color: var(--cp-input-fg, var(--cp-fg));
		font-family: inherit;
	}
	:global(html[data-ui-theme]) .btn {
		font-family: inherit;
	}
	:global(html[data-ui-theme]) select:focus,
	:global(html[data-ui-theme]) input[type='number']:focus,
	:global(html[data-ui-theme]) input[type='text']:focus {
		outline: none;
		border-color: var(--cp-focus-border);
		box-shadow: var(--cp-focus-ring);
	}
	input[type='checkbox'],
	input[type='range'] {
		accent-color: var(--cp-accent, auto);
	}
	input[type='checkbox'] {
		width: var(--cp-check-size, auto);
		height: var(--cp-check-size, auto);
		margin: var(--cp-check-margin, 3px 3px 3px 4px);
	}

	.checkbox-group {
		display: var(--cp-chk-group-display, flex);
		grid-template-columns: repeat(2, minmax(0, 1fr));
		flex-wrap: wrap;
		gap: var(--cp-chk-group-gap, 0.75rem);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--cp-check-label-size, 0.875rem);
		color: var(--cp-check-fg, inherit);
		cursor: pointer;
	}
	/* 单个勾选项（显示日期 / 答案页 / 表内）：原版保持竖排，A/B/C 横排成一整条可点区域 */
	.config-section > label.checkbox-label {
		flex-direction: var(--cp-check-dir, column);
		justify-content: flex-start;
		gap: var(--cp-check-gap, 0.5rem);
		color: var(--cp-check-fg, var(--cp-label-fg, #555));
	}
	/* 运算多选：A/B/C 下做成大块可点的「胶囊」 */
	.config-section > label.checkbox-label,
	.checkbox-group .checkbox-label {
		min-height: var(--cp-chip-h, auto);
		padding: var(--cp-chip-pad, 0);
		border: var(--cp-chip-border, none);
		border-radius: var(--cp-chip-radius, 0);
		background: var(--cp-chip-bg, transparent);
		box-sizing: border-box;
	}
	:global(html[data-ui-theme]) .config-section > label.checkbox-label:has(input:checked),
	:global(html[data-ui-theme]) .checkbox-group .checkbox-label:has(input:checked) {
		background: var(--cp-chip-on-bg);
		border: var(--cp-chip-on-border);
		color: var(--cp-chip-on-fg);
		font-weight: var(--cp-chip-on-weight);
	}

	.range-inputs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.range-inputs label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: var(--cp-small-size, 0.75rem);
		color: var(--cp-small-fg, #777);
	}

	.ratio-inputs {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ratio-inputs label {
		display: grid;
		grid-template-columns: 80px 1fr 40px;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--cp-small-size, 0.75rem);
		color: var(--cp-small-fg, inherit);
	}

	.error {
		color: var(--cp-error-fg, #e03131);
		font-size: 0.8rem;
		margin: 0.35rem 0 0;
	}
	.error.center {
		text-align: center;
	}
	.hint,
	.note {
		color: var(--cp-hint-fg, #888);
		font-size: var(--cp-hint-size, 0.75rem);
		margin: 0.35rem 0 0;
	}
	.note {
		color: var(--cp-note-fg, #e8590c);
	}
	.hint-list {
		margin: 0.4rem 0 0;
		padding-left: 1.1rem;
		color: var(--cp-hint-fg, #888);
		font-size: var(--cp-hint-size, 0.75rem);
	}
	input.invalid,
	.checkbox-group.invalid {
		outline: 2px solid #ff8787;
		outline-offset: 1px;
		border-radius: 4px;
	}
	.table-opt {
		margin-top: 0.5rem;
		font-size: var(--cp-hint-size, 0.8rem);
	}

	.ratio-inputs input[type='range'] {
		width: 100%;
	}
	/* A/B/C：滑块轨道柔和、拇指更大，便于触屏拖动 */
	:global(html[data-ui-theme]) .ratio-inputs input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		height: 28px;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}
	:global(html[data-ui-theme]) .ratio-inputs input[type='range']::-webkit-slider-runnable-track {
		height: 8px;
		border-radius: 999px;
		background: var(--cp-range-track, #e5e7eb);
	}
	:global(html[data-ui-theme]) .ratio-inputs input[type='range']::-moz-range-track {
		height: 8px;
		border-radius: 999px;
		background: var(--cp-range-track, #e5e7eb);
	}
	:global(html[data-ui-theme]) .ratio-inputs input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 22px;
		height: 22px;
		margin-top: -7px;
		border-radius: 50%;
		border: 3px solid #fff;
		background: var(--cp-accent);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
	}
	:global(html[data-ui-theme]) .ratio-inputs input[type='range']::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 3px solid #fff;
		background: var(--cp-accent);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
	}

	.button-group {
		display: var(--cp-btns-display, flex);
		grid-template-columns: 1fr 1fr;
		gap: var(--cp-btns-gap, 0.75rem);
		margin-top: var(--cp-btns-mt, 1.5rem);
	}

	.btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--cp-btn-pad, 0.75rem 1rem);
		min-height: var(--cp-btn-h, auto);
		border: none;
		border-radius: var(--cp-btn-radius, 6px);
		font-size: var(--cp-btn-size, 1rem);
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.15s,
			box-shadow 0.2s;
	}
	/* A/B/C：主按钮「生成」占满一行，打印 / PDF 并排 */
	.btn.primary {
		grid-column: var(--cp-primary-span, auto);
	}

	.btn.primary {
		background: var(--cp-btn1-bg, linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%));
		color: var(--cp-btn1-fg, white);
		border: var(--cp-btn1-border, none);
		font-weight: var(--cp-btn-weight, 600);
		box-shadow: var(--cp-btn1-shadow, 0 3px 8px rgba(255, 107, 107, 0.4));
	}

	.btn.primary:hover {
		transform: var(--cp-btn-hover-transform, translateY(-1px));
		background: var(--cp-btn1-hover-bg, var(--cp-btn1-bg, linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)));
		box-shadow: var(--cp-btn1-hover-shadow, 0 4px 12px rgba(255, 107, 107, 0.5));
	}

	.btn.secondary {
		background: var(--cp-btn2-bg, linear-gradient(135deg, #51cf66 0%, #20c997 100%));
		color: var(--cp-btn2-fg, white);
		border: var(--cp-btn2-border, none);
		font-weight: var(--cp-btn-weight, 600);
		box-shadow: var(--cp-btn2-shadow, 0 3px 8px rgba(81, 207, 102, 0.4));
	}

	.btn.secondary:hover {
		transform: var(--cp-btn-hover-transform, translateY(-1px));
		background: var(--cp-btn2-hover-bg, var(--cp-btn2-bg, linear-gradient(135deg, #51cf66 0%, #20c997 100%)));
		box-shadow: var(--cp-btn2-hover-shadow, 0 4px 12px rgba(81, 207, 102, 0.5));
	}

	.btn.pdf {
		background: var(--cp-btn3-bg, linear-gradient(135deg, #e74c3c 0%, #c0392b 100%));
		color: var(--cp-btn3-fg, white);
		border: var(--cp-btn3-border, none);
		font-weight: var(--cp-btn-weight, 600);
		box-shadow: var(--cp-btn3-shadow, 0 3px 8px rgba(231, 76, 60, 0.4));
	}

	.btn.pdf:hover:not(:disabled) {
		transform: var(--cp-btn-hover-transform, translateY(-1px));
		background: var(--cp-btn3-hover-bg, var(--cp-btn3-bg, linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)));
		box-shadow: var(--cp-btn3-hover-shadow, 0 4px 12px rgba(231, 76, 60, 0.5));
	}
	.btn:focus-visible {
		outline: 3px solid var(--cp-accent, #1c7ed6);
		outline-offset: 2px;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	/* 移动端适配 */
	@media (max-width: 768px) {
		.config-panel {
			padding: 1rem;
			border-radius: 12px;
		}

		h2 {
			font-size: 1.2rem;
			margin-bottom: 1rem;
		}

		.config-section {
			margin-bottom: 1rem;
		}

		.config-section > label,
		.label {
			font-size: 0.8rem;
		}

		select,
		input[type='number'],
		input[type='text'] {
			padding: 0.6rem;
			font-size: 0.9rem;
		}

		.checkbox-group {
			gap: 0.5rem;
		}

		.checkbox-label {
			font-size: 0.8rem;
		}

		.range-inputs {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.ratio-inputs label {
			grid-template-columns: 60px 1fr 35px;
			gap: 0.4rem;
			font-size: 0.7rem;
		}

		.button-group {
			flex-direction: column;
			gap: 0.5rem;
		}

		.btn {
			padding: 0.8rem 1rem;
			font-size: 0.95rem;
			min-height: 44px;
		}
	}

	@media (max-width: 480px) {
		.config-panel {
			padding: 0.75rem;
			border-radius: 8px;
		}

		h2 {
			font-size: 1.1rem;
		}

		.ratio-inputs label {
			grid-template-columns: 50px 1fr 30px;
			font-size: 0.65rem;
		}

		.btn {
			padding: 0.75rem;
			font-size: 0.9rem;
		}
	}

	@media print {
		.config-panel {
			display: none;
		}
	}
</style>
