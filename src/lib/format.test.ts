import { describe, expect, it } from 'vitest';
import { correctAnswerOf, formatProblemText, operationsOf } from './format';

describe('题目文字格式', () => {
	it('有余数除法使用「……」并留出空格', () => {
		const p = { type: 'remainder', dividend: 17, divisor: 2, quotient: 8, remainder: 1, blank: 'both' } as const;
		expect(formatProblemText(p)).toBe('17 ÷ 2 = (\u00a0\u00a0\u00a0) …… (\u00a0\u00a0\u00a0)');
		expect(formatProblemText(p, true)).toBe('17 ÷ 2 = (8) …… (1)');
		expect(correctAnswerOf({ ...p, blank: 'remainder' })).toBe(1);
	});
	it('连续运算填空位置正确', () => {
		const p = { type: 'chain', numbers: [2, 6, 3], ops: ['add', 'mul'], result: 20, blank: 1 } as const;
		expect(formatProblemText({ ...p, ops: [...p.ops], numbers: [...p.numbers] }, true)).toBe('2 + (6) × 3 = 20');
		expect(correctAnswerOf({ ...p, ops: [...p.ops], numbers: [...p.numbers] })).toBe(6);
		expect(operationsOf({ ...p, ops: [...p.ops], numbers: [...p.numbers] })).toEqual(['add', 'mul']);
	});
	it('比较大小', () => {
		const p = { type: 'compare', left: { a: 3, b: 4, op: 'add', result: 7 }, right: { a: 9, b: 2, op: 'sub', result: 7 }, answer: '=' } as const;
		expect(formatProblemText(p)).toBe('3 + 4 ○ 9 - 2');
		expect(correctAnswerOf(p)).toBe('=');
	});
});
