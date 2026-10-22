import type {
	AnyProblem,
	Problem,
	MakeTargetProblem,
	ChainProblem,
	CompareProblem,
	RemainderProblem,
	CompareSymbol
} from '#lib/types.js';

const NUMBER_WORDS: Record<number, string> = {
	0: '零',
	1: '一',
	2: '二',
	3: '三',
	4: '四',
	5: '五',
	6: '六',
	7: '七',
	8: '八',
	9: '九',
	10: '十',
	11: '十一',
	12: '十二',
	13: '十三',
	14: '十四',
	15: '十五',
	16: '十六',
	17: '十七',
	18: '十八',
	19: '十九',
	20: '二十',
	30: '三十',
	40: '四十',
	50: '五十',
	60: '六十',
	70: '七十',
	80: '八十',
	90: '九十',
	100: '一百'
};

const OPERATION_WORDS: Record<string, string> = {
	add: '加',
	sub: '减',
	mul: '乘以',
	div: '除以'
};

const COMPARE_WORDS: Record<CompareSymbol, string> = {
	'>': '大于',
	'<': '小于',
	'=': '等于'
};

/** 空位朗读用「多少」（不是「空白」） */
const BLANK_WORD = '多少';

export const VOICE_STORAGE_KEY = 'little-math-voice-enabled';

export const CORRECT_PRAISES = [
	'答对啦！真棒！',
	'对了！继续加油！',
	'太厉害了！',
	'完全正确！',
	'棒棒的！'
] as const;

/** 数字转中文读法（供测试与答对/答错文案） */
export function numberToWords(num: number): string {
	if (NUMBER_WORDS[num]) {
		return NUMBER_WORDS[num];
	}

	if (num < 100) {
		const tens = Math.floor(num / 10) * 10;
		const units = num % 10;
		return (NUMBER_WORDS[tens] || '') + (units > 0 ? NUMBER_WORDS[units] : '');
	}

	if (num < 1000) {
		const hundreds = Math.floor(num / 100);
		const remainder = num % 100;
		const hundredWord = NUMBER_WORDS[hundreds] + '百';
		if (remainder === 0) {
			return hundredWord;
		}
		return hundredWord + (remainder < 10 ? '零' : '') + numberToWords(remainder);
	}

	return num.toString();
}

export function compareSymbolToWords(symbol: CompareSymbol): string {
	return COMPARE_WORDS[symbol];
}

/** 题目朗读文案：空位念「多少」；比较题念「比较」 */
export function problemToText(problem: AnyProblem): string {
	if ('type' in problem) {
		if (problem.type === 'makeTarget') {
			const p = problem as MakeTargetProblem;
			const blankWord = p.blankFirst ? BLANK_WORD : numberToWords(p.a);
			const otherWord = p.blankFirst ? numberToWords(p.a) : BLANK_WORD;
			return `${blankWord} 加 ${otherWord} 等于 ${numberToWords(p.target)}`;
		}

		if (problem.type === 'chain') {
			const p = problem as ChainProblem;
			const parts: string[] = [];
			for (let i = 0; i < p.numbers.length; i++) {
				if (p.blank === i) {
					parts.push(BLANK_WORD);
				} else {
					parts.push(numberToWords(p.numbers[i]));
				}
				if (i < p.ops.length) {
					parts.push(OPERATION_WORDS[p.ops[i]]);
				}
			}
			parts.push('等于');
			if (p.blank === 'result') {
				parts.push(BLANK_WORD);
			} else {
				parts.push(numberToWords(p.result));
			}
			return parts.join(' ');
		}

		if (problem.type === 'compare') {
			const p = problem as CompareProblem;
			const left = `${numberToWords(p.left.a)} ${OPERATION_WORDS[p.left.op]} ${numberToWords(p.left.b)}`;
			const right = `${numberToWords(p.right.a)} ${OPERATION_WORDS[p.right.op]} ${numberToWords(p.right.b)}`;
			return `${left} 和 ${right} 比较`;
		}

		if (problem.type === 'remainder') {
			const p = problem as RemainderProblem;
			let text = `${numberToWords(p.dividend)} 除以 ${numberToWords(p.divisor)} 等于 `;

			if (p.blank === 'quotient' || p.blank === 'both') {
				text += BLANK_WORD;
			} else {
				text += numberToWords(p.quotient);
			}

			text += ' 余 ';

			if (p.blank === 'remainder' || p.blank === 'both') {
				text += BLANK_WORD;
			} else {
				text += numberToWords(p.remainder);
			}

			return text;
		}
	}

	const p = problem as Problem;
	const first = p.blank === 'first' ? BLANK_WORD : numberToWords(p.a);
	const second = p.blank === 'second' ? BLANK_WORD : numberToWords(p.b);
	const result = p.blank === 'result' ? BLANK_WORD : numberToWords(p.result);
	return `${first} ${OPERATION_WORDS[p.op]} ${second} 等于 ${result}`;
}

