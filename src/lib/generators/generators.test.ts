import { describe, expect, it } from 'vitest';
import type { ExerciseConfig, Operation, Problem, ChainProblem, CompareProblem, RemainderProblem } from '$lib/types';
import { DEFAULT_CONFIG } from '$lib/config/presets';
import { seededRng } from './random';
import { generateProblems, generateProblemsDetailed } from './arithmetic';
import { chainSteps, evaluateChain, generateChainProblems, generateChainProblemsDetailed } from './chain';
import { generateCompareProblems } from './compare';
import { generateRemainderProblems } from './remainder';
import { generateMakeTargetProblemsDetailed } from './makeTarget';
import { factorHigh, factorLow, isOpFeasible } from './rules';
import { validateConfig } from './validate';
import { autoTitle, generateWorksheet } from './worksheet';
import { fillProblems } from './fill';

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);
const ALL_OPS: Operation[] = ['add', 'sub', 'mul', 'div'];
const RANGES: [number, number][] = [
	[0, 10],
	[1, 10],
	[1, 20],
	[0, 20],
	[1, 100],
	[20, 100],
	[50, 100],
	[5, 30],
	[1, 1000],
	[100, 1000]
];

function cfg(over: Partial<ExerciseConfig>): ExerciseConfig {
	return { ...DEFAULT_CONFIG, range: { min: 1, max: 20 }, ...over } as ExerciseConfig;
}

function checkBinary(p: Problem, min: number, max: number, table = false) {
	const { a, b, op, result } = p;
	for (const x of [a, b, result]) expect(Number.isInteger(x)).toBe(true);
	if (op === 'add') {
		expect(a + b).toBe(result);
		for (const x of [a, b, result]) {
			expect(x).toBeGreaterThanOrEqual(min);
			expect(x).toBeLessThanOrEqual(max);
		}
	} else if (op === 'sub') {
		expect(a - b).toBe(result);
		for (const x of [a, b, result]) {
			expect(x).toBeGreaterThanOrEqual(min);
			expect(x).toBeLessThanOrEqual(max);
		}
	} else if (op === 'mul') {
		expect(a * b).toBe(result);
		expect(result).toBeGreaterThanOrEqual(min);
		expect(result).toBeLessThanOrEqual(max);
		if (table) {
			expect(a).toBeLessThanOrEqual(9);
			expect(b).toBeLessThanOrEqual(9);
		}
		if (a > 1 && b > 1) {
			expect(Math.min(a, b)).toBeGreaterThanOrEqual(factorLow({ min, max }));
		}
	} else {
		expect(b).toBeGreaterThan(0);
		expect(b * result).toBe(a);
		expect(a).toBeGreaterThanOrEqual(min);
		expect(a).toBeLessThanOrEqual(max);
		if (table) {
			expect(b).toBeLessThanOrEqual(9);
			expect(result).toBeLessThanOrEqual(9);
		}
	}
}

