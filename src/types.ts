export type ProfileId = "ely" | "ira";

export type AvatarId =
  | "happy-poop"
  | "fart-cloud"
  | "toilet-roll-hero"
  | "butt-monster"
  | "smiling-toilet";

export type StrandId =
  | "number-recognition"
  | "cardinality"
  | "comparing"
  | "addition-subtraction"
  | "place-value"
  | "word-problems"
  | "measurement"
  | "time"
  | "money"
  | "data-graphs"
  | "geometry"
  | "equal-shares"
  | "arrays-odd-even";

export type TeachingMode = "example" | "practice" | "check" | "placement";

export type SkillStatus =
  | "not-started"
  | "learning"
  | "almost-there"
  | "mastered"
  | "review-needed";

export type ReadinessLabel =
  | "Not Yet"
  | "Growing"
  | "Strong"
  | "Grade-2 Ready"
  | "Beyond";

export type ActivityType =
  | "count-and-tap"
  | "drag-to-match"
  | "choose-the-answer"
  | "compare-two-groups"
  | "number-line-tap"
  | "fill-ten-frame"
  | "build-a-number"
  | "shape-sort"
  | "graph-reading"
  | "clock-choice"
  | "odd-even-pairing"
  | "array-counting"
  | "coin-counting"
  | "story-scene";

export type SessionLength = 5 | 8 | 10;

export interface AvatarDefinition {
  id: AvatarId;
  label: string;
  description: string;
  accent: string;
  glow: string;
}

export interface RewardDefinition {
  id: string;
  title: string;
  description: string;
  color: string;
}

export interface RewardUnlock {
  rewardId: string;
  unlockedAt: string;
}

export interface SkillDefinition {
  id: string;
  strandId: StrandId;
  level: number;
  title: string;
  summary: string;
  activityType: ActivityType;
  difficultyBand: string;
  scaffold: {
    concrete: string;
    pictorial: string;
    abstract: string;
  };
  prompt: string;
  celebrationTitle: string;
}

export interface StrandDefinition {
  id: StrandId;
  title: string;
  shortTitle: string;
  color: string;
  mascot: string;
  description: string;
  levels: SkillDefinition[];
}

export interface AnswerChoice {
  id: string;
  label: string;
  value: string | number;
  tint?: string;
  icon?: string;
}

export interface VisualGroup {
  id: string;
  label?: string;
  count: number;
  token: string;
  color: string;
}

export interface TenFrameData {
  target: number;
  filled: number;
}

export interface NumberLineData {
  start: number;
  end: number;
  target: number;
  jump?: number;
}

export interface BuildNumberData {
  hundreds: number;
  tens: number;
  ones: number;
  target: number;
}

export interface GraphBar {
  label: string;
  value: number;
  color: string;
}

export interface GraphData {
  bars: GraphBar[];
  question: string;
}

export interface ClockChoiceData {
  targetHour: number;
  targetMinute: number;
  label: string;
}

export interface ArrayData {
  rows: number;
  columns: number;
  target: number;
}

export interface StorySceneData {
  scene: string;
  equation: string;
}

export interface QuestionDefinition {
  id: string;
  skillId: string;
  strandId: StrandId;
  level: number;
  mode: TeachingMode;
  type: ActivityType;
  prompt: string;
  speech: string;
  supportText: string;
  hint: string;
  minResponseMs: number;
  choices: AnswerChoice[];
  correctChoiceId: string;
  groups?: VisualGroup[];
  tenFrame?: TenFrameData;
  numberLine?: NumberLineData;
  buildNumber?: BuildNumberData;
  graph?: GraphData;
  clockChoices?: ClockChoiceData[];
  arrayData?: ArrayData;
  story?: StorySceneData;
  targetLabel?: string;
}

export interface RecentScoredResult {
  questionId: string;
  answeredAt: string;
  firstTryCorrect: boolean;
  suspiciousFast: boolean;
  responseTimeMs: number;
}

export interface CheckpointResult {
  attemptedAt: string;
  score: number;
  passed: boolean;
}

export interface SkillProgress {
  skillId: string;
  status: SkillStatus;
  exampleSeen: boolean;
  guidedSuccesses: number;
  attempts: number;
  firstTryCorrectCount: number;
  scoredAttempts: number;
  hintsUsed: number;
  suspiciousFastAnswers: number;
  reviewDue: boolean;
  lastPracticedAt?: string;
  recentScoredResults: RecentScoredResult[];
  checkpointHistory: CheckpointResult[];
}

export interface StrandProgress {
  strandId: StrandId;
  currentLevel: number;
  highestUnlockedLevel: number;
  placementDone: boolean;
  placementConfidence: number;
  readiness: ReadinessLabel;
}

export interface SessionSummary {
  id: string;
  childId: ProfileId;
  startedAt: string;
  durationMinutes: SessionLength;
  itemsCompleted: number;
  firstTryCorrect: number;
  masteredSkills: string[];
  notes: string[];
}

export interface ChildProfile {
  id: ProfileId;
  displayName: string;
  aliases: string[];
  avatarId: AvatarId;
  preferredSessionLength: SessionLength;
  placementStarted: boolean;
  placementDone: boolean;
  currentStreak: number;
  lastActiveAt?: string;
  strandProgress: Record<StrandId, StrandProgress>;
  skillProgress: Record<string, SkillProgress>;
  recentSessions: SessionSummary[];
  unlockedRewards: RewardUnlock[];
}

export interface AppSettings {
  ttsEnabled: boolean;
  ttsRate: number;
}

export interface PersistedState {
  version: number;
  settings: AppSettings;
  profiles: Record<ProfileId, ChildProfile>;
}

export interface ParentGateChallenge {
  left: number;
  right: number;
  answer: number;
}

export interface PlacementProbe {
  strandId: StrandId;
  level: number;
  question: QuestionDefinition;
}

export interface PlacementProgress {
  probeIndex: number;
  probes: PlacementProbe[];
  scoresByStrand: Record<StrandId, number>;
}

export interface SessionTask {
  skillId: string;
  mode: TeachingMode;
  isCheckpoint?: boolean;
  question: QuestionDefinition;
  strandId: StrandId;
  level: number;
}

export interface ActiveSession {
  id: string;
  childId: ProfileId;
  durationMinutes: SessionLength;
  startedAt: string;
  targetItemCount: number;
  currentIndex: number;
  completedItems: number;
  firstTryCorrectTotal: number;
  suspiciousFastCount: number;
  masteredSkills: string[];
  focusStrands: StrandId[];
  tasks: SessionTask[];
  checkpointSkillId?: string;
  checkpointProgress: Record<string, { completed: number; correct: number }>;
  supportModeTurnsLeft: number;
  notes: string[];
}
