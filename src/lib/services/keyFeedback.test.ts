import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vibrateKey, playKeyClick, playKeyFeedback, _resetKeyFeedbackForTests } from './keyFeedback.js';

describe('keyFeedback', () => {
	beforeEach(() => {
		_resetKeyFeedbackForTests();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		_resetKeyFeedbackForTests();
	});

	it('vibrateKey 调用 navigator.vibrate', () => {
		const vibrate = vi.fn();
		vi.stubGlobal('navigator', { vibrate });
		vibrateKey();
		expect(vibrate).toHaveBeenCalledWith(12);
	});

	it('vibrateKey 在无 vibrate 时不抛错', () => {
		vi.stubGlobal('navigator', {});
		expect(() => vibrateKey()).not.toThrow();
	});

	it('playKeyClick 不抛错且不走 speechSynthesis', () => {
		const speak = vi.fn();
		vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
		expect(() => playKeyClick()).not.toThrow();
		expect(speak).not.toHaveBeenCalled();
	});

	it('playKeyFeedback 会震，且不走 speechSynthesis', () => {
		const vibrate = vi.fn();
		const speak = vi.fn();
		vi.stubGlobal('navigator', { vibrate });
		vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
		expect(() => playKeyFeedback()).not.toThrow();
		expect(vibrate).toHaveBeenCalled();
		expect(speak).not.toHaveBeenCalled();
	});
});
