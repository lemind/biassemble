/**
 * Application-wide constants.
 * No secrets, no prompts — safe for public repository.
 */

/** AI decides how many questions to generate. Bounds: 2–5. */
export const QUESTIONS_MIN = 2;
export const QUESTIONS_MAX = 5;

/** Maximum blank answers allowed before skipping. */
export const MAX_BLANK_ANSWERS = 2;

/** AI request retries (spec FR-007: 3× with exponential backoff). */
export const AI_MAX_RETRIES = 3;
export const AI_RETRY_BASE_DELAY_MS = 1000;