import { describe, it, expect } from 'vitest';
import {
	createExitGuardState,
	setExitGuardActive,
	decideExit,
	isExitArmed,
	EXIT_GUARD_WINDOW_MS,
	EXIT_GUARD_HINT,
	EXIT_GUARD_HISTORY_KEY,
	hasExitGuardHistory,
	buildExitGuardHistoryState,
	stripExitGuardHistoryState,
	pushExitGuardHistory,
	ensureExitGuardPush,
	clearExitGuardHistory,
	handleExitGuardPopstate,
	type HistoryLike
} from './exitGuard.js';

function mockHistory(initialState: unknown = null): HistoryLike & { stack: unknown[] } {
	const stack: unknown[] = [initialState];
	const h: HistoryLike & { stack: unknown[] } = {
		stack,
		get state() {
			return stack[stack.length - 1];
		},
		pushState(data: unknown) {
			stack.push(data);
		},
		replaceState(data: unknown) {
			stack[stack.length - 1] = data;
		},
		back() {
			if (stack.length > 1) stack.pop();
		}
	};
	return h;
}

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

describe('exitGuard history 垫层', () => {
	it('build/has/strip 标记', () => {
		const built = buildExitGuardHistoryState({ theme: 'a' });
		expect(built[EXIT_GUARD_HISTORY_KEY]).toBe(true);
		expect(built.theme).toBe('a');
		expect(hasExitGuardHistory(built)).toBe(true);
		expect(hasExitGuardHistory(null)).toBe(false);
		expect(stripExitGuardHistoryState(built)).toEqual({ theme: 'a' });
	});

	it('ensureExitGuardPush 只垫一次', () => {
		const h = mockHistory({ keep: 1 });
		expect(ensureExitGuardPush(h)).toBe(true);
		expect(h.stack.length).toBe(2);
		expect(hasExitGuardHistory(h.state)).toBe(true);
		expect(ensureExitGuardPush(h)).toBe(false);
		expect(h.stack.length).toBe(2);
	});

	it('clearExitGuardHistory 用 replace 去掉标记', () => {
		const h = mockHistory(null);
		pushExitGuardHistory(h);
		expect(hasExitGuardHistory(h.state)).toBe(true);
		clearExitGuardHistory(h);
		expect(hasExitGuardHistory(h.state)).toBe(false);
		expect(h.stack.length).toBe(2);
	});

	it('popstate 第一次 repush，窗口内第二次 continueBack', () => {
		let s = setExitGuardActive(createExitGuardState(), true);
		const h = mockHistory(null);
		ensureExitGuardPush(h);
		expect(h.stack.length).toBe(2);

		// 模拟第一次侧滑：浏览器先 pop 掉垫层
		h.back();
		expect(h.stack.length).toBe(1);
		const first = handleExitGuardPopstate(s, 1000);
		expect(first.repush).toBe(true);
		expect(first.showHint).toBe(true);
		expect(first.continueBack).toBe(false);
		s = first.next;
		if (first.repush) pushExitGuardHistory(h);
		expect(h.stack.length).toBe(2);
		expect(hasExitGuardHistory(h.state)).toBe(true);

		// 第二次侧滑
		h.back();
		const second = handleExitGuardPopstate(s, 1500);
		expect(second.repush).toBe(false);
		expect(second.continueBack).toBe(true);
		expect(second.next.active).toBe(false);
		s = second.next;
		if (second.continueBack) h.back();
		// 底座条目仍在；真正离站由浏览器继续 pop 更早的条目
		expect(h.stack.length).toBe(1);
		expect(second.next.active).toBe(false);
	});

	it('未激活 popstate 不 re-push', () => {
		const s = createExitGuardState();
		const r = handleExitGuardPopstate(s, 1000);
		expect(r).toEqual({
			next: s,
			repush: false,
			continueBack: false,
			showHint: false
		});
	});
});
