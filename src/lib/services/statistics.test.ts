import { beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
	private m = new Map<string, string>();
	getItem(k: string) {
		return this.m.has(k) ? this.m.get(k)! : null;
	}
	setItem(k: string, v: string) {
		this.m.set(k, String(v));
	}
	removeItem(k: string) {
		this.m.delete(k);
	}
	clear() {
		this.m.clear();
	}
}

beforeEach(() => {
	vi.stubGlobal('window', globalThis);
	vi.stubGlobal('localStorage', new MemoryStorage());
	vi.resetModules();
});

describe('统计与成就（第二轮问题 5）', () => {
	it('练习进度会写入，按答题数计成就，不因生成练习而解锁', async () => {
		const stats = await import('./statistics');
		const ach = await import('./achievements');
		for (let i = 0; i < 20; i++) stats.trackGeneration(['add'], 'grade1');
		expect(ach.checkAchievements(stats.getStats()).map((a) => a.id)).not.toContain('first-10');

		const p = { a: 1, b: 2, op: 'add', result: 3, blank: 'result' } as const;
		for (let i = 0; i < 9; i++) stats.trackAnswer({ ...p }, i % 2 === 0);
		expect(ach.checkAchievements(stats.getStats()).map((a) => a.id)).not.toContain('first-10');
		const s = stats.trackAnswer({ ...p }, true);
		expect(s.totalAnswered).toBe(10);
		expect(s.totalCorrect).toBe(6);
		expect(s.answeredByOp!.add).toBe(10);
		expect(ach.checkAchievements(s).map((a) => a.id)).toContain('first-10');

		stats.savePracticeProgress({ totalProblems: 10, correctProblems: 6, timeSpent: 60 });
		const today = stats.getDailyProgress(1)[0];
		expect(today.totalProblems).toBe(10);
		expect(today.correctRate).toBe(60);
	});

	it('重置不会污染初始常量', async () => {
		const stats = await import('./statistics');
		const { INITIAL_STATS } = await import('#lib/types.js');
		stats.trackVisit();
		stats.resetStats();
		stats.trackVisit();
		expect(INITIAL_STATS.totalVisits).toBe(0);
		expect(stats.getStats().totalVisits).toBe(1);
	});

	it('日期按本地时间', async () => {
		const stats = await import('./statistics');
		expect(stats.localDateKey(new Date(2026, 0, 2, 0, 30))).toBe('2026-01-02');
	});
});
