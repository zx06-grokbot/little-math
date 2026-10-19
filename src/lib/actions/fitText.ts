import type { Action } from 'svelte/action';

export type FitLineMeasure = {
	/** CSS 基准字号（px） */
	basePx: number;
	/** 格子可用宽度（px） */
	avail: number;
	/** 文字固有宽度（px） */
	need: number;
};

/**
 * 由各行测量结果算出整页统一字号（px）。
 * 每行先按「放得进格子」得到最大可用字号，再取全局最小，保证同页一致且不挤列。
 */
export function computeUniformFontPx(items: FitLineMeasure[]): number | null {
	if (!items.length) return null;
	const sizes = items.map(({ basePx, avail, need }) => {
		if (!(basePx > 0)) return 8;
		if (!(avail > 0) || need <= avail) return basePx;
		return Math.max(8, Math.floor(basePx * (avail / need) * 0.97 * 10) / 10);
	});
	return Math.min(...sizes);
}

/**
 * 挂在题目 `.grid` 上：按当前列宽为整页横式 `.line` 统一字号。
 * 列数变化 / 题目变化 / 容器尺寸变化时重算；用 CSS 变量，避免每题各自 sticky inline。
 */
export const fitSheetText: Action<HTMLElement, unknown> = (node) => {
	let frame = 0;
	const VAR = '--fit-line-size';

	const measureAndApply = () => {
		const lines = [...node.querySelectorAll<HTMLElement>(':scope > .h-cell > .line')];
		for (const line of lines) line.style.fontSize = '';
		node.style.removeProperty(VAR);

		if (!lines.length) return;

		const items: FitLineMeasure[] = [];
		for (const line of lines) {
			const parent = line.parentElement;
			if (!parent) continue;
			const cs = getComputedStyle(parent);
			const avail =
				parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 1;
			const basePx = parseFloat(getComputedStyle(line).fontSize);
			const need = line.scrollWidth;
			items.push({ basePx, avail, need });
		}

		const uniform = computeUniformFontPx(items);
		if (uniform == null) return;

		// 整页统一：写在 grid 上，所有 .line 通过 var() 继承同一值
		node.style.setProperty(VAR, `${uniform}px`);
	};

	const fit = () => {
		// 双 rAF：等列数 class / grid 模板完成布局后再量，避免残留上一列宽
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(measureAndApply);
		});
	};

	const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null;
	ro?.observe(node);

	fit();
	document.fonts?.ready.then(fit);

	return {
		update() {
			fit();
		},
		destroy() {
			cancelAnimationFrame(frame);
			ro?.disconnect();
			node.style.removeProperty(VAR);
			for (const line of node.querySelectorAll<HTMLElement>(':scope > .h-cell > .line')) {
				line.style.fontSize = '';
			}
		}
	};
};

/** @deprecated 旧 per-item API，保留别名以免外部误用；请用 fitSheetText */
export const fitText = fitSheetText;
