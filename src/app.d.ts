// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** 做题对局中 history 垫层标记（防侧滑误退出） */
			__lmExitGuard?: boolean;
		}
		// interface Platform {}
	}
}

export {};
