<script lang="ts">
	import { untrack } from 'svelte';
	import type { ExerciseConfig, RemainderProblem, AnyProblem, CompareSymbol } from '#lib/types.js';
	import { DEFAULT_CONFIG } from '#lib/config/presets.js';
	import { generateWorksheet } from '#lib/generators/worksheet.js';
	import { validateConfig } from '#lib/generators/validate.js';
	import { correctAnswerOf, formatProblemText, isCompare, isRemainder } from '#lib/format.js';
	import Timer from '#lib/components/Timer.svelte';
	import AnswerInput from '#lib/components/AnswerInput.svelte';
	import CompareInput from '#lib/components/CompareInput.svelte';
	import RemainderInput from '#lib/components/RemainderInput.svelte';
	import ProblemDisplay from '#lib/components/ProblemDisplay.svelte';
	import PracticeResult from '#lib/components/PracticeResult.svelte';
	import PracticeConfig from '#lib/components/PracticeConfig.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/env';
	import { addWrongRecord, generateWrongReview } from '#lib/services/wrongBook.js';
	import { generateFavoriteReview } from '#lib/services/favorites.js';
	import { checkAchievements, type Achievement } from '#lib/services/achievements.js';
	import {
		speakProblem,
		speakCorrect,
		speakWrong,
		stopSpeaking,
		isSpeechSupported,
		isVoiceEnabled,
		setVoiceEnabled,
		shouldAutoSpeak
	} from '#lib/services/speech.js';
	import { savePracticeProgress, trackAnswer, getStats } from '#lib/services/statistics.js';
	import AchievementToast from '#lib/components/AchievementToast.svelte';

	interface AnswerRecord {
		problem: AnyProblem;
		userAnswer: number | CompareSymbol | string;
		correctAnswer: number | CompareSymbol | string;
		isCorrect: boolean;
	}

	interface Feedback {
		isCorrect: boolean;
		correctText: string;
		praise?: string;
	}

	let config: ExerciseConfig = $state({ ...DEFAULT_CONFIG, totalCount: 10 });
	let problems: AnyProblem[] = $state([]);
	let currentIndex = $state(0);
	let correctCount = $state(0);
	let phase: 'config' | 'practice' | 'result' = $state('config');
	let timerRunning = $state(false);
	let finalTime = $state(0);
	let answerRecords: AnswerRecord[] = $state([]);
	let feedback = $state<Feedback | null>(null);
	let startError = $state<string | null>(null);
	let reviewMessage = $state<string | null>(null);

	let timerRef: { reset: () => void; getSeconds: () => number } | undefined = $state();
	let answerInputRef: { focus: () => void; clear: () => void } | undefined = $state();
	let remainderInputRef: { focus: () => void; clear: () => void } | undefined = $state();
	let nextBtn: HTMLButtonElement | undefined = $state();
	let unlockedAchievements = $state<Achievement[]>([]);
	let speechSupported = $state(false);
	let voiceOn = $state(true);
	let advanceTimer: ReturnType<typeof setTimeout> | undefined;
	let speakProblemTimer: ReturnType<typeof setTimeout> | undefined;

	/** 在线练习不分页，校验时忽略「每页题数」 */
	const practiceIssues = $derived(validateConfig({ ...config, countPerPage: 1 }));

	$effect(() => {
		if (!browser) return;
		speechSupported = isSpeechSupported();
		voiceOn = isVoiceEnabled();
	});

	function startWith(list: AnyProblem[]) {
		if (list.length === 0) return false;
		stopSpeaking();
		clearTimeout(advanceTimer);
		clearTimeout(speakProblemTimer);
		problems = list;
		currentIndex = 0;
		correctCount = 0;
		answerRecords = [];
		feedback = null;
		phase = 'practice';
		timerRunning = true;
		timerRef?.reset();
		return true;
	}

	function handleStart() {
		startError = null;
		const r = generateWorksheet({ ...$state.snapshot(config), countPerPage: 1 } as ExerciseConfig);
		if (r.issues.length || r.problems.length === 0) {
			startError = r.issues[0]?.message ?? '这样出不了题，换一换试试';
			return;
		}
		startWith(r.problems);
	}

	$effect(() => {
		if (!browser) return;
		const mode = page.url.searchParams.get('mode');
		untrack(() => {
			if (mode === 'wrong-review' || mode === 'favorite-review') {
				const list = mode === 'wrong-review' ? generateWrongReview(10) : generateFavoriteReview(10);
				if (!startWith(list)) {
					reviewMessage = mode === 'wrong-review' ? '🎉 没有做错的题，先来玩几道吧！' : '⭐ 还没有收藏的题，先来玩几道吧！';
				}
			}
		});
	});

	$effect(() => {
		if (phase === 'practice' && problems.length > 0 && !feedback) {
			const currentProblem = problems[currentIndex];
			setTimeout(() => {
				if (isRemainder(currentProblem)) remainderInputRef?.focus();
				else if (!isCompare(currentProblem)) answerInputRef?.focus();
			}, 0);
		}
	});

	/** 出新题自动念；切题/有反馈时取消 */
	$effect(() => {
		if (!browser) return;
		const idx = currentIndex;
		const inPractice = phase === 'practice';
		const hasFeedback = feedback !== null;
		const listLen = problems.length;
		clearTimeout(speakProblemTimer);
		if (!inPractice || hasFeedback || listLen === 0) return;
		const problem = problems[idx];
		if (!problem) return;
		if (!shouldAutoSpeak() || !voiceOn) {
			stopSpeaking();
			return;
		}
		speakProblemTimer = setTimeout(() => {
			if (shouldAutoSpeak() && voiceOn) speakProblem(problem);
		}, 120);
		return () => {
			clearTimeout(speakProblemTimer);
		};
	});

	function answerText(p: AnyProblem): string {
		if (isRemainder(p)) return `商 ${p.quotient}，余数 ${p.remainder}`;
		return String(correctAnswerOf(p));
	}

	function toggleVoice() {
		voiceOn = !voiceOn;
		setVoiceEnabled(voiceOn);
		if (!voiceOn) stopSpeaking();
	}

	function replayProblem() {
		if (!voiceOn || !speechSupported) return;
		speakProblem(problems[currentIndex]);
	}

	/** 记录一道题的作答并显示即时反馈 */
	function record(userAnswer: AnswerRecord['userAnswer'], correctAnswer: AnswerRecord['correctAnswer'], isCorrect: boolean) {
		const problem = problems[currentIndex];
		answerRecords.push({ problem, userAnswer, correctAnswer, isCorrect });
		if (isCorrect) correctCount++;
		else addWrongRecord($state.snapshot(problem) as AnyProblem, userAnswer, correctAnswer);
		const stats = trackAnswer(problem, isCorrect);
		const fresh = checkAchievements(stats);
		if (fresh.length) unlockedAchievements = [...unlockedAchievements, ...fresh];

		clearTimeout(advanceTimer);
		clearTimeout(speakProblemTimer);
		stopSpeaking();

		if (isCorrect) {
			let praise = '答对啦！真棒！';
			if (voiceOn && speechSupported) {
				try {
					praise = speakCorrect();
				} catch {
					/* 朗读失败不挡反馈 */
				}
			}
			feedback = { isCorrect: true, correctText: answerText(problem), praise };
			// 约 0.8 秒后自动下一题（切题时 cancel 朗读，避免叠音）
			advanceTimer = setTimeout(moveToNext, 800);
		} else {
			feedback = { isCorrect: false, correctText: answerText(problem) };
			if (voiceOn && speechSupported) {
				try {
					speakWrong(problem);
				} catch {
					/* 朗读失败不挡反馈 */
				}
			}
			setTimeout(() => nextBtn?.focus(), 0);
		}
	}

	function handleAnswer(answer: number) {
		if (feedback) return;
		const correct = correctAnswerOf(problems[currentIndex]) as number;
		record(answer, correct, answer === correct);
	}

	function handleRemainderAnswer(answer: { quotient: number; remainder: number }) {
		if (feedback) return;
		const problem = problems[currentIndex] as RemainderProblem;
		let isCorrect = true;
		if ((problem.blank === 'quotient' || problem.blank === 'both') && answer.quotient !== problem.quotient) isCorrect = false;
		if ((problem.blank === 'remainder' || problem.blank === 'both') && answer.remainder !== problem.remainder) isCorrect = false;
		const userAnswerStr =
			problem.blank === 'both'
				? `商: ${answer.quotient}, 余数: ${answer.remainder}`
				: problem.blank === 'quotient'
					? `商: ${answer.quotient}`
					: `余数: ${answer.remainder}`;
		record(userAnswerStr, `商: ${problem.quotient}, 余数: ${problem.remainder}`, isCorrect);
	}

	function handleCompareAnswer(answer: CompareSymbol) {
		if (feedback) return;
		const problem = problems[currentIndex];
		if (!isCompare(problem)) return;
		record(answer, problem.answer, answer === problem.answer);
	}

	function moveToNext() {
		clearTimeout(advanceTimer);
		stopSpeaking();
		feedback = null;
		if (currentIndex < problems.length - 1) {
			currentIndex++;
			answerInputRef?.clear();
			remainderInputRef?.clear();
		} else {
			timerRunning = false;
			finalTime = timerRef?.getSeconds() ?? 0;
			savePracticeProgress({ totalProblems: problems.length, correctProblems: correctCount, timeSpent: finalTime });
			const fresh = checkAchievements(getStats());
			if (fresh.length) unlockedAchievements = [...unlockedAchievements, ...fresh];
			phase = 'result';
		}
	}

	function handleRestart() {
		stopSpeaking();
		phase = 'config';
		reviewMessage = null;
		if (page.url.searchParams.get('mode')) goto('/practice', { replace: true });
	}

	function handleBackHome() {
		stopSpeaking();
		goto('/');
	}
