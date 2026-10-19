import { describe, expect, it } from 'vitest';
import { computeUniformFontPx } from './fitText';

describe('computeUniformFontPx', () => {
	it('空列表返回 null', () => {
		expect(computeUniformFontPx([])).toBeNull();
	});

	it('都能放下时取各行基准字号的最小值（整页统一）', () => {
		expect(
			computeUniformFontPx([
				{ basePx: 26, avail: 200, need: 100 },
				{ basePx: 23, avail: 200, need: 120 }
			])
		).toBe(23);
	});

	it('有溢出时按最紧的一行缩小，整页同一字号', () => {
		// 第二行需要缩到约 26 * (100/200) * 0.97 = 12.6 → floor 到 12.6
		const px = computeUniformFontPx([
			{ basePx: 26, avail: 200, need: 100 },
			{ basePx: 26, avail: 100, need: 200 }
		]);
		expect(px).toBe(Math.max(8, Math.floor(26 * (100 / 200) * 0.97 * 10) / 10));
		expect(px).toBe(12.6);
	});

	it('缩小不低于 8px', () => {
		expect(
			computeUniformFontPx([{ basePx: 26, avail: 10, need: 500 }])
		).toBe(8);
	});

	it('多行混合时取全局最小，避免同页多种字号', () => {
		const a = Math.max(8, Math.floor(21 * (80 / 120) * 0.97 * 10) / 10);
		const b = Math.max(8, Math.floor(21 * (90 / 100) * 0.97 * 10) / 10);
		const px = computeUniformFontPx([
			{ basePx: 21, avail: 80, need: 120 },
			{ basePx: 21, avail: 90, need: 100 },
			{ basePx: 21, avail: 200, need: 50 }
		]);
		expect(px).toBe(Math.min(a, b, 21));
		expect(px).toBe(a);
	});
});
