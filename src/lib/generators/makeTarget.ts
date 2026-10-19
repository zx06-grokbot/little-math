import type { MakeTargetProblem, MakeTargetValue } from '$lib/types';
import type { Rng } from './random';
import { defaultRng } from './random';
import { fillProblems, type FillResult } from './fill';

export function generateMakeTargetProblem(target: MakeTargetValue, rng: Rng = defaultRng): MakeTargetProblem {
	const a = Math.floor(rng() * (target - 1)) + 1;
	return { type: 'makeTarget', a, target, answer: target - a, blankFirst: rng() < 0.5 };
}

export function generateMakeTargetProblemsDetailed(
	target: MakeTargetValue,
	count: number,
	rng: Rng = defaultRng
): FillResult<MakeTargetProblem> {
	return fillProblems(count, () => generateMakeTargetProblem(target, rng), (p) => `${p.a}-${p.blankFirst}`, rng);
}

export function generateMakeTargetProblems(
	target: MakeTargetValue,
	count: number,
	rng: Rng = defaultRng
): MakeTargetProblem[] {
	return generateMakeTargetProblemsDetailed(target, count, rng).problems;
}
