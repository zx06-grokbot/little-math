import type { CompareProblem, CompareSymbol, Operation } from '$lib/types';
import type { Rng } from './random';
import { defaultRng, pick, shuffle } from './random';
import { fillProblems, type FillResult } from './fill';
import { isOpFeasible, sampleBinary, sampleBinaryWithResult, type BinaryExpr, type RangeOptions } from './rules';

export function getCompareSymbol(left: number, right: number): CompareSymbol {
	if (left > right) return '>';
	if (left < right) return '<';
	return '=';
}

const SYMBOLS: CompareSymbol[] = ['<', '>', '='];

function sameExpr(x: BinaryExpr, y: BinaryExpr): boolean {
	return x.a === y.a && x.b === y.b && x.op === y.op;
}

/**
 * 生成一道比较大小题。先随机决定答案（<、>、= 各约 1/3），再构造满足该答案的右边算式，
 * 这样「=」不再几乎不出现。两边算式都遵守 rules.ts 中的范围规则。
 */
export function generateCompareProblem(
	min: number,
	max: number,
	operations: Operation[],
	rng: Rng = defaultRng,
	tableMulDiv = false
): CompareProblem | null {
	const range: RangeOptions = { min, max, tableMulDiv };
	const ops = operations.filter((op) => isOpFeasible(op, range));
	if (!ops.length) return null;
	const want = pick(rng, SYMBOLS);

	for (let outer = 0; outer < 20; outer++) {
		const left = sampleBinary(pick(rng, ops), range, rng);
		if (!left) continue;
		let right: BinaryExpr | null = null;
		if (want === '=') {
			for (const op of shuffle(rng, ops)) {
				for (let k = 0; k < 5 && !right; k++) {
					const c = sampleBinaryWithResult(op, range, left.result, rng);
					if (c && !sameExpr(c, left)) right = c;
				}
				if (right) break;
			}
		} else {
			for (let k = 0; k < 60; k++) {
				const c = sampleBinary(pick(rng, ops), range, rng);
				if (c && getCompareSymbol(left.result, c.result) === want) {
					right = c;
					break;
				}
			}
		}
		if (right) return { type: 'compare', left, right, answer: getCompareSymbol(left.result, right.result) };
	}
	return null;
}

function compareKey(p: CompareProblem): string {
	return `${p.left.a}${p.left.op}${p.left.b}|${p.right.a}${p.right.op}${p.right.b}`;
}

export function generateCompareProblemsDetailed(
	min: number,
	max: number,
	operations: Operation[],
	count: number,
	rng: Rng = defaultRng,
	tableMulDiv = false
): FillResult<CompareProblem> {
	return fillProblems(count, () => generateCompareProblem(min, max, operations, rng, tableMulDiv), compareKey, rng);
}

export function generateCompareProblems(
	min: number,
	max: number,
	operations: Operation[],
	count: number,
	rng: Rng = defaultRng,
	tableMulDiv = false
): CompareProblem[] {
	return generateCompareProblemsDetailed(min, max, operations, count, rng, tableMulDiv).problems;
}
