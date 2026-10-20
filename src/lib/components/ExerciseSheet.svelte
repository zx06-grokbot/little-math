<script lang="ts">
	import type { AnyProblem, Problem } from '#lib/types.js';
	import { OP_SYMBOLS } from '#lib/types.js';
	import { zh } from '#lib/i18n/zh.js';
	import { isChain, isCompare, isMakeTarget, isRemainder, exprText, REMAINDER_SEP } from '#lib/format.js';
	import { fitSheetText } from '#lib/actions/fitText.js';

	interface Props {
		problems: AnyProblem[];
		/** 每页题数（已按版式上限裁剪） */
		perPage: number;
		showAnswers: boolean;
		vertical: boolean;
		columns: number;
		title: string;
		subtitle?: string;
		studentName?: string;
		showDate?: boolean;
	}

	let {
		problems,
		perPage,
		showAnswers,
		vertical,
		columns,
		title,
		subtitle = '',
		studentName = '',
		showDate = true
	}: Props = $props();

	const t = zh.print;

	function formatDate(): string {
		const now = new Date();
		return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
	}

	const pages = $derived.by(() => {
		const size = Math.max(1, perPage);
		const result: AnyProblem[][] = [];
		for (let i = 0; i < problems.length; i += size) result.push(problems.slice(i, i + size));
		return result;
	});

	/** 每页固定行数：整页题目均匀铺满 A4，最后一页行高与前面一致 */
	const rows = $derived(Math.max(1, Math.ceil(Math.max(1, perPage) / columns)));

	type Token = { k: 'num' | 'op' | 'blank' | 'ans' | 'sep' | 'cmp'; v: string };

	const num = (v: number | string): Token => ({ k: 'num', v: String(v) });
	const op = (v: string): Token => ({ k: 'op', v });

	function slot(v: number | string, isBlank: boolean): Token {
		if (!isBlank) return num(v);
		/* parentheses drawn via CSS ::before/::after so they hang outside the digit column */
		return showAnswers
			? { k: 'ans', v: String(v) }
			: { k: 'blank', v: '\u00a0\u00a0\u00a0' };
	}

	function tokens(p: AnyProblem): Token[] {
		if (isMakeTarget(p)) {
			return [slot(p.blankFirst ? p.answer : p.a, p.blankFirst), op('+'), slot(p.blankFirst ? p.a : p.answer, !p.blankFirst), op('='), num(p.target)];
		}
		if (isChain(p)) {
			const out: Token[] = [];
			p.numbers.forEach((n, i) => {
				out.push(slot(n, p.blank === i));
				if (i < p.ops.length) out.push(op(OP_SYMBOLS[p.ops[i]]));
			});
			out.push(op('='), slot(p.result, p.blank === 'result'));
			return out;
		}
		if (isCompare(p)) {
			return [
				num(exprText(p.left)),
				showAnswers ? { k: 'ans', v: p.answer } : { k: 'cmp', v: '○' },
				num(exprText(p.right))
			];
		}
		if (isRemainder(p)) {
			return [
				num(p.dividend),
				op('÷'),
				num(p.divisor),
				op('='),
				slot(p.quotient, p.blank !== 'remainder'),
				{ k: 'sep', v: REMAINDER_SEP },
				slot(p.remainder, p.blank !== 'quotient')
			];
		}
		const q = p as Problem;
		return [slot(q.a, q.blank === 'first'), op(OP_SYMBOLS[q.op]), slot(q.b, q.blank === 'second'), op('='), slot(q.result, q.blank === 'result')];
	}

	/** 竖式只用于普通计算和凑数（凑数转成加法） */
	function asVertical(p: AnyProblem): Problem | null {
		if (isMakeTarget(p))
			return p.blankFirst
				? { a: p.answer, b: p.a, op: 'add', result: p.target, blank: 'first' }
				: { a: p.a, b: p.answer, op: 'add', result: p.target, blank: 'second' };
		if ('type' in p) return null;
		return p as Problem;
	}

	/** 竖式单元：留空时显示方框，答案页直接显示数字（不加括号，保证数位对齐） */
	function vcell(v: number, blank: boolean): { text: string; cls: string } {
		if (!blank) return { text: String(v), cls: '' };
		return showAnswers ? { text: String(v), cls: 'v-ans' } : { text: '', cls: 'v-box' };
	}

	/** 横式数字槽宽度：取本页所有模式里最宽的数字/算式片段 */
	function maxDigits(p: AnyProblem): number {
		if (isMakeTarget(p)) return Math.max(String(p.a).length, String(p.answer).length, String(p.target).length);
		if (isChain(p)) return Math.max(...p.numbers.map((n) => String(n).length), String(p.result).length);
		if (isRemainder(p))
			return Math.max(String(p.dividend).length, String(p.divisor).length, String(p.quotient).length, String(p.remainder).length);
		if (isCompare(p)) return Math.max(exprText(p.left).replace(/\s/g, '').length, exprText(p.right).replace(/\s/g, '').length);
		const q = p as Problem;
		return Math.max(String(q.a).length, String(q.b).length, String(q.result).length);
	}

	const hDigits = $derived(Math.max(2, ...problems.map(maxDigits)));