describe('普通计算：每种运算的范围规则', () => {
	for (const [min, max] of RANGES) {
		for (const op of ALL_OPS) {
			it(`${op} ${min}～${max}`, () => {
				if (!isOpFeasible(op, { min, max })) return;
				for (const seed of SEEDS.slice(0, 15)) {
					const ps = generateProblems(cfg({ range: { min, max }, operations: [op], totalCount: 60 }), seededRng(seed));
					expect(ps).toHaveLength(60);
					ps.forEach((p) => checkBinary(p, min, max));
				}
			});
		}
	}

	it('20 以内加法：和不超过 20（报告问题 2）', () => {
		for (const seed of SEEDS) {
			const ps = generateProblems(cfg({ range: { min: 1, max: 20 }, operations: ['add'], totalCount: 50 }), seededRng(seed));
			expect(Math.max(...ps.map((p) => p.result))).toBeLessThanOrEqual(20);
		}
	});

	it('乘除不再卡在 12 以内；20～100 时积/被除数在范围内（报告问题 3）', () => {
		const ps = SEEDS.flatMap((s) =>
			generateProblems(cfg({ range: { min: 20, max: 100 }, operations: ['mul', 'div'], totalCount: 40 }), seededRng(s))
		);
		ps.forEach((p) => checkBinary(p, 20, 100));
		expect(ps.some((p) => p.op === 'mul' && Math.max(p.a, p.b) > 12)).toBe(true);
	});

	it('0～10 除法：被除数不超过 10', () => {
		for (const seed of SEEDS) {
			const ps = generateProblems(cfg({ range: { min: 0, max: 10 }, operations: ['div'], totalCount: 30 }), seededRng(seed));
			ps.forEach((p) => {
				expect(p.a).toBeLessThanOrEqual(10);
				expect(p.b).toBeGreaterThan(0);
			});
		}
	});

	it('表内乘除：因数 ≤ 9', () => {
		for (const seed of SEEDS) {
			const ps = generateProblems(
				cfg({ range: { min: 1, max: 100 }, operations: ['mul', 'div'], tableMulDiv: true, totalCount: 40 }),
				seededRng(seed)
			);
			ps.forEach((p) => checkBinary(p, 1, 100, true));
		}
		expect(factorHigh({ min: 1, max: 100, tableMulDiv: true })).toBe(9);
	});

	it('减法结果为 0 / 送分题不再泛滥（报告问题 8）', () => {
		const ps = SEEDS.flatMap((s) =>
			generateProblems(cfg({ range: { min: 0, max: 20 }, operations: ['sub'], totalCount: 50 }), seededRng(s))
		);
		const zeros = ps.filter((p) => p.result === 0).length / ps.length;
		expect(zeros).toBeLessThan(0.07);
		const ps1 = SEEDS.flatMap((s) =>
			generateProblems(cfg({ range: { min: 1, max: 20 }, operations: ['sub'], totalCount: 50 }), seededRng(s))
		);
		expect(ps1.every((p) => p.result >= 1)).toBe(true);
	});

	it('留空答案唯一（不会出现 0 × (  ) = 0）', () => {
		const ps = SEEDS.flatMap((s) =>
			generateProblems(
				cfg({ range: { min: 0, max: 10 }, operations: ['mul', 'div'], blankRatio: { first: 0.5, second: 0.5, result: 0 }, totalCount: 40 }),
				seededRng(s)
			)
		);
		for (const p of ps) {
			if (p.op === 'mul' && p.blank === 'first') expect(p.b).not.toBe(0);
			if (p.op === 'mul' && p.blank === 'second') expect(p.a).not.toBe(0);
			if (p.op === 'div' && p.blank === 'second') expect(p.a).not.toBe(0);
		}
	});
});

describe('连续运算：运算顺序和数值上限', () => {
	it('evaluateChain 先乘除后加减（报告问题 1）', () => {
		expect(evaluateChain([2, 6, 3], ['add', 'mul'])).toBe(20);
		expect(evaluateChain([6, 3, 9], ['add', 'mul'])).toBe(33);
		expect(evaluateChain([20, 12, 3], ['sub', 'div'])).toBe(16);
		expect(evaluateChain([8, 2, 3, 1], ['div', 'mul', 'sub'])).toBe(11);
		expect(evaluateChain([10, 2, 3, 4], ['sub', 'mul', 'add'])).toBe(8);
		expect(evaluateChain([100, 5, 4, 2], ['div', 'div', 'div'])).toBe(2.5);
	});

	const opSets: Operation[][] = [['add', 'sub'], ['add', 'mul'], ['mul', 'div'], ['div'], ['mul'], ALL_OPS, ['add', 'sub', 'mul']];
	for (const ops of opSets) {
		for (const len of [3, 4] as const) {
			for (const [min, max] of [[1, 20], [1, 100], [0, 50], [10, 1000]] as [number, number][]) {
				it(`${ops.join('+')} ×${len} ${min}～${max}`, () => {
					for (const seed of SEEDS.slice(0, 10)) {
						const res = generateChainProblemsDetailed(min, max, ops, len, 30, seededRng(seed));
						if (validateConfig(cfg({ problemMode: 'chain', range: { min, max }, operations: ops, chainLength: len, totalCount: 30 })).length) continue;
						expect(res.problems).toHaveLength(30);
						for (const p of res.problems as ChainProblem[]) {
							expect(p.numbers).toHaveLength(len);
							expect(p.result).toBe(evaluateChain(p.numbers, p.ops));
							expect(Number.isInteger(p.result)).toBe(true);
							expect(p.result).toBeGreaterThanOrEqual(0);
							expect(p.result).toBeLessThanOrEqual(max);
							const steps = chainSteps(p.numbers, p.ops)!;
							for (const s of steps) {
								expect(Number.isInteger(s)).toBe(true);
								expect(s).toBeGreaterThanOrEqual(0);
								expect(s).toBeLessThanOrEqual(max);
							}
							p.numbers.forEach((n) => expect(n).toBeLessThanOrEqual(max));
							p.ops.forEach((o) => expect(ops).toContain(o));
						}
					}
				});
			}
		}
	}

	it('1～100 加和乘、4 个数不会爆炸到几百万（报告问题 4）', () => {
		const ps = SEEDS.flatMap((s) => generateChainProblems(1, 100, ['add', 'mul'], 4, 30, seededRng(s)));
		expect(Math.max(...ps.map((p) => p.result))).toBeLessThanOrEqual(100);
	});

	it('纯除法 4 个数也能出满（第二轮问题 3）', () => {
		for (const seed of SEEDS.slice(0, 10)) {
			const r = generateChainProblemsDetailed(1, 100, ['div'], 4, 30, seededRng(seed));
			expect(r.problems).toHaveLength(30);
			expect(r.uniqueCount).toBeGreaterThan(20);
		}
	});

	it('四则混合答案与标准运算顺序一致（抽样 2000 道）', () => {
		let n = 0;
		for (const seed of SEEDS) {
			for (const p of generateChainProblems(1, 100, ALL_OPS, 3, 50, seededRng(seed))) {
				// 用 JS 自身的运算优先级再算一遍
				const expr = p.numbers.map((x, i) => `${x}${p.ops[i] ? { add: '+', sub: '-', mul: '*', div: '/' }[p.ops[i]] : ''}`).join('');
				expect(p.result).toBe(Function(`return ${expr}`)());
				n++;
			}
		}
		expect(n).toBe(2000);
	});
});

