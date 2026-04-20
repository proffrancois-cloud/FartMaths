import type { ActivityType } from "../types";

export const APP_STATE_VERSION = 1;

export const GUIDED_SUCCESS_TARGET = 3;
export const SCORED_WINDOW = 20;
export const REQUIRED_FIRST_TRY_IN_WINDOW = 19;
export const MAX_SUSPICIOUS_IN_WINDOW = 2;
export const CHECKPOINT_LENGTH = 5;
export const CHECKPOINT_PASS_SCORE = 4;
export const FAST_WRONG_RESCUE_LIMIT = 3;
export const FAST_WRONG_RESCUE_WINDOW = 5;
export const NEW_LEVEL_RESCUE_SAMPLE = 10;
export const NEW_LEVEL_RESCUE_FIRST_TRY_MIN = 6;

export const DEFAULT_SETTINGS = {
  ttsEnabled: true,
  ttsRate: 0.96
} as const;

export const DEFAULT_SESSION_LENGTH = 8 as const;

export const SESSION_ITEM_TARGETS = {
  5: 12,
  8: 18,
  10: 24
} as const;

export const MASTERY_LABELS = {
  "not-started": "Not started",
  learning: "Learning",
  "almost-there": "Almost there",
  mastered: "Mastered",
  "review-needed": "Review needed"
} as const;

export const ACTIVITY_MIN_RESPONSE_MS: Record<ActivityType, number> = {
  "count-and-tap": 900,
  "drag-to-match": 850,
  "choose-the-answer": 1100,
  "compare-two-groups": 1100,
  "number-line-tap": 1200,
  "fill-ten-frame": 1300,
  "build-a-number": 1400,
  "shape-sort": 1100,
  "graph-reading": 1300,
  "clock-choice": 1300,
  "odd-even-pairing": 1200,
  "array-counting": 1250,
  "coin-counting": 1450,
  "story-scene": 1600
};

export const PLACEMENT_LEVELS = [2, 5] as const;

export const READYNESS_BANDS = [
  { maxLevel: 2, label: "Not Yet" },
  { maxLevel: 5, label: "Growing" },
  { maxLevel: 7, label: "Strong" },
  { maxLevel: 9, label: "Grade-2 Ready" },
  { maxLevel: 99, label: "Beyond" }
] as const;

export const EXAMPLE_COPY = {
  intro: "Watch the silly example first, then try it yourself.",
  guided: "Nice job. We'll do a few guided ones together.",
  check: "Time for a careful check. No hints this round."
} as const;

export const REVIEW_MIX = {
  current: 0.7,
  previous: 0.2,
  olderWeak: 0.1
} as const;

export const RESCUE_MIX = {
  previous: 0.5,
  current: 0.4,
  support: 0.1
} as const;
