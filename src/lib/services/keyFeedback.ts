/**
 * 自绘键盘按键反馈：短震 + 短促点击音。
 * 用 Web Audio，不经过 speechSynthesis，避免打断读题/表扬。
 */

const VIBRATE_MS = 12;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const AC =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!AC) return null;
	audioCtx ??= new AC();
	return audioCtx;
}

/** 震动；不支持或被拒时静默跳过 */
export function vibrateKey(): void {
	try {
		if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
			navigator.vibrate(VIBRATE_MS);
		}
	} catch {
		/* 忽略 */
	}
}

/** 短促点击音；失败则静默 */
export function playKeyClick(): void {
	try {
		const ctx = getAudioContext();
		if (!ctx) return;
		if (ctx.state === 'suspended') {
			void ctx.resume();
		}
		const t0 = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'square';
		osc.frequency.value = 920;
		gain.gain.setValueAtTime(0.0001, t0);
		gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.004);
		gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(t0);
		osc.stop(t0 + 0.045);
	} catch {
		/* 忽略 */
	}
}

/** 一次按键：震 + 声 */
export function playKeyFeedback(): void {
	vibrateKey();
	playKeyClick();
}

/** 测试用：重置 AudioContext 引用 */
export function _resetKeyFeedbackForTests(): void {
	audioCtx = null;
}
