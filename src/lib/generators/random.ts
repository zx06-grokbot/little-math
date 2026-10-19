/** 可注入的随机数源，返回 [0, 1) 之间的数。默认使用 Math.random，测试中可传入固定种子。 */
export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

/** 小巧的可复现伪随机数生成器（mulberry32），用于测试和可复现出题。 */
export function seededRng(seed: number): Rng {
	let t = seed >>> 0;
	return () => {
		t = (t + 0x6d2b79f5) >>> 0;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

/** [lo, hi] 闭区间内的随机整数；区间为空时返回 null。 */
export function randInt(rng: Rng, lo: number, hi: number): number | null {
	lo = Math.ceil(lo);
	hi = Math.floor(hi);
	if (hi < lo) return null;
	return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
	return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(rng: Rng, items: T[]): T[] {
	const a = [...items];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
