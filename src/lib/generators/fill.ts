import type { Rng } from './random';
import { shuffle } from './random';

export interface FillResult<T> {
	problems: T[];
	/** 实际生成的不同题目数量 */
	uniqueCount: number;
	/** 请求的题目数量 */
	requested: number;
}

/**
 * 先尽量生成不重复的题目；当前范围内的不同题目用完后，
 * 再用已生成的题目（打乱顺序、避免相邻重复）补足数量。
 * 不会再像以前一样悄悄少出题。
 */
export function fillProblems<T>(
	count: number,
	sample: () => T | null,
	key: (p: T) => string,
	rng: Rng
): FillResult<T> {
	const requested = Math.max(0, Math.floor(count));
	const unique: T[] = [];
	const seen = new Set<string>();
	const maxAttempts = Math.max(3000, requested * 200);
	// 连续这么多次都没有新题，就认为不同题目已经用完
	const patience = Math.max(600, requested * 20);
	let attempts = 0;
	let sinceLastNew = 0;

	while (unique.length < requested && attempts < maxAttempts && sinceLastNew < patience) {
		attempts++;
		sinceLastNew++;
		const p = sample();
		if (p === null) continue;
		const k = key(p);
		if (seen.has(k)) continue;
		seen.add(k);
		unique.push(p);
		sinceLastNew = 0;
	}

	const problems = [...unique];
	if (problems.length < requested && unique.length > 0) {
		let pool: T[] = [];
		while (problems.length < requested) {
			if (pool.length === 0) pool = shuffle(rng, unique);
			let idx = 0;
			// 避免与前一道完全相同
			if (unique.length > 1 && key(pool[0]) === key(problems[problems.length - 1])) idx = 1;
			problems.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
		}
	}

	return { problems, uniqueCount: unique.length, requested };
}
