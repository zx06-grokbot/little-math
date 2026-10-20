import type { AnyProblem, ChainProblem, CompareProblem, MakeTargetProblem, Problem, RemainderProblem } from '#lib/types.js';
import { OP_SYMBOLS } from '#lib/types.js';

/** 题目统一文字格式（在线练习、练习结果、错题本、收藏共用） */
export const TEXT_BLANK = '(\u00a0\u00a0\u00a0)';
/** 余数分隔符：小学课本写作「……」 */
export const REMAINDER_SEP = '……';

export function isMakeTarget(p: AnyProblem): p is MakeTargetProblem {
	return 'type' in p && p.type === 'makeTarget';
}
export function isChain(p: AnyProblem): p is ChainProblem {
	return 'type' in p && p.type === 'chain';
}
export function isCompare(p: AnyProblem): p is CompareProblem {
	return 'type' in p && p.type === 'compare';
}
export function isRemainder(p: AnyProblem): p is RemainderProblem {
	return 'type' in p && p.type === 'remainder';
}

export function exprText(e: { a: number; b: number; op: Problem['op'] }): string {
	return `${e.a} ${OP_SYMBOLS[e.op]} ${e.b}`;
}

/** 把题目格式化成一行文字；showAnswer 时把答案填进括号 */
export function formatProblemText(problem: AnyProblem, showAnswer = false, blank = TEXT_BLANK): string {
	const fill = (v: number | string) => (showAnswer ? `(${v})` : blank);
	if (isMakeTarget(problem)) {
		return problem.blankFirst
			? `${fill(problem.answer)} + ${problem.a} = ${problem.target}`
			: `${problem.a} + ${fill(problem.answer)} = ${problem.target}`;
	}
	if (isChain(problem)) {
		const parts: string[] = [];
		problem.numbers.forEach((n, i) => {
			parts.push(problem.blank === i ? fill(n) : String(n));
			if (i < problem.ops.length) parts.push(OP_SYMBOLS[problem.ops[i]]);
		});
		parts.push('=', problem.blank === 'result' ? fill(problem.result) : String(problem.result));
		return parts.join(' ');
	}
	if (isCompare(problem)) {
		return `${exprText(problem.left)} ${showAnswer ? problem.answer : '○'} ${exprText(problem.right)}`;
	}
	if (isRemainder(problem)) {
		const q = problem.blank === 'remainder' ? String(problem.quotient) : fill(problem.quotient);
		const r = problem.blank === 'quotient' ? String(problem.remainder) : fill(problem.remainder);
		return `${problem.dividend} ÷ ${problem.divisor} = ${q} ${REMAINDER_SEP} ${r}`;
	}
	const p = problem as Problem;
	const a = p.blank === 'first' ? fill(p.a) : String(p.a);
	const b = p.blank === 'second' ? fill(p.b) : String(p.b);
	const r = p.blank === 'result' ? fill(p.result) : String(p.result);
	return `${a} ${OP_SYMBOLS[p.op]} ${b} = ${r}`;
}

/** 单个数字答案（比较大小返回符号；有余数除法「商和余数」返回商） */
export function correctAnswerOf(problem: AnyProblem): number | string {
	if (isMakeTarget(problem)) return problem.answer;
	if (isChain(problem)) return problem.blank === 'result' ? problem.result : problem.numbers[problem.blank];
	if (isCompare(problem)) return problem.answer;
	if (isRemainder(problem)) return problem.blank === 'remainder' ? problem.remainder : problem.quotient;
	const p = problem as Problem;
	return p.blank === 'first' ? p.a : p.blank === 'second' ? p.b : p.result;
}

/** 题目涉及的运算（用于统计） */
export function operationsOf(problem: AnyProblem): Problem['op'][] {
	if (isMakeTarget(problem)) return ['add'];
	if (isChain(problem)) return [...new Set(problem.ops)];
	if (isCompare(problem)) return [...new Set([problem.left.op, problem.right.op])];
	if (isRemainder(problem)) return ['div'];
	return [(problem as Problem).op];
}

/** 用于判断两道题是否相同（收藏去重） */
export function problemId(problem: AnyProblem): string {
	return JSON.stringify(problem);
}
