import { describe, expect, it } from 'vitest';
import { parseUiTheme, UI_THEMES, DEFAULT_UI_THEME } from './uiThemes';

describe('parseUiTheme', () => {
	it('只有三种，默认第一个（糖果）', () => {
		expect(UI_THEMES.map((t) => t.id)).toEqual(['a', 'b', 'c']);
		expect(DEFAULT_UI_THEME).toBe('a');
	});
	it('合法值（忽略大小写和空白），也认英文名 / 中文名', () => {
		expect(parseUiTheme('b')).toBe('b');
		expect(parseUiTheme(' C ')).toBe('c');
		expect(parseUiTheme('candy')).toBe('a');
		expect(parseUiTheme('Forest')).toBe('b');
		expect(parseUiTheme('ocean')).toBe('c');
		expect(parseUiTheme('海洋')).toBe('c');
	});
	it('界面名是孩子能懂的短词，不带字母', () => {
		for (const t of UI_THEMES) {
			expect(t.name.length).toBeLessThanOrEqual(3);
			expect(t.name).not.toMatch(/[A-Za-z]/);
		}
	});
	it('旧的 classic、空值、乱填都回到糖果', () => {
		for (const v of ['classic', 'default', '', null, undefined, 'x', 'ab']) expect(parseUiTheme(v)).toBe('a');
	});
});
