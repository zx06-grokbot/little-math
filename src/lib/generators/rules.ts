import type { Operation } from '#lib/types.js';
import type { Rng } from './random';
import { randInt } from './random';

/**
 * 出题范围规则（所有模式共用）
 *
 * 加法 a + b = c：a、b、c 都在 [最小值, 最大值] 内（即和不超过最大值）。
 * 减法 a - b = c：a、b、c 都在 [最小值, 最大值] 内（结果不为负）。
 * 乘法 a × b = c：积 c 在 [最小值, 最大值] 内；因数不小于 2（若 最小值² ≤ 最大值，则因数也不小于最小值）。
 * 除法 a ÷ b = c：被除数 a 在 [最小值, 最大值] 内且整除；除数、商的规则同乘法的因数。
 * 「表内乘除」选项：因数 / 除数 / 商不超过 9。
 * 0 和 1 这类“送分”运算（+0、-0、结果为 0、×1、×0、÷1、商为 1）只在范围包含它们时偶尔出现（约 8%）。
 */
export interface RangeOptions {
	min: number;
	max: number;
	/** 乘除只出表内（因数 ≤ 9） */
	tableMulDiv?: boolean;
}

export interface BinaryExpr {
	a: number;
	b: number;
	op: Operation;
	result: number;
}

/** “送分题”出现的概率 */
export const TRIVIAL_PROB = 0.08;

/** 乘除因数的下限：最小值² ≤ 最大值 时取最小值，否则取 2（至少 2）。 */
export function factorLow(r: RangeOptions): number {
	return r.min >= 2 && r.min * r.min <= r.max ? r.min : 2;
}

/** 乘除因数的上限 */
export function factorHigh(r: RangeOptions): number {
	return r.tableMulDiv ? Math.min(9, r.max) : r.max;
}

/** 加减法中普通运算数的下限（排除 0） */
function addLow(r: RangeOptions): number {
	return Math.max(r.min, 1);
}

// ---------- 加法 ----------
function coreAddFeasible(r: RangeOptions): boolean {
	const lo = addLow(r);
	return 2 * lo <= r.max;
}
function sampleCoreAdd(r: RangeOptions, rng: Rng): BinaryExpr | null {
	const lo = addLow(r);
	for (let i = 0; i < 50; i++) {
		const a = randInt(rng, lo, r.max - lo);
		const b = randInt(rng, lo, r.max - lo);
		if (a === null || b === null) return null;
		if (a + b <= r.max) return { a, b, op: 'add', result: a + b };
	}
	return null;
}
function trivialAddFeasible(r: RangeOptions): boolean {
	return r.min === 0 && r.max >= 0;
}
function sampleTrivialAdd(r: RangeOptions, rng: Rng): BinaryExpr | null {
	if (!trivialAddFeasible(r)) return null;
	const x = randInt(rng, 0, r.max)!;
	return rng() < 0.5 ? { a: 0, b: x, op: 'add', result: x } : { a: x, b: 0, op: 'add', result: x };
}

// ---------- 减法 ----------
function sampleCoreSub(r: RangeOptions, rng: Rng): BinaryExpr | null {
	const e = sampleCoreAdd(r, rng);
	if (!e) return null;
	// a - b = c 与 b + c = a 一一对应
	return { a: e.result, b: e.a, op: 'sub', result: e.b };
}
function sampleTrivialSub(r: RangeOptions, rng: Rng): BinaryExpr | null {
	if (r.min !== 0) return null;
	const x = randInt(rng, 0, r.max)!;
	return rng() < 0.5 ? { a: x, b: x, op: 'sub', result: 0 } : { a: x, b: 0, op: 'sub', result: x };
}

// ---------- 乘法 / 除法 ----------
/** 每个因数 a 对应可选的 b 区间 */
function mulRows(r: RangeOptions): { a: number; bLo: number; bHi: number; n: number }[] {
	const lo = factorLow(r);
	const hi = factorHigh(r);
	const rows: { a: number; bLo: number; bHi: number; n: number }[] = [];
	for (let a = lo; a <= hi && a * lo <= r.max; a++) {
		const bLo = Math.max(lo, Math.ceil(r.min / a));
		const bHi = Math.min(hi, Math.floor(r.max / a));
		if (bHi >= bLo) rows.push({ a, bLo, bHi, n: bHi - bLo + 1 });
	}
	return rows;
}

const rowCache = new Map<string, { rows: ReturnType<typeof mulRows>; total: number }>();
function getMulRows(r: RangeOptions) {
	const k = `${r.min}|${r.max}|${r.tableMulDiv ? 1 : 0}`;
	let v = rowCache.get(k);
	if (!v) {
		const rows = mulRows(r);
		v = { rows, total: rows.reduce((s, x) => s + x.n, 0) };
		if (rowCache.size > 64) rowCache.clear();
		rowCache.set(k, v);
	}
	return v;
}

/** 在所有合法因数对中均匀抽取一对 */
function sampleFactorPair(r: RangeOptions, rng: Rng): [number, number] | null {
	const { rows, total } = getMulRows(r);
	if (total === 0) return null;
	let k = Math.floor(rng() * total);
	for (const row of rows) {
		if (k < row.n) return [row.a, row.bLo + k];
		k -= row.n;
	}
	return null;
}

