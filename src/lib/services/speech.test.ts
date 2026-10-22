import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	numberToWords,
	problemToText,
	correctAnswerToText,
	wrongFeedbackText,
	summaryToText,
	pickCorrectPraise,
	CORRECT_PRAISES,
	isVoiceEnabled,
	setVoiceEnabled,
	VOICE_STORAGE_KEY,
	scheduleCorrectAdvance
} from './speech.js';
import type {
	Problem,
	MakeTargetProblem,
	ChainProblem,
	CompareProblem,
	RemainderProblem
} from '#lib/types.js';

class MemoryStorage {
	store = new Map<string, string>();
	getItem(k: string) {
		return this.store.has(k) ? this.store.get(k)! : null;
	}
	setItem(k: string, v: string) {
		this.store.set(k, String(v));
	}
	removeItem(k: string) {
		this.store.delete(k);
	}
}

describe('numberToWords', () => {
	it('读出个位与十几', () => {
		expect(numberToWords(1)).toBe('一');
		expect(numberToWords(2)).toBe('二');
		expect(numberToWords(10)).toBe('十');
		expect(numberToWords(11)).toBe('十一');
		expect(numberToWords(12)).toBe('十二');
	});

	it('读出几十', () => {
		expect(numberToWords(20)).toBe('二十');
		expect(numberToWords(35)).toBe('三十五');
		expect(numberToWords(99)).toBe('九十九');
	});
});

describe('problemToText', () => {
	it('普通题空位念「多少」', () => {
		const p: Problem = { a: 3, b: 5, op: 'add', result: 8, blank: 'result' };
		expect(problemToText(p)).toBe('三 加 五 等于 多少');
	});

	it('除法空位念「多少」', () => {
		const p: Problem = { a: 12, b: 4, op: 'div', result: 3, blank: 'result' };
		expect(problemToText(p)).toBe('十二 除以 四 等于 多少');
	});

	it('乘法念「乘以」', () => {
		const p: Problem = { a: 2, b: 3, op: 'mul', result: 6, blank: 'result' };
		expect(problemToText(p)).toBe('二 乘以 三 等于 多少');
	});

	it('比较题念「比较」、无空位', () => {
		const p: CompareProblem = {
			type: 'compare',
			left: { a: 8, b: 3, op: 'sub', result: 5 },
			right: { a: 2, b: 2, op: 'add', result: 4 },
			answer: '>'
		};
		expect(problemToText(p)).toBe('八 减 三 和 二 加 二 比较');
	});

	it('凑数空位念「多少」', () => {
		const p: MakeTargetProblem = {
			type: 'makeTarget',
			a: 3,
			target: 10,
			answer: 7,
			blankFirst: false
		};
		expect(problemToText(p)).toBe('三 加 多少 等于 十');
	});

	it('连续运算空位念「多少」', () => {
		const p: ChainProblem = {
			type: 'chain',
			numbers: [1, 2, 3],
			ops: ['add', 'add'],
			result: 6,
			blank: 'result'
		};
		expect(problemToText(p)).toBe('一 加 二 加 三 等于 多少');
	});

	it('有余数除法空位念「多少」', () => {
		const p: RemainderProblem = {
			type: 'remainder',
			dividend: 17,
			divisor: 5,
			quotient: 3,
			remainder: 2,
			blank: 'both'
		};
		expect(problemToText(p)).toBe('十七 除以 五 等于 多少 余 多少');
	});
});

describe('答对/答错/总结文案', () => {
	it('答错：数字答案', () => {
		const p: Problem = { a: 3, b: 5, op: 'add', result: 8, blank: 'result' };
		expect(wrongFeedbackText(p)).toBe('再想想。正确答案是八。');
		expect(correctAnswerToText(p)).toBe('八');
	});

	it('答错：比较题', () => {
		const p: CompareProblem = {
			type: 'compare',
			left: { a: 8, b: 3, op: 'sub', result: 5 },
			right: { a: 2, b: 2, op: 'add', result: 4 },
			answer: '>'
		};
		expect(wrongFeedbackText(p)).toBe('再想想。正确答案是大于。');
	});

	it('答对表扬在定稿列表中', () => {
		for (let i = 0; i < CORRECT_PRAISES.length; i++) {
			const praise = pickCorrectPraise(() => (i + 0.1) / CORRECT_PRAISES.length);
			expect(CORRECT_PRAISES).toContain(praise);
		}
	});

	it('全对总结', () => {
		expect(summaryToText({ total: 10, correct: 10, timeSpent: 65 })).toBe(
			'全对啦！你太棒了！一共做了 10 道题，用了 1 分 5 秒。'
		);
	});

	it('≥90% 总结', () => {
		expect(summaryToText({ total: 10, correct: 9, timeSpent: 30 })).toBe(
			'真厉害！差一点就全对啦！答对了 9 道，正确率百分之 90。'
		);
	});

	it('≥70% 总结', () => {
		expect(summaryToText({ total: 10, correct: 7, timeSpent: 30 })).toBe(
			'做得很好！继续加油！答对了 7 道，正确率百分之 70。'
		);
	});

	it('≥50% 总结', () => {
		expect(summaryToText({ total: 10, correct: 5, timeSpent: 30 })).toBe(
			'不错哦！多练练会更棒！答对了 5 道，正确率百分之 50。'
		);
	});

	it('＜50% 总结', () => {
		expect(summaryToText({ total: 10, correct: 4, timeSpent: 30 })).toBe(
			'没关系，再来一次一定更好！答对了 4 道，我们再练练。'
		);
	});
});

