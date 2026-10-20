import type { ChainProblem, Operation } from '#lib/types.js';
import type { Rng } from './random';
import { defaultRng, pick, randInt, shuffle } from './random';
import { fillProblems, type FillResult } from './fill';
import { factorHigh, type RangeOptions } from './rules';

/**
 * 按「先乘除、后加减，同级从左到右」计算算式。
 * 返回 null 表示出现除以 0。
 */
export function evaluateChain(numbers: number[], ops: Operation[]): number | null {
	// 先把乘除合并成项
	const terms: number[] = [];
	const signs: (1 | -1)[] = [];
	let cur = numbers[0];
	let sign: 1 | -1 = 1;
	for (let i = 0; i < ops.length; i++) {
		const n = numbers[i + 1];
		const op = ops[i];
		if (op === 'mul') cur *= n;
		else if (op === 'div') {
			if (n === 0) return null;
			cur /= n;
		} else {
			terms.push(cur);
			signs.push(sign);
			sign = op === 'add' ? 1 : -1;
			cur = n;
		}
	}
	terms.push(cur);
	signs.push(sign);
	return terms.reduce((s, t, i) => s + signs[i] * t, 0);
}

/**
 * 按运算顺序列出每一步的中间结果（用于校验“中间结果都是 0～最大值 的整数”）。
 */
export function chainSteps(numbers: number[], ops: Operation[]): number[] | null {
	const steps: number[] = [];
	let total = 0;
	let sign: 1 | -1 = 1;
	let cur = numbers[0];
	for (let i = 0; i <= ops.length; i++) {
		const op = ops[i];
		if (op === 'mul' || op === 'div') {
			const n = numbers[i + 1];
			if (op === 'div' && n === 0) return null;
			cur = op === 'mul' ? cur * n : cur / n;
			steps.push(cur);
		} else {
			total += sign * cur;
			if (i > 0) steps.push(total);
			if (op) {
				sign = op === 'add' ? 1 : -1;
				cur = numbers[i + 1];
			}
		}
	}
	return steps;
}

/**
 * 生成一道连续运算题。
 * 规则：
 * - 按先乘除后加减计算（2 + 6 × 3 = 20）。
 * - 每个数不超过最大值；单独参与加减的数不小于最小值（且不为 0）；乘除的因数 / 除数从 2 起（表内乘除时不超过 9）。
 * - 每一步的中间结果和最终结果都是 0～最大值 之间的整数，除法全部整除。
 */
export function generateChainProblem(
	min: number,
	max: number,
	operations: Operation[],
	length: 3 | 4,
	rng: Rng = defaultRng,
	tableMulDiv = false
): ChainProblem | null {
	const range: RangeOptions = { min, max, tableMulDiv };
	if (!operations.length || !(max >= min) || max < 1) return null;
	const n = length === 4 ? 4 : 3;
	const ops: Operation[] = Array.from({ length: n - 1 }, () => pick(rng, operations));
	const numbers: number[] = new Array(n).fill(0);
	// 连续运算里乘除的因数 / 除数统一从 2 起（多个因数相乘时再要求 ≥ 最小值很容易超出最大值）
	const fLo = 2;
	const fHi = factorHigh(range);
	const addLo = Math.max(min, 1);

	let total = 0;
	let i = 0;
	let sign: 1 | -1 = 1;
	while (i < n) {
		let j = i;
		while (j < n - 1 && (ops[j] === 'mul' || ops[j] === 'div')) j++;
		const bound = sign === 1 ? max - total : total;
		let term: number | null = null;
		if (i === j) {
			term = randInt(rng, addLo, bound);
			if (term !== null) numbers[i] = term;
		} else {
			term = buildProductTerm(numbers, ops, i, j, bound, max, fLo, fHi, rng);
		}
		if (term === null) return null;
		total += sign * term;
		if (j < n - 1) sign = ops[j] === 'add' ? 1 : -1;
		i = j + 1;
	}

	const result = evaluateChain(numbers, ops);
	if (result === null || !Number.isInteger(result) || result < 0 || result > max) return null;
	// 结果为 0 的题比较“送分”，降低出现概率
	if (result === 0 && rng() < 0.75) return null;

	const blank: 'result' | number = rng() < 0.8 ? 'result' : Math.floor(rng() * n);
	return { type: 'chain', numbers, ops, result, blank };
}

/**
 * 生成乘除连成的一项 numbers[i..j]，值不超过 bound，每一步中间结果不超过 max。
 * 做法：先选好所有除数 d，再令第一个数 = q × 所有除数之积，
 * 这样从左到右算时每次除法都一定整除（乘法只会增加因子）。
 */
function buildProductTerm(
	numbers: number[],
	ops: Operation[],
	i: number,
	j: number,
	bound: number,
	max: number,
	fLo: number,
	fHi: number,
	rng: Rng
): number | null {
	const termOps = ops.slice(i, j);
	const divCount = termOps.filter((o) => o === 'div').length;
	for (let attempt = 0; attempt < 30; attempt++) {
		// 槽位：q（最终商的部分）和每个除数；随机顺序分配，避免结果总是 2
		const slots = divCount > 0 ? divCount + 1 : 0;
		const values: number[] = new Array(slots).fill(0);
		let assigned = 1;
		let ok = true;
		const order = shuffle(rng, Array.from({ length: slots }, (_, k) => k));
		for (let s = 0; s < order.length; s++) {
			const left = order.length - s - 1;
			const hi = Math.min(fHi, Math.floor(max / (assigned * Math.pow(fLo, left))));
			const v = randInt(rng, fLo, hi);
			if (v === null) {
				ok = false;
				break;
			}
			values[order[s]] = v;
			assigned *= v;
		}
		if (!ok) return null;
		const divisors = values.slice(1);
		let first: number | null;
		if (divCount > 0) {
			first = assigned;
		} else {
			first = randInt(rng, fLo, Math.min(fHi, Math.floor(max / fLo)));
		}
		if (first === null) return null;
		numbers[i] = first;
		let cur = first;
		let di = 0;
		for (let k = i; k < j; k++) {
			if (ops[k] === 'mul') {
				const m = randInt(rng, fLo, Math.min(fHi, Math.floor(max / cur)));
				if (m === null) {
					ok = false;
					break;
				}
				numbers[k + 1] = m;
				cur *= m;
			} else {
				const d = divisors[di++];
				numbers[k + 1] = d;
				cur /= d;
			}
		}
		if (ok && Number.isInteger(cur) && cur <= bound) return cur;
	}
	return null;
}

function chainKey(p: ChainProblem): string {
	return p.numbers.map((x, i) => `${x}${p.ops[i] ?? ''}`).join('');
}

export function generateChainProblemsDetailed(
	min: number,
	max: number,
	operations: Operation[],
	length: 3 | 4,
	count: number,
	rng: Rng = defaultRng,
	tableMulDiv = false
): FillResult<ChainProblem> {
	return fillProblems(
		count,
		() => {
			// 单次失败率可能较高（例如范围很小时），在这里多试几次
			for (let k = 0; k < 30; k++) {
				const p = generateChainProblem(min, max, operations, length, rng, tableMulDiv);
				if (p) return p;
			}
			return null;
		},
		chainKey,
		rng
	);
}

export function generateChainProblems(
	min: number,
	max: number,
	operations: Operation[],
	length: 3 | 4,
	count: number,
	rng: Rng = defaultRng,
	tableMulDiv = false
): ChainProblem[] {
	return generateChainProblemsDetailed(min, max, operations, length, count, rng, tableMulDiv).problems;
}