function sampleCoreMul(r: RangeOptions, rng: Rng): BinaryExpr | null {
	const p = sampleFactorPair(r, rng);
	if (!p) return null;
	return { a: p[0], b: p[1], op: 'mul', result: p[0] * p[1] };
}
function sampleCoreDiv(r: RangeOptions, rng: Rng): BinaryExpr | null {
	const p = sampleFactorPair(r, rng);
	if (!p) return null;
	// 除数 p[0]，商 p[1]
	return { a: p[0] * p[1], b: p[0], op: 'div', result: p[1] };
}

function sampleTrivialMul(r: RangeOptions, rng: Rng): BinaryExpr | null {
	const hi = factorHigh(r);
	const options: BinaryExpr[] = [];
	// ×1：另一个因数就是积，需在范围内
	const x = randInt(rng, Math.max(r.min, 1), hi);
	if (r.min <= 1 && x !== null) options.push(rng() < 0.5 ? { a: x, b: 1, op: 'mul', result: x } : { a: 1, b: x, op: 'mul', result: x });
	// ×0：积为 0，需最小值为 0
	const y = randInt(rng, 1, hi);
	if (r.min === 0 && y !== null) options.push(rng() < 0.5 ? { a: y, b: 0, op: 'mul', result: 0 } : { a: 0, b: y, op: 'mul', result: 0 });
	return options.length ? options[Math.floor(rng() * options.length)] : null;
}
function sampleTrivialDiv(r: RangeOptions, rng: Rng): BinaryExpr | null {
	const hi = factorHigh(r);
	const options: BinaryExpr[] = [];
	if (r.min <= 1) {
		// ÷1
		const q = randInt(rng, Math.max(r.min, 1), hi);
		if (q !== null) options.push({ a: q, b: 1, op: 'div', result: q });
		// 商为 1
		const d = randInt(rng, Math.max(r.min, 2), hi);
		if (d !== null) options.push({ a: d, b: d, op: 'div', result: 1 });
	}
	if (r.min === 0) {
		const d = randInt(rng, 1, hi);
		if (d !== null) options.push({ a: 0, b: d, op: 'div', result: 0 });
	}
	return options.length ? options[Math.floor(rng() * options.length)] : null;
}

const CORE: Record<Operation, (r: RangeOptions, rng: Rng) => BinaryExpr | null> = {
	add: sampleCoreAdd,
	sub: sampleCoreSub,
	mul: sampleCoreMul,
	div: sampleCoreDiv
};
const TRIVIAL: Record<Operation, (r: RangeOptions, rng: Rng) => BinaryExpr | null> = {
	add: sampleTrivialAdd,
	sub: sampleTrivialSub,
	mul: sampleTrivialMul,
	div: sampleTrivialDiv
};

export function isCoreFeasible(op: Operation, r: RangeOptions): boolean {
	if (op === 'add' || op === 'sub') return coreAddFeasible(r);
	return getMulRows(r).total > 0;
}

/** 当前范围能否出这种运算的题 */
export function isOpFeasible(op: Operation, r: RangeOptions): boolean {
	if (!(Number.isInteger(r.min) && Number.isInteger(r.max)) || r.min < 0 || r.max < r.min) return false;
	if (isCoreFeasible(op, r)) return true;
	// 只剩送分题时也算可出（例如 0～3 的乘法）
	for (let i = 0; i < 20; i++) {
		if (TRIVIAL[op](r, Math.random) !== null) return true;
	}
	return false;
}

/** 按范围规则随机出一道两数运算 */
export function sampleBinary(op: Operation, r: RangeOptions, rng: Rng): BinaryExpr | null {
	const core = isCoreFeasible(op, r);
	if (!core || rng() < TRIVIAL_PROB) {
		const t = TRIVIAL[op](r, rng);
		if (t) return t;
	}
	return core ? CORE[op](r, rng) : null;
}

/** 构造一个结果恰好为 target 的算式（比较大小出「=」时使用）；不存在则返回 null */
export function sampleBinaryWithResult(
	op: Operation,
	r: RangeOptions,
	target: number,
	rng: Rng
): BinaryExpr | null {
	const cands: BinaryExpr[] = [];
	const lo = addLow(r);
	if (op === 'add') {
		if (target > r.max || target < r.min) return null;
		const a = randInt(rng, lo, target - lo);
		if (a !== null) cands.push({ a, b: target - a, op, result: target });
	} else if (op === 'sub') {
		if (target < Math.max(r.min, 1) || target > r.max) return null;
		const b = randInt(rng, lo, r.max - target);
		if (b !== null) cands.push({ a: target + b, b, op, result: target });
	} else if (op === 'mul') {
		if (target < r.min || target > r.max) return null;
		const fl = factorLow(r);
		const fh = factorHigh(r);
		for (let a = fl; a <= fh && a * a <= target; a++) {
			if (target % a === 0 && target / a <= fh && target / a >= fl) {
				cands.push({ a, b: target / a, op, result: target });
				cands.push({ a: target / a, b: a, op, result: target });
			}
		}
	} else {
		const fl = factorLow(r);
		const fh = factorHigh(r);
		if (target < fl || target > fh) return null;
		for (let d = fl; d <= fh && d * target <= r.max; d++) {
			if (d * target >= r.min) cands.push({ a: d * target, b: d, op, result: target });
		}
	}
	return cands.length ? cands[Math.floor(rng() * cands.length)] : null;
}

/** 规则说明（显示在界面上） */
export const RANGE_RULE_TEXT: Record<Operation, string> = {
	add: '加法：答案不超过最大的数',
	sub: '减法：不会减成负数',
	mul: '乘法：答案在范围里，从 2 开始乘',
	div: '除法：都能除尽，从 2 开始除'
};
