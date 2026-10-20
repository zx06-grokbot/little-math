import type { ExerciseConfig, Operation } from '#lib/types.js';
import { OP_NAMES } from '#lib/types.js';
import { getLayout } from '#lib/config/layout.js';
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
	if (v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))) return `请写上${label}`;
	if (typeof v !== 'number' || !Number.isFinite(v)) return `${label}要写数字哦`;
	if (!Number.isInteger(v)) return `${label}要写整数哦`;
	return null;
}

/**
 * 校验配置。返回空数组表示可以出题；否则每条问题都对应一个输入框，显示在输入框下方。
 */
export function validateConfig(config: ExerciseConfig): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const mode = config.problemMode;

	// 题量
	const tc = intIssue(config.totalCount, '一共几道');
	if (tc) issues.push({ field: 'totalCount', message: tc });
	else if (config.totalCount < 1 || config.totalCount > TOTAL_COUNT_LIMIT)
		issues.push({ field: 'totalCount', message: `一共几道：写 1～${TOTAL_COUNT_LIMIT}` });

	const layout = getLayout(config);
	const cp = intIssue(config.countPerPage, '一张几道');
	if (cp) issues.push({ field: 'countPerPage', message: cp });
	else if (config.countPerPage < 1 || config.countPerPage > layout.maxPerPage)
		issues.push({
			field: 'countPerPage',
			message: `一张纸最多放 ${layout.maxPerPage} 道，写 1～${layout.maxPerPage} 吧`
		});

	if (usesOperations(mode) && (!config.operations || config.operations.length === 0)) {
		issues.push({ field: 'operations', message: '至少选一种题哦' });
	}

	if (!usesRange(mode)) return issues;

	const { min, max } = config.range ?? ({} as { min: number; max: number });
	const minErr = intIssue(min, '最小的数');
	const maxErr = intIssue(max, '最大的数');
	if (minErr) issues.push({ field: 'rangeMin', message: minErr });
	else if (min < RANGE_MIN_LIMIT || min > RANGE_MAX_LIMIT)
		issues.push({ field: 'rangeMin', message: `最小的数：写 ${RANGE_MIN_LIMIT}～${RANGE_MAX_LIMIT}` });
	if (maxErr) issues.push({ field: 'rangeMax', message: maxErr });
	else if (max < 1 || max > RANGE_MAX_LIMIT)
		issues.push({ field: 'rangeMax', message: `最大的数：写 1～${RANGE_MAX_LIMIT}` });
	if (issues.some((i) => i.field === 'rangeMin' || i.field === 'rangeMax')) return issues;

	if (min >= max) {
		issues.push({ field: 'range', message: `最小的数（${min}）要比最大的数（${max}）小哦` });
		return issues;
	}

	const range = { min, max, tableMulDiv: !!config.tableMulDiv };
	if (mode === 'remainder') {
		if (!isRemainderFeasible(min, max))
			issues.push({ field: 'range', message: `最大的数至少写 ${REMAINDER_MIN_DIVIDEND} 才能出有余数的题` });
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
				message: `${min}～${max} 里凑不出 ${config.chainLength} 个数连着算，把最小的数改小或最大的数改大试试`
			});
	}
	return issues;
}

function infeasibleMessage(op: Operation, min: number, max: number, table: boolean): string {
	const name = OP_NAMES[op];
	if (op === 'add' || op === 'sub')
		return `${name}：两个数都不小于 ${min} 时，答案会超过 ${max}。把最小的数改到 ${Math.floor(max / 2)} 以下，或把最大的数改大`;
	return `${name}：${min}～${max} 里出不了${table ? '表内' : ''}${name}题，把范围放大一点${table ? '，或去掉「只出表内」' : ''}`;
}