describe('比较大小：答案分布', () => {
	for (const ops of [['add', 'sub'], ['add'], ['mul'], ALL_OPS] as Operation[][]) {
		it(`${ops.join('+')}：<、>、= 都占合理比例`, () => {
			const ps = SEEDS.flatMap((s) => generateCompareProblems(1, 20, ops, 30, seededRng(s))) as CompareProblem[];
			const share = (sym: string) => ps.filter((p) => p.answer === sym).length / ps.length;
			for (const sym of ['<', '>', '=']) {
				expect(share(sym)).toBeGreaterThan(0.2);
				expect(share(sym)).toBeLessThan(0.46);
			}
			for (const p of ps) {
				const l = p.left.result;
				const r = p.right.result;
				expect(p.answer).toBe(l > r ? '>' : l < r ? '<' : '=');
				checkBinary({ ...p.left, blank: 'result' }, 1, 20);
				checkBinary({ ...p.right, blank: 'result' }, 1, 20);
			}
		});
	}
});

describe('有余数除法（报告问题 7）', () => {
	for (const [min, max] of [[50, 100], [1, 20], [3, 10], [100, 999]] as [number, number][]) {
		it(`被除数在 ${min}～${max} 内`, () => {
			for (const seed of SEEDS) {
				const ps = generateRemainderProblems(min, max, 30, 'both', seededRng(seed)) as RemainderProblem[];
				expect(ps).toHaveLength(30);
				for (const p of ps) {
					expect(p.dividend).toBeGreaterThanOrEqual(min);
					expect(p.dividend).toBeLessThanOrEqual(max);
					expect(p.divisor).toBeGreaterThanOrEqual(2);
					expect(p.divisor).toBeLessThanOrEqual(9);
					expect(p.remainder).toBeGreaterThanOrEqual(1);
					expect(p.remainder).toBeLessThan(p.divisor);
					expect(p.quotient).toBeGreaterThanOrEqual(1);
					expect(p.divisor * p.quotient + p.remainder).toBe(p.dividend);
				}
			}
		});
	}
});

