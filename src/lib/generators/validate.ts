import type { ExerciseConfig, Operation } from '$lib/types';
import { OP_NAMES } from '$lib/types';
import { getLayout } from '$lib/config/layout';
import { isOpFeasible } from './rules';
import { isRemainderFeasible, REMAINDER_MIN_DIVIDEND } from './remainder';
import { generateChainProblem } from './chain';
import { seededRng } from './random';

export type ConfigField = 'rangeMin' | 'rangeMax' | 'range' | 'operations' | 'totalCount' | 'countPerPage';

export interface ValidationIssue {
	field: ConfigField;
	message: string;
}

export const RANGE_MIN_LIMIT = 0;
export const RANGE_MAX_LIMIT = 9999;
export const TOTAL_COUNT_LIMIT = 200;

export function usesRange(mode: ExerciseConfig['problemMode']): boolean {
	return mode !== 'makeTarget';
}

export function usesOperations(mode: ExerciseConfig['problemMode']): boolean {
	return mode === 'normal' || mode === 'chain' || mode === 'compare';
}

function isInt(v: unknown): v is number {
	return typeof v === 'number' && Number.isInteger(v);
}

function intIssue(v: unknown, label: string): string | null {
	if (v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))) return `请填写${label}`;
	if (typeof v !== 'number' || !Number.isFinite(v)) return `${label}必须是数字`;
	if (!Number.isInteger(v)) return `${label}必须是整数`;
	return null;
}

/**
 * 校验配置。返回空数组表示可以出题；否则每条问题都对应一个输入框，显示在输入框下方。
 */
export function validateConfig(config: ExerciseConfig): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const mode = config.problemMode;

	// 题量
	const tc = intIssue(config.totalCount, '总题数');
	if (tc) issues.push({ field: 'totalCount', message: tc });
	else if (config.totalCount < 1 || config.totalCount > TOTAL_COUNT_LIMIT)
		issues.push({ field: 'totalCount', message: `总题数需在 1～${TOTAL_COUNT_LIMIT} 之间` });

	const layout = getLayout(config);
	const cp = intIssue(config.countPerPage, '每页题数');
	if (cp) issues.push({ field: 'countPerPage', message: cp });
	else if (config.countPerPage < 1 || config.countPerPage > layout.maxPerPage)
		issues.push({
			field: 'countPerPage',
			message: `当前版式每页最多 ${layout.maxPerPage} 道（一页 A4 纸），请填 1～${layout.maxPerPage}`
		});

	if (usesOperations(mode) && (!config.operations || config.operations.length === 0)) {
		issues.push({ field: 'operations', message: '请至少选择一种运算' });
	}

	if (!usesRange(mode)) return issues;

	const { min, max } = config.range ?? ({} as { min: number; max: number });
	const minErr = intIssue(min, '最小值');
	const maxErr = intIssue(max, '最大值');
	if (minErr) issues.push({ field: 'rangeMin', message: minErr });
	else if (min < RANGE_MIN_LIMIT || min > RANGE_MAX_LIMIT)
		issues.push({ field: 'rangeMin', message: `最小值需在 ${RANGE_MIN_LIMIT}～${RANGE_MAX_LIMIT} 之间` });
	if (maxErr) issues.push({ field: 'rangeMax', message: maxErr });
	else if (max < 1 || max > RANGE_MAX_LIMIT)
		issues.push({ field: 'rangeMax', message: `最大值需在 1～${RANGE_MAX_LIMIT} 之间` });
	if (issues.some((i) => i.field === 'rangeMin' || i.field === 'rangeMax')) return issues;

	if (min >= max) {
		issues.push({ field: 'range', message: `最小值（${min}）必须小于最大值（${max}）` });
		return issues;
	}

	const range = { min, max, tableMulDiv: !!config.tableMulDiv };
	if (mode === 'remainder') {
		if (!isRemainderFeasible(min, max))
			issues.push({ field: 'range', message: `有余数除法的被除数至少是 ${REMAINDER_MIN_DIVIDEND}，请调大最大值` });
		return issues;
	}

	const ops = (config.operations ?? []) as Operation[];
	if (mode === 'normal' || mode === 'compare') {
		for (const op of ops) {
			if (!isOpFeasible(op, range)) issues.push({ field: 'range', message: infeasibleMessage(op, min, max, !!config.tableMulDiv) });
		}
	} else if (mode === 'chain' && ops.length) {
		const rng = seededRng(12345);
		let ok = false;
		for (let i = 0; i < 3000 && !ok; i++) {
			ok = generateChainProblem(min, max, ops, config.chainLength, rng, !!config.tableMulDiv) !== null;
		}
		if (!ok)
			issues.push({
				field: 'range',
				message: `在 ${min}～${max} 内凑不出 ${config.chainLength} 个数的连续运算（中间结果不能超过最大值），请调小最小值或调大最大值`
			});
	}
	return issues;
}

function infeasibleMessage(op: Operation, min: number, max: number, table: boolean): string {
	const name = OP_NAMES[op];
	if (op === 'add' || op === 'sub')
		return `${name}：两个数都不小于 ${min} 时，结果会超过 ${max}。请把最小值调到 ${Math.floor(max / 2)} 以下或调大最大值`;
	return `${name}：${min}～${max} 内找不到${table ? '表内' : ''}${op === 'mul' ? '积' : '被除数'}合适的题，请扩大范围${table ? '或取消「表内乘除」' : ''}`;
}