/** 正确答案的朗读文案（数字用中文；比较用大于/小于/等于） */
export function correctAnswerToText(problem: AnyProblem): string {
	if ('type' in problem) {
		if (problem.type === 'makeTarget') {
			return numberToWords((problem as MakeTargetProblem).answer);
		}
		if (problem.type === 'chain') {
			const p = problem as ChainProblem;
			const v = p.blank === 'result' ? p.result : p.numbers[p.blank];
			return numberToWords(v);
		}
		if (problem.type === 'compare') {
			return compareSymbolToWords((problem as CompareProblem).answer);
		}
		if (problem.type === 'remainder') {
			const p = problem as RemainderProblem;
			if (p.blank === 'quotient') return numberToWords(p.quotient);
			if (p.blank === 'remainder') return numberToWords(p.remainder);
			return `商${numberToWords(p.quotient)}余${numberToWords(p.remainder)}`;
		}
	}
	const p = problem as Problem;
	const v = p.blank === 'first' ? p.a : p.blank === 'second' ? p.b : p.result;
	return numberToWords(v);
}

export function wrongFeedbackText(problem: AnyProblem): string {
	return `再想想。正确答案是${correctAnswerToText(problem)}。`;
}

export function pickCorrectPraise(random = Math.random): string {
	const i = Math.floor(random() * CORRECT_PRAISES.length) % CORRECT_PRAISES.length;
	return CORRECT_PRAISES[i];
}

