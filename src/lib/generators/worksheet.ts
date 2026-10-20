import type { AnyProblem, ExerciseConfig, Operation } from '#lib/types.js';
import { OP_NAMES } from '#lib/types.js';
import type { Rng } from './random';
import { defaultRng } from './random';
import { generateProblemsDetailed } from './arithmetic';
import { generateChainProblemsDetailed } from './chain';
import { generateCompareProblemsDetailed } from './compare';
import { generateMakeTargetProblemsDetailed } from './makeTarget';
import { generateRemainderProblemsDetailed } from './remainder';
import { validateConfig, type ValidationIssue } from './validate';

export interface WorksheetResult {
	problems: AnyProblem[];
	requested: number;
	uniqueCount: number;
	/** 不同题目不够、做了重复补足时给用户看的提示 */
	notice: string | null;
	issues: ValidationIssue[];
}

/** 统一出题入口：先校验，再按模式生成；数量总是等于总题数（或在配置无效时为 0）。 */
export function generateWorksheet(config: ExerciseConfig, rng: Rng = defaultRng): WorksheetResult {
	const issues = validateConfig(config);
	if (issues.length) return { problems: [], requested: 0, uniqueCount: 0, notice: null, issues };
	const { min, max } = config.range;
	const table = !!config.tableMulDiv;
	const n = config.totalCount;
	let r: { problems: AnyProblem[]; uniqueCount: number; requested: number };
	switch (config.problemMode) {
		case 'compare':
			r = generateCompareProblemsDetailed(min, max, config.operations, n, rng, table);
			break;
		case 'chain':
			r = generateChainProblemsDetailed(min, max, config.operations, config.chainLength, n, rng, table);
			break;
		case 'makeTarget':
			r = generateMakeTargetProblemsDetailed(config.makeTargetValue, n, rng);
			break;
		case 'remainder':
			r = generateRemainderProblemsDetailed(min, max, n, config.remainderBlank, rng);
			break;
		default:
			r = generateProblemsDetailed(config, rng);
	}
	let notice: string | null = null;
	if (r.problems.length === 0) {
		issues.push({ field: 'range', message: '这样出不了题，把数字范围放大一点或换一种题试试' });
	} else if (r.uniqueCount < r.requested) {
		notice = `只有 ${r.uniqueCount} 道不一样的题，有些题会再出现一次（凑满 ${r.requested} 道）。把数字范围放大，题目会更多。`;
	}
	return { ...r, notice, issues };
}

function rangeText(min: number, max: number): string {
	return min <= 1 ? `${max}以内` : `${min}～${max}`;
}

export function opsText(ops: Operation[]): string {
	const set = new Set(ops);
	const has = (...o: Operation[]) => o.every((x) => set.has(x)) && set.size === o.length;
	if (has('add', 'sub')) return '加减法';
	if (has('mul', 'div')) return '乘除法';
	if (has('add', 'sub', 'mul', 'div')) return '四则混合';
	const order: Operation[] = ['add', 'sub', 'mul', 'div'];
	return order.filter((o) => set.has(o)).map((o) => OP_NAMES[o]).join('、');
}

/** 根据实际设置自动生成标题，保证标题和题目内容一致 */
export function autoTitle(config: ExerciseConfig): string {
	const { min, max } = config.range ?? { min: 0, max: 0 };
	switch (config.problemMode) {
		case 'makeTarget':
			return `凑${config.makeTargetValue}游戏`;
		case 'remainder':
			return `${rangeText(min, max)}有余数除法`;
		case 'chain':
			return `${rangeText(min, max)}${opsText(config.operations)}连着算`;
		case 'compare':
			return `${rangeText(min, max)}${opsText(config.operations)}比大小`;
		default:
			return `${rangeText(min, max)}${opsText(config.operations)}小练习`;
	}
}

/** 卷头副标题：把实际出题设置写在卷面上 */
export function settingsSummary(config: ExerciseConfig): string {
	const { min, max } = config.range;
	switch (config.problemMode) {
		case 'makeTarget':
			return `把两个数凑成 ${config.makeTargetValue}`;
		case 'remainder':
			return `被除数 ${min}～${max} · 除数 2～9 · 记得写余数`;
		case 'chain':
			return `数字 ${min}～${max} · ${config.chainLength} 个数连着算 · 先乘除，再加减`;
		default:
			return `数字 ${min}～${max} · ${opsText(config.operations)}${config.tableMulDiv && config.operations.some((o) => o === 'mul' || o === 'div') ? ' · 表内乘除' : ''}`;
	}
}
