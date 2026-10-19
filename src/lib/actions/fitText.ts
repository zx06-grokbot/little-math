import type { Action } from 'svelte/action';

/**
 * 让一行文字缩小到放得进格子（不换行、不挤进隔壁列）。
 * 参数变化（题目或版式变了）时重新计算；字体加载完成后也会再算一次。
 */
export const fitText: Action<HTMLElement, unknown> = (node) => {
	let frame = 0;
	const fit = () => {
		node.style.fontSize = '';
		const parent = node.parentElement;
		if (!parent) return;
		const cs = getComputedStyle(parent);
		const avail = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 1;
		const need = node.scrollWidth;
		if (avail > 0 && need > avail) {
			const base = parseFloat(getComputedStyle(node).fontSize);
			node.style.fontSize = `${Math.max(8, Math.floor(base * (avail / need) * 0.97 * 10) / 10)}px`;
		}
	};
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(fit);
	};
	fit();
	document.fonts?.ready.then(schedule);
	return {
		update() {
			fit();
		},
		destroy() {
			cancelAnimationFrame(frame);
		}
	};
};
