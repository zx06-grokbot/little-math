/**
 * 做题进行中防误退出：第一次返回/离开只提示，短时间内再操作才真正离开。
 * 状态机可单测；history 垫层配合 popstate，拦住手机侧滑返回。
 */

export const EXIT_GUARD_WINDOW_MS = 2000;

/** 提示文案（简体，适合家长/小孩） */
export const EXIT_GUARD_HINT = '再按一次就退出啦';

/** history.state 标记：对局中垫的一层 */
export const EXIT_GUARD_HISTORY_KEY = '__lmExitGuard';

export type ExitGuardDecision = 'block' | 'allow';

export type ExitGuardState = {
	/** 是否处于需要拦截的阶段（对局进行中） */
	active: boolean;
	/** 第一次拦截的时间戳；0 表示尚未拦截 */
	armedAt: number;
};

/** 可注入的 History，方便单测 */
export type HistoryLike = {
	state: unknown;
	pushState(data: unknown, unused: string, url?: string | URL | null): void;
	replaceState(data: unknown, unused: string, url?: string | URL | null): void;
	back(): void;
};

export function createExitGuardState(): ExitGuardState {
	return { active: false, armedAt: 0 };
}

/** 进入/离开对局时更新；离开时清掉「再按一次」窗口 */
export function setExitGuardActive(state: ExitGuardState, active: boolean): ExitGuardState {
	if (!active) return { active: false, armedAt: 0 };
	return { active: true, armedAt: state.active ? state.armedAt : 0 };
}

/**
 * 判断这次离开是否放行。
 * - 未激活 → allow（不改状态）
 * - 激活且距上次拦截仍在窗口内 → allow，仅清 armedAt（由外层改 phase / 离页来关掉 active）
 * - 否则 → block，并记下本次时间
 */
export function decideExit(
	state: ExitGuardState,
	now = Date.now(),
	windowMs = EXIT_GUARD_WINDOW_MS
): { decision: ExitGuardDecision; next: ExitGuardState; showHint: boolean } {
	if (!state.active) {
		return { decision: 'allow', next: state, showHint: false };
	}
	if (state.armedAt > 0 && now - state.armedAt <= windowMs) {
		return {
			decision: 'allow',
			next: { active: true, armedAt: 0 },
			showHint: false
		};
	}
	return {
		decision: 'block',
		next: { active: true, armedAt: now },
		showHint: true
	};
}

/** 窗口是否仍有效（用于 UI 提示是否还显示） */
export function isExitArmed(state: ExitGuardState, now = Date.now(), windowMs = EXIT_GUARD_WINDOW_MS): boolean {
	return state.active && state.armedAt > 0 && now - state.armedAt <= windowMs;
}

export function hasExitGuardHistory(state: unknown): boolean {
	return !!state && typeof state === 'object' && (state as Record<string, unknown>)[EXIT_GUARD_HISTORY_KEY] === true;
}

export function buildExitGuardHistoryState(prev: unknown): Record<string, unknown> {
	const base =
		prev && typeof prev === 'object' && !Array.isArray(prev)
			? { ...(prev as Record<string, unknown>) }
			: {};
	return { ...base, [EXIT_GUARD_HISTORY_KEY]: true };
}

export function stripExitGuardHistoryState(prev: unknown): Record<string, unknown> | null {
	if (!prev || typeof prev !== 'object' || Array.isArray(prev)) return null;
	const next = { ...(prev as Record<string, unknown>) };
	delete next[EXIT_GUARD_HISTORY_KEY];
	return next;
}

/** 强制垫一层（拦截侧滑后重新垫上时用） */
export function pushExitGuardHistory(history: HistoryLike): void {
	// url 用空串 = 保持当前地址，兼容侧滑手势依赖的 history 栈
	history.pushState(buildExitGuardHistoryState(history.state), '');
}

/** 进入对局时垫一层；若当前已是垫层则跳过 */
export function ensureExitGuardPush(history: HistoryLike): boolean {
	if (hasExitGuardHistory(history.state)) return false;
	pushExitGuardHistory(history);
	return true;
}

/** 离开对局：去掉当前条目上的垫层标记（不 pop，避免误离页） */
export function clearExitGuardHistory(history: HistoryLike): void {
	if (!hasExitGuardHistory(history.state)) return;
	history.replaceState(stripExitGuardHistoryState(history.state), '');
}

export type PopstateHandleResult = {
	next: ExitGuardState;
	/** 重新 push 垫层，挡住这一次侧滑 */
	repush: boolean;
	/** 再 history.back() 一次，真正离开 */
	continueBack: boolean;
	showHint: boolean;
};

/**
 * 处理 popstate（侧滑 / 系统返回）。
 * 第一次：repush + 提示；窗口内第二次：deactivate 并由调用方 continueBack。
 */
export function handleExitGuardPopstate(
	state: ExitGuardState,
	now = Date.now(),
	windowMs = EXIT_GUARD_WINDOW_MS
): PopstateHandleResult {
	if (!state.active) {
		return { next: state, repush: false, continueBack: false, showHint: false };
	}
	const r = decideExit(state, now, windowMs);
	if (r.decision === 'block') {
		return {
			next: r.next,
			repush: true,
			continueBack: false,
			showHint: r.showHint
		};
	}
	return {
		next: setExitGuardActive(r.next, false),
		repush: false,
		continueBack: true,
		showHint: false
	};
}