describe('语音开关持久化', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', new MemoryStorage());
	});

	it('默认开启', () => {
		expect(isVoiceEnabled()).toBe(true);
	});

	it('关闭后持久化', () => {
		setVoiceEnabled(false);
		expect(isVoiceEnabled()).toBe(false);
		expect(localStorage.getItem(VOICE_STORAGE_KEY)).toBe('0');
		setVoiceEnabled(true);
		expect(isVoiceEnabled()).toBe(true);
		expect(localStorage.getItem(VOICE_STORAGE_KEY)).toBe('1');
	});
});

describe('scheduleCorrectAdvance', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('关语音：fallbackMs 后跳题，不调用 speak', () => {
		const advance = vi.fn();
		const speakCorrect = vi.fn(() => '太厉害了！');
		const { praise } = scheduleCorrectAdvance({
			voiceEnabled: false,
			speakCorrect,
			advance,
			fallbackMs: 800,
			setTimeoutFn: setTimeout as typeof setTimeout,
			clearTimeoutFn: clearTimeout as typeof clearTimeout
		});
		expect(praise).toBe('答对啦！真棒！');
		expect(speakCorrect).not.toHaveBeenCalled();
		expect(advance).not.toHaveBeenCalled();
		vi.advanceTimersByTime(799);
		expect(advance).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(advance).toHaveBeenCalledTimes(1);
	});

	it('开语音：等 onEnd 后再加 bufferMs 跳题', () => {
		const advance = vi.fn();
		let cbs: { onEnd: () => void; onError: () => void } | undefined;
		const { praise } = scheduleCorrectAdvance({
			voiceEnabled: true,
			speakCorrect: (c) => {
				cbs = c;
				return '完全正确！';
			},
			advance,
			bufferMs: 150,
			fallbackMs: 800,
			setTimeoutFn: setTimeout as typeof setTimeout,
			clearTimeoutFn: clearTimeout as typeof clearTimeout
		});
		expect(praise).toBe('完全正确！');
		expect(advance).not.toHaveBeenCalled();
		cbs!.onEnd();
		vi.advanceTimersByTime(149);
		expect(advance).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(advance).toHaveBeenCalledTimes(1);
	});

	it('开语音但 TTS 失败：fallbackMs 后跳题', () => {
		const advance = vi.fn();
		let cbs: { onEnd: () => void; onError: () => void } | undefined;
		scheduleCorrectAdvance({
			voiceEnabled: true,
			speakCorrect: (c) => {
				cbs = c;
				return '棒棒的！';
			},
			advance,
			bufferMs: 150,
			fallbackMs: 800,
			setTimeoutFn: setTimeout as typeof setTimeout,
			clearTimeoutFn: clearTimeout as typeof clearTimeout
		});
		cbs!.onError();
		vi.advanceTimersByTime(800);
		expect(advance).toHaveBeenCalledTimes(1);
	});

	it('cancel 后不再跳题', () => {
		const advance = vi.fn();
		let cbs: { onEnd: () => void; onError: () => void } | undefined;
		const handle = scheduleCorrectAdvance({
			voiceEnabled: true,
			speakCorrect: (c) => {
				cbs = c;
				return '对了！继续加油！';
			},
			advance,
			bufferMs: 150,
			setTimeoutFn: setTimeout as typeof setTimeout,
			clearTimeoutFn: clearTimeout as typeof clearTimeout
		});
		cbs!.onEnd();
		handle.cancel();
		vi.advanceTimersByTime(500);
		expect(advance).not.toHaveBeenCalled();
	});
});