</script>

<div class="sheet-container">
	{#each pages as page, pageIndex}
		<section class="page" class:answer-page={showAnswers} data-testid={showAnswers ? 'answer-page' : 'sheet-page'}>
			<header class="page-header">
				<h1>{title}{showAnswers ? ` - ${t.answerTitle}` : ''}</h1>
				{#if subtitle}
					<div class="subtitle">{subtitle}{showAnswers ? '' : ' · 细心算，你能行！'}{pages.length > 1 ? ` · 第 ${pageIndex + 1}/${pages.length} 张` : ''}</div>
				{/if}
				{#if !showAnswers}
					<div class="info-row">
						<div class="info-item">
							<span class="info-label">{t.name}</span>
							{#if studentName}
								<span class="info-value">{studentName}</span>
							{:else}
								<span class="info-line"></span>
							{/if}
						</div>
						{#if showDate}
							<div class="info-item">
								<span class="info-label">{t.date}</span>
								<span class="info-value">{formatDate()}</span>
							</div>
						{/if}
						<div class="info-item">
							<span class="info-label">{t.score}</span>
							<span class="info-line short"></span>
						</div>
					</div>
				{/if}
			</header>

			<div
				class="grid"
				class:vertical
				class:cols-2={!vertical && columns === 2}
				class:cols-3={!vertical && columns === 3}
				style="--cols: {columns}; --rows: {rows}; --digits: {hDigits};"
				use:fitSheetText={`${columns}|${showAnswers}|${vertical}|${page.map((p) => tokens(p).map((t) => t.v).join('')).join('¦')}`}
			>
				{#each page as problem, idx}
					{@const n = pageIndex * perPage + idx + 1}
					{@const vp = vertical ? asVertical(problem) : null}
					{#if vp}
						{@const len = Math.max(String(vp.a).length, String(vp.b).length, String(vp.result).length)}
						<div class="cell v-cell" data-testid="problem">
							<span class="problem-number">{n}.</span>
							{#if vp.op === 'div'}
								{@const dd = vcell(vp.a, vp.blank === 'first')}
								{@const dv = vcell(vp.b, vp.blank === 'second')}
								{@const qq = vcell(vp.result, vp.blank === 'result')}
								<div class="ldiv" style="--len: {len}">
									<div class="ld-q"><span class={qq.cls}>{qq.text}</span></div>
									<div class="ld-body">
										<span class="ld-divisor"><span class={dv.cls}>{dv.text}</span></span>
										<span class="ld-dividend"><span class={dd.cls}>{dd.text}</span></span>
									</div>
								</div>
							{:else}
								{@const top = vcell(vp.a, vp.blank === 'first')}
								{@const mid = vcell(vp.b, vp.blank === 'second')}
								{@const bot = vcell(vp.result, vp.blank === 'result')}
								<div class="vcalc" style="--len: {len}">
									<div class="v-row"><span class="v-num {top.cls}">{top.text}</span></div>
									<div class="v-row"><span class="v-op">{OP_SYMBOLS[vp.op]}</span><span class="v-num {mid.cls}">{mid.text}</span></div>
									<div class="v-line"></div>
									<div class="v-row"><span class="v-num {bot.cls}">{bot.text}</span></div>
								</div>
							{/if}
						</div>
					{:else}
						{@const toks = tokens(problem)}
						{@const cmpAligned = isCompare(problem)}
						{@const aligned = !cmpAligned}
						<div class="cell h-cell" data-testid="problem">
							<span class="line" class:aligned class:cmp-aligned={cmpAligned} class:long={isChain(problem) || isRemainder(problem)} data-testid="problem-line">
								<span class="problem-number">{n}.</span>{#each toks as tk}<span class="tk tk-{tk.k}" data-tk={tk.k}>{tk.v}</span>{/each}
							</span>
						</div>
					{/if}
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.sheet-container {
		font-family: var(--font-fun);
		font-synthesis-weight: none;
		zoom: var(--sheet-zoom, 1);
	}

	/* 一页 = 一张 A4（屏幕预览、浏览器打印、PDF 导出完全一致） */
	.page {
		width: 210mm;
		height: 297mm;
		padding: var(--s-page-pad);
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--s-page-bg);
		margin: 0 auto var(--s-page-gap);
		box-shadow: var(--s-page-shadow);
		border-radius: var(--s-page-radius);
		break-inside: avoid;
		page-break-inside: avoid;
		position: relative;
	}

	/* 主题装饰：细边框（画在页边距里，不占布局）+ 右下角小图标；打印时同样保留（浅色、省墨） */
	.page::before {
		content: '';
		position: absolute;
		inset: var(--s-frame-inset);
		border: var(--s-frame);
		border-radius: var(--s-frame-radius);
		pointer-events: none;
	}
	.page::after {
		content: var(--s-corner);
		position: absolute;
		right: 8mm;
		bottom: calc(var(--s-frame-inset) - 2.6mm);
		height: 5.2mm;
		padding: 0 1.5mm;
		font-size: 4.2mm;
		line-height: 5.2mm;
		background: var(--s-corner-bg);
		pointer-events: none;
	}

	.page-header {
		flex: 0 0 auto;
		height: 30mm;
		box-sizing: border-box;
		text-align: center;
		padding: 2.5mm 3mm 0;
		overflow: hidden;
		background: var(--s-header-bg);
		border-radius: var(--s-header-radius);
	}

	.page-header h1 {
		font-size: var(--s-title-size);
		line-height: 1.25;
		font-weight: var(--s-title-weight, 700);
		font-family: var(--s-title-font, inherit);
		margin: 0 0 1.5mm;
		color: var(--s-title-fg);
		text-shadow: var(--s-title-shadow);
		letter-spacing: var(--s-title-ls);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.page-header h1::before {
		content: var(--s-title-before);
	}
	.page-header h1::after {
		content: var(--s-title-after);
	}

	.subtitle {
		font-size: var(--s-sub-size);
		color: var(--s-sub-fg);
		margin-bottom: 2mm;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.info-row {
		display: flex;
		justify-content: center;
		gap: var(--s-info-gap, 2.5rem);
		font-size: var(--s-info-size);
		color: var(--s-info-fg);
	}
	.info-item {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.info-label {
		color: var(--s-info-label);
		font-weight: 600;
	}
	.info-line {
		display: inline-block;
		width: var(--s-info-line-w);
		border-bottom: var(--s-info-line);
	}
	.info-line.short {
		width: var(--s-info-line-w-short);
	}
	.info-value {
		color: var(--s-info-value);
		font-weight: 600;
	}

	/* 题目网格：固定行数，均匀铺满整页剩余高度 */
	.grid {
		flex: 1 1 auto;
		min-height: 0;
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
		column-gap: var(--s-col-gap);
		border-top: var(--s-grid-rule);
		padding-top: 2mm;
	}

	.cell {
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		/* 行底细线用 inset 阴影画，不占布局尺寸（不影响行高 / 字号计算） */
		box-shadow: var(--s-cell-rule, none);
		break-inside: avoid;
		page-break-inside: avoid;
	}

	.h-cell {
		display: flex;
		align-items: center;
		padding: 0 1mm;
	}

	.line {
		display: inline-block;
		white-space: nowrap;
		/* --fit-line-size 由 fitSheetText 在整页需要缩小时统一注入 */
		font-size: var(--fit-line-size, var(--s-line-3));
		line-height: 1.3;
		color: var(--s-ink);
		font-variant-numeric: tabular-nums;
	}
	.cols-2 .line {
		font-size: var(--fit-line-size, var(--s-line-2));
	}
	.cols-3 .line.long {
		font-size: var(--fit-line-size, var(--s-line-3-long));
	}
	.cols-2 .line.long {
		font-size: var(--fit-line-size, var(--s-line-2-long));
	}

	.problem-number {
		display: inline-block;
		color: var(--s-qno);
		width: 2.75em;
		min-width: 2.75em;
		text-align: right;
		margin-right: 0.35em;
		font-weight: 700;
		font-size: 0.85em;
		box-sizing: border-box;
	}

	.tk {
		display: inline-block;
		text-align: center;
		box-sizing: border-box;
		vertical-align: baseline;
	}
	.tk-num {
		color: var(--s-num);
		font-weight: 600;
	}
	.tk-op {
		color: var(--s-op);
		font-weight: 700;
		margin: 0 0.3em;
	}
	.tk-blank {
		color: var(--s-blank);
		font-weight: 600;
	}
	.tk-ans {
		color: var(--s-ans);
		font-weight: 700;
	}
	.tk-sep {
		color: var(--s-sep);
		margin: 0 0.35em;
		letter-spacing: -0.05em;
	}
	.tk-cmp {
		color: var(--s-cmp);
		font-weight: 700;
		font-size: 1.15em;
		margin: 0 0.5em;
	}
	.tk-ans:not(:first-child):not(:last-child) {
		margin: 0 0.25em;
	}

	/*
	 * 横式对齐：数字/填空/答案共用「digits*ch 内容 + 两侧 padding」；
	 * 括号画在 padding 里（left:0 / right:0），不再探出槽外压题号或运算符。
	 * 所有槽同等 padding，同列「=」仍齐。保留 --fit-line-size。
	 */
	.aligned .tk-num,
	.aligned .tk-blank,
	.aligned .tk-ans {
		/* content-box：padding 加在 width 外，三槽一致故等号仍同列 */
		box-sizing: content-box;
		width: calc(var(--digits) * 1ch + 0.15em);
		min-width: calc(var(--digits) * 1ch + 0.15em);
		padding-left: 0.7em;
		padding-right: 0.7em;
		margin: 0;
		text-align: right;
		font-family: var(--font-num);
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		position: relative;
	}
	.aligned .tk-blank,
	.aligned .tk-ans {
		text-align: center;
	}
	/* 括号落在本槽左右 padding 内，不侵占题号 / 运算符 */
	.aligned .tk-blank::before,
	.aligned .tk-ans::before {
		content: '(';
		position: absolute;
		left: 0;
		right: auto;
		top: 0;
		width: 0.7em;
		text-align: center;
		color: var(--s-paren);
		font-weight: 600;
		pointer-events: none;
	}
	.aligned .tk-blank::after,
	.aligned .tk-ans::after {
		content: ')';
		position: absolute;
		right: 0;
		left: auto;
		top: 0;
		width: 0.7em;
		text-align: center;
		color: var(--s-paren);
		font-weight: 600;
		pointer-events: none;
	}
	.aligned .tk-ans::before,
	.aligned .tk-ans::after {
		color: var(--s-ans);
	}
	.aligned .problem-number {
		/* 括号已在槽内，题号只需常规间距 */
		margin-right: 0.55em;
	}
	.aligned .tk-ans:not(:first-child):not(:last-child) {
		margin: 0;
	}
	.aligned .tk-op {
		width: 1.45em;
		min-width: 1.45em;
		margin: 0;
		text-align: center;
	}
	.aligned .tk-sep {
		width: 1.6em;
		min-width: 1.6em;
		margin: 0;
		text-align: center;
		letter-spacing: 0;
	}

	/* 比较大小：左右算式等宽槽，○ / 答案居中对齐 */
	.cmp-aligned .tk-num {
		width: calc(var(--digits) * 0.62em + 0.5em);
		min-width: calc(var(--digits) * 0.62em + 0.5em);
		font-variant-numeric: tabular-nums;
	}
	.cmp-aligned .tk-num:first-of-type {
		text-align: right;
	}
	.cmp-aligned .tk-num:last-of-type {
		text-align: left;
	}
	.cmp-aligned .tk-cmp,
	.cmp-aligned .tk-ans {
		width: 1.6em;
		min-width: 1.6em;
		margin: 0 0.35em;
		text-align: center;
	}

	/* 竖式：固定字符宽右齐，个位列对齐；去掉 letter-spacing 以免破坏等宽 */
	.v-cell {
		display: flex;
		align-items: flex-start;
		gap: 1mm;
		padding-top: 3mm;
		font-family: var(--font-num);
		font-size: var(--s-v-size);
		font-variant-numeric: tabular-nums;
	}
	.v-cell .problem-number {
		font-family: var(--font-fun);
		font-size: var(--s-v-qno-size);
		min-width: 1.8em;
		margin-top: 0.2em;
	}
	.vcalc {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: calc((var(--len) + 1.6) * 1ch);
		color: var(--s-ink);
		font-weight: 600;
	}
	.v-row {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		height: 1.45em;
	}
	.v-op {
		width: 1.2ch;
		min-width: 1.2ch;
		text-align: center;
		margin-right: auto;
		color: var(--s-op);
	}
	.v-num {
		display: inline-block;
		width: calc(var(--len) * 1ch);
		min-width: calc(var(--len) * 1ch);
		text-align: right;
		letter-spacing: 0;
		box-sizing: border-box;
	}
	.v-line {
		height: 2px;
		background: var(--s-rule-ink);
		margin: 0.15em 0 0.25em;
	}
	.v-box {
		width: calc(var(--len) * 1ch);
		min-width: calc(var(--len) * 1ch);
		height: 1.2em;
		border: 1.5px dashed var(--s-vbox);
		border-radius: 4px;
		box-sizing: border-box;
	}
	.v-ans {
		color: var(--s-ans);
	}

	/* 除法竖式（长除法） */
	.ldiv {
		display: inline-flex;
		flex-direction: column;
		font-weight: 600;
		color: var(--s-ink);
		font-variant-numeric: tabular-nums;
	}
	.ld-q {
		align-self: flex-end;
		width: calc(var(--len) * 1ch + 0.6em);
		min-width: calc(var(--len) * 1ch + 0.6em);
		text-align: right;
		height: 1.45em;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding-right: 0.3em;
		box-sizing: border-box;
	}
	.ld-q > span {
		display: inline-block;
		width: calc(var(--len) * 1ch);
		min-width: calc(var(--len) * 1ch);
		text-align: right;
		box-sizing: border-box;
	}
	.ld-body {
		display: flex;
		align-items: center;
	}
	.ld-divisor {
		padding-right: 0.2em;
	}
	.ld-divisor > span,
	.ld-dividend > span {
		display: inline-block;
		width: calc(var(--len) * 1ch);
		min-width: calc(var(--len) * 1ch);
		text-align: right;
		box-sizing: border-box;
	}
	.ld-dividend {
		border-top: 2px solid var(--s-rule-ink);
		border-left: 2px solid var(--s-rule-ink);
		border-top-left-radius: 0.6em 1em;
		padding: 0.15em 0.3em 0.1em 0.5em;
	}

	@page {
		size: A4;
		margin: 0;
	}

	@media print {
		.sheet-container {
			zoom: 1 !important;
		}
		/* 每页之间强制分页，但最后一页之后不再分页（避免多出一张白纸） */
		.page + .page {
			break-before: page;
			page-break-before: always;
		}
		:global(.sheet-container + .sheet-container) .page:first-child {
			break-before: page;
			page-break-before: always;
		}
		.page {
			margin: 0 !important;
			box-shadow: none !important;
			border-radius: 0 !important;
			break-after: auto;
			page-break-after: auto;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
	}
</style>
