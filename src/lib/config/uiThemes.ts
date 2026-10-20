/**
 * 界面风格（预览用）：只换「外壳」的颜色 / 底色 / 圆角 / 间距，以及卷面在屏幕上的配色。
 * 不改横式数字槽、括号、竖式的对齐逻辑；打印 / 导出 PDF 时一律黑字白底。
 *
 * 选择方式：页面顶部「界面风格」切换，或网址 ?theme=a|b|c（?theme=classic 恢复原版）。
 * 选择会记在 localStorage，并由 app.html 里的内联脚本在首屏前写到 <html data-ui-theme>，避免闪烁。
 */
export type UiThemeId = 'classic' | 'a' | 'b' | 'c';

export interface UiTheme {
	id: UiThemeId;
	name: string;
	icon: string;
	/** 窄屏用的短名 */
	short: string;
	desc: string;
}

export const UI_THEMES: UiTheme[] = [
	{ id: 'classic', name: '原版', short: '原版', icon: '🧮', desc: '当前线上样式' },
	{ id: 'a', name: '清新童趣', short: '童趣', icon: '🎈', desc: '柔和粉彩、圆角卡片' },
	{ id: 'b', name: '纸感学习本', short: '纸感', icon: '📒', desc: '米白纸张、墨绿点缀' },
	{ id: 'c', name: '现代扁平', short: '扁平', icon: '🔷', desc: '清爽对比、利落间距' }
];

export const UI_THEME_STORAGE_KEY = 'little-math-ui-theme';

export function parseUiTheme(v: string | null | undefined): UiThemeId | null {
	const s = (v ?? '').trim().toLowerCase();
	if (s === 'a' || s === 'b' || s === 'c') return s;
	if (s === 'classic' || s === 'default' || s === 'original') return 'classic';
	return null;
}

/** 写到 <html>：原版不设属性，保证原版样式完全不变 */
export function applyUiTheme(id: UiThemeId) {
	if (typeof document === 'undefined') return;
	const el = document.documentElement;
	if (id === 'classic') el.removeAttribute('data-ui-theme');
	else el.setAttribute('data-ui-theme', id);
}

export function currentUiTheme(): UiThemeId {
	if (typeof document === 'undefined') return 'classic';
	return parseUiTheme(document.documentElement.getAttribute('data-ui-theme')) ?? 'classic';
}

export function setUiTheme(id: UiThemeId) {
	applyUiTheme(id);
	try {
		localStorage.setItem(UI_THEME_STORAGE_KEY, id);
	} catch {
		/* 隐私模式等忽略 */
	}
	try {
		const url = new URL(window.location.href);
		if (id === 'classic') url.searchParams.delete('theme');
		else url.searchParams.set('theme', id);
		history.replaceState(history.state, '', url);
	} catch {
		/* ignore */
	}
}
