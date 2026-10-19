import { describe, expect, it } from 'vitest';
import { defaultPdfFilename, localDateStamp } from './pdfExport';

describe('PDF 文件名日期', () => {
	it('使用本地时间而不是 UTC', () => {
		// 本地时间 2026-10-20 07:30（在 UTC+8 下对应 UTC 2026-10-19 23:30）
		const d = new Date(2026, 9, 20, 7, 30);
		expect(localDateStamp(d)).toBe('2026-10-20');
		expect(defaultPdfFilename(d)).toBe('数学练习_2026-10-20.pdf');
	});
});
