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
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/env';
	import {
		createExitGuardState,
		decideExit,
		setExitGuardActive,
		ensureExitGuardPush,
		pushExitGuardHistory,
		clearExitGuardHistory,
		handleExitGuardPopstate,
		EXIT_GUARD_HINT,
		EXIT_GUARD_WINDOW_MS
	} from '#lib/services/exitGuard.js';
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
		shouldAutoSpeak,
		scheduleCorrectAdvance,
		type CorrectAdvanceHandle
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
	let correctAdvance: CorrectAdvanceHandle | undefined;
	/** 对局中防误退出（侧滑返回 / 顶栏导航 / 退出按钮） */
	let exitGuard = $state(createExitGuardState());
	let exitHint = $state('');
	let exitHintTimer: ReturnType<typeof setTimeout> | undefined;

	/** 在线练习不分页，校验时忽略「每页题数」 */
	const practiceIssues = $derived(validateConfig({ ...config, countPerPage: 1 }));

	$effect(() => {
		if (!browser) return;
		speechSupported = isSpeechSupported();
		voiceOn = isVoiceEnabled();
	});

	function flashExitHint() {
		exitHint = EXIT_GUARD_HINT;
		clearTimeout(exitHintTimer);
		exitHintTimer = setTimeout(() => {
			exitHint = '';
		}, EXIT_GUARD_WINDOW_MS);
	}

	/**
	 * 对局中：history.pushState 垫一层 + popstate 拦侧滑/系统返回；
	 * beforeNavigate 拦顶栏链接等（popstate 交给下面监听，避免双重 decideExit）。
	 */
	$effect(() => {
		const should = phase === 'practice';
		exitGuard = setExitGuardActive(untrack(() => exitGuard), should);
		if (!browser) return;

		if (!should) {
			exitHint = '';
			clearTimeout(exitHintTimer);
			try {
				clearExitGuardHistory(history);
			} catch {
				/* 隐私模式等忽略 */
			}
			return;
		}

		try {
			ensureExitGuardPush(history);
		} catch {
			/* ignore */
		}

		let bypassPop = false;
		const onPopState = () => {
			if (bypassPop) return;
			const r = handleExitGuardPopstate(untrack(() => exitGuard));
			exitGuard = r.next;
			if (r.repush) {
				try {
					pushExitGuardHistory(history);
				} catch {
					/* ignore */
				}
				if (r.showHint) flashExitHint();
			}
			if (r.continueBack) {
				// 垫层已被 pop；再 back 一次离开上一页（首页等）
				bypassPop = true;
				try {
					history.back();
				} finally {
					queueMicrotask(() => {
						bypassPop = false;
					});
				}
			}
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	beforeNavigate((nav) => {
		if (phase !== 'practice') return;
		// 侧滑/系统返回由 pushState + popstate 处理
		if (nav.type === 'popstate') return;
		// 仍停在 /practice（清 query、浅路由等）放行
		const staying = nav.to != null && nav.to.url.pathname === '/practice';
		if (staying) return;
		const r = decideExit(exitGuard);
		exitGuard = r.next;
		if (r.decision === 'block') {
			nav.cancel();
			if (r.showHint) flashExitHint();
		}
	});

	function startWith(list: AnyProblem[]) {
		if (list.length === 0) return false;
		correctAdvance?.cancel();
		correctAdvance = undefined;
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
		if (!voiceOn) {
			// 先取消等待，再 cancel 朗读，避免 onError 与新的 fallback 抢跑
			correctAdvance?.cancel();
			correctAdvance = undefined;
			stopSpeaking();
			// 关语音打断表扬时，退回短延时再跳题，避免卡在答对页
			if (feedback?.isCorrect) {
				correctAdvance = scheduleCorrectAdvance({
					voiceEnabled: false,
					speakCorrect: () => '答对啦！真棒！',
					advance: () => moveToNext({ cancelSpeech: false })
				});
			}
		}
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

		correctAdvance?.cancel();
		correctAdvance = undefined;
		clearTimeout(advanceTimer);
		clearTimeout(speakProblemTimer);
		// 打断读题，改念答对/答错反馈
		stopSpeaking();

		if (isCorrect) {
			correctAdvance = scheduleCorrectAdvance({
				voiceEnabled: voiceOn && speechSupported,
				speakCorrect: (cbs) => speakCorrect(cbs),
				advance: () => moveToNext({ cancelSpeech: false })
			});
			feedback = {
				isCorrect: true,
				correctText: answerText(problem),
				praise: correctAdvance.praise
			};
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

	function moveToNext(opts: { cancelSpeech?: boolean } = {}) {
		const cancelSpeech = opts.cancelSpeech !== false;
		correctAdvance?.cancel();
		correctAdvance = undefined;
		clearTimeout(advanceTimer);
		// 自动跳题不打断刚念完的表扬；手动下一题 / 离开才 cancel
		if (cancelSpeech) stopSpeaking();
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
		correctAdvance?.cancel();
		correctAdvance = undefined;
		stopSpeaking();
		phase = 'config';
		reviewMessage = null;
		if (page.url.searchParams.get('mode')) goto('/practice', { replace: true });
	}

	function handleBackHome() {
		correctAdvance?.cancel();
		correctAdvance = undefined;
		stopSpeaking();
		goto('/');
	}

	/** 页内「退出」：与侧滑返回同一套「再按一次」 */
	function requestLeavePractice() {
		const r = decideExit(exitGuard);
		exitGuard = r.next;
		if (r.decision === 'block') {
			if (r.showHint) flashExitHint();
			return;
		}
		handleRestart();
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
						<span class="progress-label">第 {currentIndex + 1} / {problems.length} 题</span>
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
						<button
							class="exit-btn ui-btn ui-btn-quiet"
							onclick={requestLeavePractice}
							title="退出本局"
							aria-label="退出本局"
							data-testid="practice-exit"
						>
							退出
						</button>
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
							<button class="next-btn ui-btn ui-btn-primary ui-btn-big" bind:this={nextBtn} onclick={() => moveToNext()}>
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

	{#if exitHint}
		<div class="exit-hint" data-testid="exit-hint" role="status" aria-live="polite">{exitHint}</div>
	{/if}

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
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.65rem 0.75rem;
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
		/* 不要 min-width:0，否则窄屏会把「第 N / M 题」挤成竖排 */
		flex: 1 1 8.5rem;
		min-width: 8.5rem;
	}
	.progress-label {
		display: block;
		white-space: nowrap;
		line-height: 1.3;
	}
	.progress-bar {
		display: block;
		height: 10px;
		width: 100%;
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
		gap: 0.45rem;
		flex: 1 1 auto;
		flex-wrap: wrap;
		justify-content: flex-end;
		min-width: 0;
	}
	.voice-toggle {
		min-width: 0;
		padding: 0 0.55rem;
		font-size: 0.95rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.voice-toggle.off {
		opacity: 0.65;
	}
	.speech-btn {
		min-width: 48px;
		padding: 0 0.55rem;
		font-size: 1.35rem;
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
	.exit-btn {
		flex: 0 0 auto;
		min-height: 40px;
		padding: 0 0.75rem;
		font-size: 0.95rem;
	}
	.exit-hint {
		position: fixed;
		left: 50%;
		bottom: 1.5rem;
		transform: translateX(-50%);
		z-index: 40;
		max-width: min(92vw, 22rem);
		padding: 0.7rem 1.1rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--c-ink) 88%, transparent);
		color: var(--c-surface);
		font-size: 1rem;
		font-weight: 700;
		text-align: center;
		box-shadow: 0 8px 24px color-mix(in srgb, var(--c-ink) 25%, transparent);
		pointer-events: none;
	}

	@media (max-width: 480px) {
		.practice-area {
			padding: 1.25rem 1rem 1.5rem;
		}
		.top-bar {
			flex-direction: column;
			align-items: stretch;
			gap: 0.55rem;
		}
		.progress {
			font-size: 1.1rem;
			flex: 0 0 auto;
			min-width: 0;
			width: 100%;
		}
		.progress-bar {
			max-width: none;
		}
		.top-bar-right {
			width: 100%;
			justify-content: flex-start;
			gap: 0.4rem;
		}
		.fb-title {
			font-size: 1.5rem;
		}
		.exit-hint {
			bottom: 1.1rem;
			font-size: 0.95rem;
		}
	}
</style>