/** 结果页总结朗读（与页面表扬一致） */
export function summaryToText(opts: {
	total: number;
	correct: number;
	timeSpent: number;
}): string {
	const { total, correct, timeSpent } = opts;
	const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
	const mins = Math.floor(timeSpent / 60);
	const secs = timeSpent % 60;

	if (accuracy === 100) {
		return `全对啦！你太棒了！一共做了 ${total} 道题，用了 ${mins} 分 ${secs} 秒。`;
	}
	if (accuracy >= 90) {
		return `真厉害！差一点就全对啦！答对了 ${correct} 道，正确率百分之 ${accuracy}。`;
	}
	if (accuracy >= 70) {
		return `做得很好！继续加油！答对了 ${correct} 道，正确率百分之 ${accuracy}。`;
	}
	if (accuracy >= 50) {
		return `不错哦！多练练会更棒！答对了 ${correct} 道，正确率百分之 ${accuracy}。`;
	}
	return `没关系，再来一次一定更好！答对了 ${correct} 道，我们再练练。`;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

function canSpeak(): boolean {
	return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export type SpeakOptions = {
	/** 朗读正常结束后回调（cancel / 出错不调用） */
	onEnd?: () => void;
	/** 朗读失败、不支持，或被 cancel 打断时回调 */
	onError?: () => void;
};

/** 答对后：等表扬念完再跳题的缓冲（≤200ms） */
export const CORRECT_ADVANCE_BUFFER_MS = 150;
/** 关语音 / TTS 失败时的短延时回退 */
export const CORRECT_ADVANCE_FALLBACK_MS = 800;

export type CorrectAdvanceHandle = {
	/** 当前选用的表扬文案（无语音时为默认句） */
	praise: string;
	/** 取消尚未触发的自动跳题计时（切题/离开时调用） */
	cancel: () => void;
};

/**
 * 安排答对后自动下一题：
 * - 开语音：等表扬 onEnd 后再加短缓冲；
 * - 关语音 / TTS 失败 / 被打断：退回 fallbackMs；
 * - 自动跳题本身不 cancel 朗读（由调用方 moveToNext({ cancelSpeech:false })）。
 */
export function scheduleCorrectAdvance(opts: {
	voiceEnabled: boolean;
	speakCorrect: (cbs: { onEnd: () => void; onError: () => void }) => string;
	advance: () => void;
	bufferMs?: number;
	fallbackMs?: number;
	setTimeoutFn?: typeof setTimeout;
	clearTimeoutFn?: typeof clearTimeout;
}): CorrectAdvanceHandle {
	const bufferMs = opts.bufferMs ?? CORRECT_ADVANCE_BUFFER_MS;
	const fallbackMs = opts.fallbackMs ?? CORRECT_ADVANCE_FALLBACK_MS;
	const setTimeoutFn = opts.setTimeoutFn ?? setTimeout;
	const clearTimeoutFn = opts.clearTimeoutFn ?? clearTimeout;

	let timer: ReturnType<typeof setTimeout> | undefined;
	let settled = false;

	const cancel = () => {
		if (timer !== undefined) clearTimeoutFn(timer);
		timer = undefined;
		settled = true;
	};

	const runAdvance = (delay: number) => {
		if (settled) return;
		if (timer !== undefined) clearTimeoutFn(timer);
		timer = setTimeoutFn(() => {
			if (settled) return;
			settled = true;
			timer = undefined;
			opts.advance();
		}, delay);
	};

	if (!opts.voiceEnabled) {
		runAdvance(fallbackMs);
		return { praise: '答对啦！真棒！', cancel };
	}

	let praise = '答对啦！真棒！';
	try {
		praise = opts.speakCorrect({
			onEnd: () => runAdvance(bufferMs),
			onError: () => runAdvance(fallbackMs)
		});
	} catch {
		runAdvance(fallbackMs);
	}
	return { praise, cancel };
}

function speakRaw(text: string, options: SpeakOptions = {}): void {
	if (!canSpeak()) {
		console.warn('Speech synthesis not supported');
		options.onError?.();
		return;
	}

	window.speechSynthesis.cancel();
	currentUtterance = null;

	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = 'zh-CN';
	utterance.rate = 0.9;
	utterance.pitch = 1.1;

	const voices = window.speechSynthesis.getVoices();
	const chineseVoice = voices.find((voice) => voice.lang.startsWith('zh'));
	if (chineseVoice) {
		utterance.voice = chineseVoice;
	}

	currentUtterance = utterance;
	let finished = false;
	const finishOk = () => {
		if (finished) return;
		finished = true;
		if (currentUtterance === utterance) currentUtterance = null;
		options.onEnd?.();
	};
	const finishErr = () => {
		if (finished) return;
		finished = true;
		if (currentUtterance === utterance) currentUtterance = null;
		options.onError?.();
	};

	utterance.onend = finishOk;
	utterance.onerror = finishErr;

	try {
		window.speechSynthesis.speak(utterance);
	} catch (e) {
		console.warn('Speech synthesis speak failed:', e);
		finishErr();
	}
}

export function speakText(text: string, options?: SpeakOptions): void {
	speakRaw(text, options);
}

export function speakProblem(problem: AnyProblem, options?: SpeakOptions): void {
	speakRaw(problemToText(problem), options);
}

export function speakCorrect(options?: SpeakOptions & { random?: () => number }): string {
	const praise = pickCorrectPraise(options?.random);
	speakRaw(praise, options);
	return praise;
}

export function speakWrong(problem: AnyProblem, options?: SpeakOptions): string {
	const text = wrongFeedbackText(problem);
	speakRaw(text, options);
	return text;
}

export function speakSummary(
	opts: { total: number; correct: number; timeSpent: number },
	options?: SpeakOptions
): string {
	const text = summaryToText(opts);
	speakRaw(text, options);
	return text;
}

export function stopSpeaking(): void {
	if (!canSpeak()) return;
	try {
		window.speechSynthesis.cancel();
	} catch {
		/* ignore */
	}
	currentUtterance = null;
}

export function isSpeechSupported(): boolean {
	return canSpeak();
}

/** 语音开关：默认开；localStorage 持久化 */
export function isVoiceEnabled(): boolean {
	if (typeof localStorage === 'undefined') return true;
	try {
		const v = localStorage.getItem(VOICE_STORAGE_KEY);
		if (v === null) return true;
		return v === '1' || v === 'true';
	} catch {
		return true;
	}
}

export function setVoiceEnabled(enabled: boolean): void {
	try {
		localStorage.setItem(VOICE_STORAGE_KEY, enabled ? '1' : '0');
	} catch {
		/* 隐私模式等忽略 */
	}
	if (!enabled) stopSpeaking();
}

/** 是否应自动朗读（支持 speechSynthesis 且开关打开） */
export function shouldAutoSpeak(): boolean {
	return isSpeechSupported() && isVoiceEnabled();
}
