import { describe, it, expect } from 'vitest';
import {
	createExitGuardState,
	setExitGuardActive,
	decideExit,
	isExitArmed,
	EXIT_GUARD_WINDOW_MS,
	EXIT_GUARD_HINT
} from './exitGuard.js';

describe('exitGuard', () => {
	it('文案简短且为简体中文', () => {
		expect(EXIT_GUARD_HINT).toMatch(/再按一次/);
		expect(EXIT_GUARD_HINT.length).toBeLessThan(20);
	});

	it('未激活时直接放行', () => {
		const s = createExitGuardState();
		const r = decideExit(s, 1000);
		expect(r.decision).toBe('allow');
		expect(r.showHint).toBe(false);
		expect(r.next).toEqual(s);
	});

	it('激活后第一次拦截并提示', () => {
		const s = setExitGuardActive(createExitGuardState(), true);
		const r = decideExit(s, 1000);
		expect(r.decision).toBe('block');
		expect(r.showHint).toBe(true);
		expect(r.next.active).toBe(true);
		expect(r.next.armedAt).toBe(1000);
		expect(isExitArmed(r.next, 1000)).toBe(true);
	});

	it('窗口内第二次放行并清 armedAt（仍由外层关 active）', () => {
		let s = setExitGuardActive(createExitGuardState(), true);
		const first = decideExit(s, 1000);
		expect(first.decision).toBe('block');
		s = first.next;
		const second = decideExit(s, 1000 + EXIT_GUARD_WINDOW_MS - 1);
		expect(second.decision).toBe('allow');
		expect(second.next.active).toBe(true);
		expect(second.next.armedAt).toBe(0);
	});

	it('窗口过期后再次拦截', () => {
		let s = setExitGuardActive(createExitGuardState(), true);
		s = decideExit(s, 1000).next;
		const late = decideExit(s, 1000 + EXIT_GUARD_WINDOW_MS + 1);
		expect(late.decision).toBe('block');
		expect(late.showHint).toBe(true);
		expect(late.next.armedAt).toBe(1000 + EXIT_GUARD_WINDOW_MS + 1);
	});

	it('离开对局（active=false）清掉武装', () => {
		let s = setExitGuardActive(createExitGuardState(), true);
		s = decideExit(s, 1000).next;
		s = setExitGuardActive(s, false);
		expect(s).toEqual({ active: false, armedAt: 0 });
		expect(decideExit(s, 1500).decision).toBe('allow');
	});

	it('重新进入对局时不继承旧 armedAt', () => {
		let s = setExitGuardActive(createExitGuardState(), true);
		s = decideExit(s, 1000).next;
		s = setExitGuardActive(s, false);
		s = setExitGuardActive(s, true);
		expect(s.armedAt).toBe(0);
		expect(decideExit(s, 2000).decision).toBe('block');
	});
});