describe('题量补足（报告问题 5）', () => {
	it('加法 1～3 要 30 道：给满 30 道并提示只有少量不同题', () => {
		const r = generateWorksheet(cfg({ range: { min: 1, max: 3 }, operations: ['add'], totalCount: 30 }), seededRng(1));
		expect(r.problems).toHaveLength(30);
		expect(r.uniqueCount).toBe(3); // 1+1, 1+2, 2+1
		expect(r.notice).toMatch(/只有 3 道不一样的题/);
	});
	it('凑十要 30 道：18 道不同 + 补足', () => {
		const r = generateMakeTargetProblemsDetailed(10, 30, seededRng(2));
		expect(r.problems).toHaveLength(30);
		expect(r.uniqueCount).toBe(18);
	});
	it('补足时相邻两题不完全相同', () => {
		const r = fillProblems(20, (() => { let i = 0; return () => ['a', 'b', 'c'][i++ % 3]; })(), (x) => x, seededRng(3));
		expect(r.problems).toHaveLength(20);
		for (let i = 1; i < 20; i++) expect(r.problems[i]).not.toBe(r.problems[i - 1]);
	});
	it('题目足够时不重复', () => {
		for (const seed of SEEDS) {
			const r = generateProblemsDetailed(cfg({ range: { min: 1, max: 100 }, operations: ALL_OPS, totalCount: 100 }), seededRng(seed));
			expect(r.uniqueCount).toBe(100);
		}
	});
});

describe('输入校验（报告问题 6）', () => {
	const fields = (c: ExerciseConfig) => validateConfig(c).map((i) => i.field);
	it('最小值大于最大值', () => {
		expect(fields(cfg({ range: { min: 50, max: 10 } }))).toContain('range');
		expect(generateWorksheet(cfg({ range: { min: 50, max: 10 } })).problems).toHaveLength(0);
	});
	it('最大值为空 / 非数字 / 小数', () => {
		expect(fields(cfg({ range: { min: 1, max: null as unknown as number } }))).toContain('rangeMax');
		expect(fields(cfg({ range: { min: 1, max: NaN } }))).toContain('rangeMax');
		expect(fields(cfg({ range: { min: 'a' as unknown as number, max: 10 } }))).toContain('rangeMin');
		expect(fields(cfg({ range: { min: 1.5, max: 10 } }))).toContain('rangeMin');
	});
	it('题数边界', () => {
		expect(fields(cfg({ totalCount: 0 }))).toContain('totalCount');
		expect(fields(cfg({ totalCount: 201 }))).toContain('totalCount');
		expect(fields(cfg({ totalCount: null as unknown as number }))).toContain('totalCount');
		expect(fields(cfg({ countPerPage: 30, columns: 2 }))).toContain('countPerPage');
		expect(fields(cfg({ countPerPage: 30, columns: 3 }))).not.toContain('countPerPage');
		expect(fields(cfg({ countPerPage: 21, isVertical: true }))).toContain('countPerPage');
	});
	it('运算类型至少一种', () => {
		expect(fields(cfg({ operations: [] }))).toContain('operations');
		expect(fields(cfg({ operations: [], problemMode: 'makeTarget' }))).not.toContain('operations');
	});
	it('范围无法出题时给出明确原因', () => {
		const issues = validateConfig(cfg({ range: { min: 60, max: 100 }, operations: ['add'] }));
		expect(issues[0].message).toMatch(/加法/);
		expect(validateConfig(cfg({ range: { min: 1, max: 2 }, problemMode: 'remainder' }))[0].message).toMatch(/余数/);
		expect(validateConfig(cfg({ range: { min: 1, max: 20 }, operations: ['add'], countPerPage: 20 }))).toEqual([]);
	});
	it('年级预设都能直接出题', () => {
		for (const [min, max] of [[1, 10], [1, 20], [1, 100]]) {
			for (const mode of ['normal', 'chain', 'compare', 'remainder', 'makeTarget'] as const) {
				const c = cfg({ range: { min, max }, operations: ALL_OPS, problemMode: mode, chainLength: 4 });
				expect(validateConfig(c)).toEqual([]);
				expect(generateWorksheet(c).problems.length).toBe(c.totalCount);
			}
		}
	});
});

describe('标题与设置一致（第二轮问题 1）', () => {
	it('自动标题', () => {
		expect(autoTitle(cfg({ range: { min: 1, max: 10 }, operations: ['add'] }))).toBe('10以内加法小练习');
		expect(autoTitle(cfg({ range: { min: 1, max: 20 }, operations: ['add', 'sub'] }))).toBe('20以内加减法小练习');
		expect(autoTitle(cfg({ range: { min: 20, max: 100 }, operations: ['mul', 'div'], problemMode: 'chain' }))).toBe('20～100乘除法连着算');
		expect(autoTitle(cfg({ problemMode: 'makeTarget', makeTargetValue: 10 }))).toBe('凑10游戏');
	});
});
