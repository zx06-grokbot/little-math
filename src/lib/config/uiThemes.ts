/**
 * 界面风格（内部 id → 界面名）：a 🍬糖果（默认，柔和粉彩）/ b 🌳森林（米白纸 + 墨绿）/ c 🌊海洋（白底 + 蓝）。
 * 界面上只显示「糖果 / 森林 / 海洋」，不出现字母。
 * 全站页面（首页、在线练习、错题本、收藏、统计面板、提示）都用 $lib/styles/ui-themes.css 里的 CSS 变量；
 * 打印 / 导出 PDF 一律黑字白底。
 *
 * 选择方式：页头切换，或网址 ?theme=a|b|c（也认 candy / forest / ocean）；其它值（含旧的 classic）一律回到糖果。
 * 选择记在 localStorage，并由 app.html 里的内联脚本在首屏前写到 <html data-ui-theme>，避免闪烁。
 */
export type UiThemeId = 'a' | 'b' | 'c';

export interface UiTheme {
	id: UiThemeId;
	name: string;
	/** 窄屏用的短名 */
	short: string;
	icon: string;
	desc: string;
	/** 网址里也认的英文名 */
	alias: string;
}

export const UI_THEMES: UiTheme[] = [
	{ id: 'a', name: '糖果', short: '糖果', icon: '🍬', desc: '粉粉的糖果色', alias: 'candy' },
	{ id: 'b', name: '森林', short: '森林', icon: '🌳', desc: '绿绿的大森林', alias: 'forest' },
	{ id: 'c', name: '海洋', short: '海洋', icon: '🌊', desc: '蓝蓝的大海', alias: 'ocean' }
];

export const DEFAULT_UI_THEME: UiThemeId = 'a';
export const UI_THEME_STORAGE_KEY = 'little-math-ui-theme';

/** 认 a / b / c 和 candy / forest / ocean（也认中文名）；其它（空、classic、乱填）都回到默认糖果 */
export function parseUiTheme(v: string | null | undefined): UiThemeId {
	const s = (v ?? '').trim().toLowerCase();
	const hit = UI_THEMES.find((t) => t.id === s || t.alias === s || t.name === s);
	return hit ? hit.id : DEFAULT_UI_THEME;
}

export function applyUiTheme(id: UiThemeId) {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-ui-theme', parseUiTheme(id));
}

export function currentUiTheme(): UiThemeId {
	if (typeof document === 'undefined') return DEFAULT_UI_THEME;
	return parseUiTheme(document.documentElement.getAttribute('data-ui-theme'));
}

export function setUiTheme(id: UiThemeId) {
	const t = parseUiTheme(id);
	applyUiTheme(t);
	try {
		localStorage.setItem(UI_THEME_STORAGE_KEY, t);
	} catch {
		/* 隐私模式等忽略 */
	}
	try {
		const url = new URL(window.location.href);
		url.searchParams.set('theme', t);
		history.replaceState(history.state, '', url);
	} catch {
		/* ignore */
	}
}
