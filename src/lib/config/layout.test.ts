import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './presets';
import { effectivePerPage, getLayout, isEffectiveVertical } from './layout';

describe('版式', () => {
	it('只有普通计算和凑数支持竖式，隐藏的竖式开关不生效', () => {
		expect(isEffectiveVertical({ isVertical: true, problemMode: 'normal' })).toBe(true);
		expect(isEffectiveVertical({ isVertical: true, problemMode: 'makeTarget' })).toBe(true);
		for (const m of ['chain', 'compare', 'remainder'] as const) expect(isEffectiveVertical({ isVertical: true, problemMode: m })).toBe(false);
	});
	it('每页题数不超过版式上限', () => {
		expect(getLayout({ ...DEFAULT_CONFIG, columns: 2 }).maxPerPage).toBe(24);
		expect(effectivePerPage({ ...DEFAULT_CONFIG, columns: 2, countPerPage: 30 })).toBe(24);
		expect(effectivePerPage({ ...DEFAULT_CONFIG, columns: 3, countPerPage: 30 })).toBe(30);
		expect(effectivePerPage({ ...DEFAULT_CONFIG, isVertical: true, countPerPage: 30 })).toBe(20);
		expect(effectivePerPage({ ...DEFAULT_CONFIG, countPerPage: NaN })).toBe(20);
	});
});
