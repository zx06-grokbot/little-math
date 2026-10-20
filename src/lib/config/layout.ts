import type { ExerciseConfig, ProblemMode } from '#lib/types.js';

/**
 * 打印版式：网页上的一「页」= 一张 A4 纸。
 * 每种版式每页最多能放的题数在这里统一定义，ExerciseSheet 按此计算行高，保证不溢出到第二张纸。
 */
export interface SheetLayout {
	/** 实际是否竖式（模式不支持竖式时为 false） */
	vertical: boolean;
	/** 每行几题 */
	columns: number;
	/** 每页最多题数 */
	maxPerPage: number;
	/** 切换到该版式时的默认每页题数 */
	defaultPerPage: number;
}

export const LAYOUT_LIMITS = {
	vertical: { columns: 4, maxPerPage: 20, defaultPerPage: 12 },
	cols2: { columns: 2, maxPerPage: 24, defaultPerPage: 20 },
	cols3: { columns: 3, maxPerPage: 51, defaultPerPage: 30 }
} as const;

/** 只有普通计算和凑数练习支持竖式；其余模式（连续运算、比较大小、有余数除法）一律横式 */
export function supportsVertical(mode: ProblemMode): boolean {
	return mode === 'normal' || mode === 'makeTarget';
}

export function isEffectiveVertical(config: Pick<ExerciseConfig, 'isVertical' | 'problemMode'>): boolean {
	return !!config.isVertical && supportsVertical(config.problemMode);
}

export function getLayout(config: Pick<ExerciseConfig, 'isVertical' | 'problemMode' | 'columns'>): SheetLayout {
	if (isEffectiveVertical(config)) return { vertical: true, ...LAYOUT_LIMITS.vertical };
	const l = config.columns === 3 ? LAYOUT_LIMITS.cols3 : LAYOUT_LIMITS.cols2;
	return { vertical: false, ...l };
}

/** 实际分页用的每页题数（总是在 1～maxPerPage 之间） */
export function effectivePerPage(config: Pick<ExerciseConfig, 'isVertical' | 'problemMode' | 'columns' | 'countPerPage'>): number {
	const layout = getLayout(config);
	const n = Math.floor(Number(config.countPerPage));
	if (!Number.isFinite(n) || n < 1) return layout.defaultPerPage;
	return Math.min(n, layout.maxPerPage);
}