</script>

<svelte:head>
	<title>做题 - 小小数学家</title>
</svelte:head>

<div class="practice-page ui-page">
	<main>
		{#if phase === 'config'}
			{#if reviewMessage}<p class="review-msg" data-testid="review-msg">{reviewMessage}</p>{/if}
			<PracticeConfig
				bind:config
				issues={practiceIssues}
				error={startError}
				onStart={handleStart}
				{speechSupported}
				bind:voiceOn
				onToggleVoice={toggleVoice}
			/>
		{:else if phase === 'practice' && problems.length > 0}
			<div class="practice-area ui-card" data-testid="practice-area">
				<div class="top-bar">
					<div class="progress" data-testid="practice-progress">
						第 {currentIndex + 1} / {problems.length} 题
						<span class="progress-bar" aria-hidden="true"><span style="width: {((currentIndex + 1) / problems.length) * 100}%"></span></span>
					</div>
					<div class="top-bar-right">
						{#if speechSupported}
							<button
								class="voice-toggle ui-btn ui-btn-quiet"
								class:off={!voiceOn}
								onclick={toggleVoice}
								title={voiceOn ? '关闭语音' : '打开语音'}
								aria-label={voiceOn ? '关闭语音' : '打开语音'}
								aria-pressed={voiceOn}
								data-testid="voice-toggle"
							>
								{voiceOn ? '🔊 语音' : '🔇 语音'}
							</button>
							{#if voiceOn}
								<button
									class="speech-btn ui-btn ui-btn-quiet"
									onclick={replayProblem}
									title="读给我听"
									aria-label="读给我听"
									data-testid="speech-btn"
								>
									🔊
								</button>
							{/if}
						{/if}
						<Timer bind:this={timerRef} running={timerRunning} />
					</div>
				</div>
				<ProblemDisplay problem={problems[currentIndex]} />
				{#if feedback}
					<div class="feedback" class:ok={feedback.isCorrect} class:bad={!feedback.isCorrect} data-testid="feedback" role="status">
						{#if feedback.isCorrect}
							<div class="fb-title">🎉 {feedback.praise ?? '答对啦！真棒！'}</div>
						{:else}
							<div class="fb-title">🤗 再想想</div>
							<div class="fb-answer">正确答案：<strong>{feedback.correctText}</strong></div>
							<div class="full">{formatProblemText(problems[currentIndex], true)}</div>
							<button class="next-btn ui-btn ui-btn-primary ui-btn-big" bind:this={nextBtn} onclick={moveToNext}>
								{currentIndex < problems.length - 1 ? '下一题 👉' : '看看成绩 🏅'}
							</button>
						{/if}
					</div>
				{:else if isCompare(problems[currentIndex])}
					<CompareInput onSubmit={handleCompareAnswer} />
				{:else if isRemainder(problems[currentIndex])}
					<RemainderInput
						bind:this={remainderInputRef}
						blank={(problems[currentIndex] as RemainderProblem).blank}
						onSubmit={handleRemainderAnswer}
					/>
				{:else}
					<AnswerInput bind:this={answerInputRef} onSubmit={handleAnswer} />
				{/if}
			</div>
		{:else if phase === 'result'}
			<PracticeResult
				total={problems.length}
				correct={correctCount}
				timeSpent={finalTime}
				records={answerRecords}
				voiceEnabled={voiceOn && speechSupported}
				onRestart={handleRestart}
				onBackHome={handleBackHome}
			/>
		{/if}
	</main>

	<!-- 成就提示 -->
	{#each unlockedAchievements as achievement (achievement.id)}
		<AchievementToast
			{achievement}
			onClose={() => {
				unlockedAchievements = unlockedAchievements.filter((a) => a.id !== achievement.id);
			}}
		/>
	{/each}
</div>

<style>
	.practice-area {
		max-width: 640px;
		margin: 0 auto;
		padding: 1.75rem 2rem 2rem;
	}
	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px dashed var(--c-border);
	}
	.progress {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--c-muted);
		min-width: 0;
		flex: 1 1 auto;
	}
	.progress-bar {
		display: block;
		height: 10px;
		max-width: 260px;
		border-radius: 999px;
		background: var(--c-surface-2);
		overflow: hidden;
	}
	.progress-bar > span {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--c-chart-1);
		transition: width 0.3s;
	}
	.top-bar-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 0 0 auto;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.voice-toggle {
		min-width: 4.5rem;
		padding: 0 0.65rem;
		font-size: 1rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.voice-toggle.off {
		opacity: 0.65;
	}
	.speech-btn {
		min-width: 56px;
		padding: 0 0.75rem;
		font-size: 1.5rem;
	}
	.feedback {
		margin-top: 0.5rem;
		padding: 1.1rem 1.25rem 1.25rem;
		border-radius: var(--c-radius);
		text-align: center;
		font-size: 1.35rem;
	}
	.fb-title {
		font-size: 1.8rem;
		font-weight: 800;
	}
	.fb-answer {
		margin-top: 0.4rem;
	}
	.feedback.ok {
		background: var(--c-success-soft);
		color: var(--c-success);
	}
	.feedback.bad {
		background: var(--c-danger-soft);
		color: var(--c-danger);
	}
	.feedback .full {
		margin-top: 0.5rem;
		font-size: 1.2rem;
		color: var(--c-text);
	}
	.next-btn {
		margin-top: 1rem;
		min-width: 12rem;
	}
	.review-msg {
		max-width: 480px;
		margin: 0 auto 1rem;
		padding: 0.9rem 1.1rem;
		border-radius: var(--c-radius);
		background: var(--c-warn-soft);
		color: var(--c-warn);
		text-align: center;
		font-size: 1.15rem;
	}

	@media (max-width: 480px) {
		.practice-area {
			padding: 1.25rem 1rem 1.5rem;
		}
		.progress {
			font-size: 1.1rem;
		}
		.fb-title {
			font-size: 1.5rem;
		}
	}
</style>
