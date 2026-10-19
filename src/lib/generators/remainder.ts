import type { RemainderProblem } from '$lib/types';
import type { Rng } from './random';
import { defaultRng, randInt } from './random';
import { fillProblems, type FillResult } from './fill';

/** 有余数除法的除数范围（表内：2～9） */
export const REMAINDER_DIVISOR_MIN = 2;
export const REMAINDER_DIVISOR_MAX = 9;

/** 被除数的最小可能值（3 ÷ 2 = 1 … 1） */
export const REMAINDER_MIN_DIVIDEND = 3;

export function isRemainderFeasible(min: number, max: number): boolean {
	return Number.isInteger(min) && Number.isInteger(max) && max >= Math.max(min, REMAINDER_MIN_DIVIDEND);
}

/**
 * 生成一道有余数除法题目
 * 规则：被除数在 [min, max] 内；除数 2～9 且小于被除数；余数在 1～除数-1 之间；商 ≥ 1。
 */
export function generateRemainderProblem(
	min: number,
	max: number,
	blank: 'quotient' | 'remainder' | 'both' = 'quotient',
	rng: Rng = defaultRng
): RemainderProblem | null {
	if (!isRemainderFeasible(min, max)) return null;
	const lo = Math.max(min, REMAINDER_MIN_DIVIDEND);
	for (let i = 0; i < 100; i++) {
		const dividend = randInt(rng, lo, max)!;
		const divisor = randInt(rng, REMAINDER_DIVISOR_MIN, Math.min(REMAINDER_DIVISOR_MAX, dividend - 1));
		if (divisor === null) continue;
		const remainder = dividend % divisor;
		if (remainder === 0) continue;
		return {
			type: 'remainder',
			dividend,
			divisor,
			quotient: Math.floor(dividend / divisor),
			remainder,
			blank
		};
	}
	return null;
}

export function generateRemainderProblemsDetailed(
	min: number,
	max: number,
	count: number,
	blank: 'quotient' | 'remainder' | 'both' = 'quotient',
	rng: Rng = defaultRng
): FillResult<RemainderProblem> {
	return fillProblems(
		count,
		() => generateRemainderProblem(min, max, blank, rng),
		(p) => `${p.dividend}÷${p.divisor}`,
		rng
	);
}

/**
 * 生成多道有余数除法题目
 */
export function generateRemainderProblems(
	min: number,
	max: number,
	count: number,
	blank: 'quotient' | 'remainder' | 'both' = 'quotient',
	rng: Rng = defaultRng
): RemainderProblem[] {
	return generateRemainderProblemsDetailed(min, max, count, blank, rng).problems;
}
