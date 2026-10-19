import type { Problem, Operation, BlankPosition, ExerciseConfig } from '$lib/types';
import type { Rng } from './random';
import { defaultRng, pick } from './random';
import { fillProblems, type FillResult } from './fill';
import { isOpFeasible, sampleBinary, type RangeOptions } from './rules';

/**
 * 根据留空比例随机选择留空位置
 */
export function pickBlankPosition(ratio: Record<BlankPosition, number>, rng: Rng = defaultRng): BlankPosition {
	const first = Math.max(0, ratio?.first ?? 0);
	const second = Math.max(0, ratio?.second ?? 0);
	const result = Math.max(0, ratio?.result ?? 0);
	const total = first + second + result;
	if (total <= 0) return 'result';
	const rand = rng() * total;
	if (rand < first) return 'first';
	if (rand < first + second) return 'second';
	return 'result';
}

/** 留空后答案是否唯一（例如 0 × (  ) = 0 不唯一） */
export function isBlankUnique(p: Pick<Problem, 'a' | 'b' | 'op' | 'result'>, blank: BlankPosition): boolean {
	if (blank === 'result') return true;
	if (p.op === 'mul') return blank === 'first' ? p.b !== 0 : p.a !== 0;
	if (p.op === 'div' && blank === 'second') return p.a !== 0;
	return true;
}

function problemKey(p: { a: number; b: number; op: Operation }): string {
	return `${p.a}${p.op}${p.b}`;
}

export function rangeOf(config: Pick<ExerciseConfig, 'range' | 'tableMulDiv'>): RangeOptions {
	return { min: config.range.min, max: config.range.max, tableMulDiv: !!config.tableMulDiv };
}

/**
 * 生成一批普通计算题（含不重复统计）。
 * 规则见 rules.ts：加减法所有数在范围内；乘除法积 / 被除数在范围内。
 */
export function generateProblemsDetailed(config: ExerciseConfig, rng: Rng = defaultRng): FillResult<Problem> {
	const totalCount = config.totalCount > 0 ? Math.floor(config.totalCount) : 20;
	const range = rangeOf(config);
	const ops = (config.operations ?? []).filter((op) => isOpFeasible(op, range));
	if (ops.length === 0) return { problems: [], uniqueCount: 0, requested: totalCount };

	return fillProblems<Problem>(
		totalCount,
		() => {
			const op = pick(rng, ops);
			const e = sampleBinary(op, range, rng);
			if (!e) return null;
			let blank = pickBlankPosition(config.blankRatio, rng);
			if (!isBlankUnique(e, blank)) blank = 'result';
			return { a: e.a, b: e.b, op: e.op, result: e.result, blank };
		},
		problemKey,
		rng
	);
}

/**
 * 生成一批练习题（数量总是等于 totalCount；不同题目不够时会重复补足）
 */
export function generateProblems(config: ExerciseConfig, rng: Rng = defaultRng): Problem[] {
	return generateProblemsDetailed(config, rng).problems;
}
