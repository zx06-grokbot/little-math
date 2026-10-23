/**
 * 做题进行中防误退出：第一次返回/离开只提示，短时间内再操作才真正离开。
 * 纯状态机，不碰 DOM / history，方便单测与和 SvelteKit beforeNavigate 配合。
 */

export const EXIT_GUARD_WINDOW_MS = 2000;

/** 提示文案（简体，适合家长/小孩） */
export const EXIT_GUARD_HINT = '再按一次就退出啦';

export type ExitGuardDecision = 'block' | 'allow';

export type ExitGuardState = {
	/** 是否处于需要拦截的阶段（对局进行中） */
	active: boolean;
	/** 第一次拦截的时间戳；0 表示尚未拦截 */
	armedAt: number;
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
