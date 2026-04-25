export type ProfileId = "ely" | "ira";

export type AvatarId =
  | "ninja-diaper"
  | "ninja-pipi"
  | "ninja-poo"
  | "ninja-stinky"
  | "farting-emoji"
  | "pooping-emoji"
  | "toilet-roll-hero"
  | "happy-poop"
  | "fart-cloud"
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

export type GradeBand = "K" | "G1" | "G2" | "K-G1" | "G1-G2" | "K-G2" | "Extension";

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
export type InstructionVisibility = "visible" | "minimal" | "audio-only";
export type ChoiceVisibility = "visible" | "audio-only";
export type LayoutMode = "grid" | "left-right" | "top-bottom" | "clock-grid";
export type ChoiceRenderKind =
  | "text"
  | "number"
  | "shape"
  | "clock"
  | "coin"
  | "fraction"
  | "position";
export type ShapeKind =
  | "circle"
  | "square"
  | "triangle"
  | "rectangle"
  | "quadrilateral"
  | "pentagon"
  | "hexagon"
  | "cube"
  | "sphere"
  | "cylinder"
  | "cone";
export type CoinKind = "penny" | "nickel" | "dime" | "quarter" | "dollar";

export interface SkillConstraints {
  maxNumber?: number;
  maxObjects?: number;
  maxCategories?: number;
  layoutConstraint?: "arranged" | "scattered" | "arranged-or-scattered" | "line" | "array" | "circle";
  allowedLayouts?: Array<
    | "line"
    | "array"
    | "circle"
    | "scattered"
    | "ten-frame"
    | "number-line"
    | "bar-graph"
    | "picture-graph"
    | "line-plot"
  >;
  avoidFormalMultiplication?: boolean;
  allowedFractionWords?: Array<
    "half" | "halves" | "third" | "thirds" | "fourth" | "fourths" | "quarter" | "quarters"
  >;
  allowFractionNotation?: boolean;
  maxArrayRows?: number;
  maxArrayColumns?: number;
  allowedCoins?: CoinKind[];
  timeMinuteIncrement?: 60 | 30 | 5;
  requireAmPm?: boolean;
  unknownPosition?: "result" | "change" | "start" | "any";
  allowedProblemTypes?: Array<"add-to" | "take-from" | "put-together" | "take-apart" | "compare">;
}

export interface SkillAlignment {
  ccssCodes: string[];
  gradeBand: GradeBand;
  isCoreK2: boolean;
  isExtension: boolean;
  alignmentNotes?: string;
  constraints?: SkillConstraints;
}

export interface SkillAlignmentSeed extends SkillAlignment {}

export type UxPedExerciseType =
  | "tap-to-count"
  | "choose-visual-answer"
  | "left-right-same"
  | "drag-to-category"
  | "build-model"
  | "match-pair"
  | "number-line-sequence"
  | "story-scene"
  | "read-model"
  | "explain-strategy";

export type UxPedLessonModel =
  | "show-and-name"
  | "worked-example"
  | "step-by-step-model"
  | "manipulative-demo"
  | "notice-pattern"
  | "mistake-contrast"
  | "strategy-choice";

export type UxPedVisualModel =
  | "objects-arranged"
  | "objects-scattered"
  | "ten-frame"
  | "part-part-whole"
  | "base-ten-blocks"
  | "number-line"
  | "clock-face"
  | "schedule-timeline"
  | "coin-set"
  | "bar-picture-graph"
  | "shape-model"
  | "equal-share-model"
  | "array-grid"
  | "measurement-lineup"
  | "story-scene-model";

export type UxPedFeedbackType =
  | "confirm-and-name"
  | "show-correction"
  | "counting-error-feedback"
  | "compare-again"
  | "model-step-again"
  | "strategy-reminder"
  | "mistake-contrast-feedback"
  | "reduce-and-retry-feedback"
  | "transfer-praise"
  | "next-step-feedback";

export type UxPedRescueMove =
  | "highlight-counted-objects"
  | "reduce-set-size"
  | "switch-scattered-to-arranged"
  | "align-compare-groups"
  | "show-one-more-one-less"
  | "short-hand-first"
  | "split-place-value"
  | "show-unit-iteration"
  | "highlight-relevant-graph-item"
  | "pair-and-leftover"
  | "equal-share-overlay"
  | "act-out-story"
  | "reduce-choice-load"
  | "build-with-guides"
  | "worked-example-reset";

export type UxPedLearningPhase =
  | "lesson"
  | "worked-example"
  | "guided-practice"
  | "independent-practice"
  | "feedback"
  | "rescue"
  | "mastery-check"
  | "review"
  | "next-step";

export type LearningPhase = UxPedLearningPhase;

export interface UxPedMasteryCheck {
  requiresFirstTry?: boolean;
  requiresNoHint?: boolean;
  requiresNoSuspiciousFastTap?: boolean;
  requiresRepresentationVariation?: boolean;
  suggestedWindow?: number;
  notes?: string;
}

export interface UxPedProfile {
  id: string;
  label: string;
  shortDescription: string;
  primaryExerciseType: UxPedExerciseType;
  secondaryExerciseType?: UxPedExerciseType;
  lessonModel: UxPedLessonModel;
  visualModel: UxPedVisualModel;
  feedbackType: UxPedFeedbackType;
  rescueMove: UxPedRescueMove;
  learningGoalTemplate: string;
  lessonFocus: string;
  guidedSupport: string;
  independentPracticeExpectation: string;
  commonMistakes: string[];
  masteryCheck: UxPedMasteryCheck;
  implementationNotes?: string;
  antiPatterns?: string[];
}

export interface SkillPedagogicalUxHook {
  pedagogicalUxProfileId?: string;
  pedagogicalUxProfile?: UxPedProfile;
}

export interface SkillPedagogicalUxMapping {
  profileId: string;
  sourceSectionTitle?: string;
  sourceSkillLabel?: string;
  primaryExerciseType: UxPedExerciseType;
  secondaryExerciseType?: UxPedExerciseType;
  lessonModel: UxPedLessonModel;
  visualModel: UxPedVisualModel;
  learningGoal: string;
  lessonFocus: string;
  commonMistakes: string[];
  feedbackType: UxPedFeedbackType;
  rescueMove: UxPedRescueMove;
  masteryCheck: string;
  implementationNote?: string;
}

export interface LessonStep {
  text: string;
  visualCue?: string;
  audioText?: string;
}

export interface WorkedExample {
  prompt: string;
  modelDescription: string;
  solutionSteps: string[];
  answerStatement: string;
}

export interface GuidedSupportDescriptor {
  supportType: string;
  behavior: string;
  removeWhen?: string;
}

export interface FeedbackDescriptor {
  correctPattern: string;
  incorrectPattern: string;
  misconceptionPatterns?: Record<string, string>;
}

export interface RescueDescriptor {
  trigger: string;
  rescueMove: UxPedRescueMove;
  simplifiedProfile?: string;
  explanation: string;
}

export interface MasteryCheckDescriptor {
  mode: "no-hint" | "mixed-variation" | "timed-careful" | "review";
  requirement: string;
  notCountedIf: string[];
}

export interface NextStepAdviceDescriptor {
  childMessage: string;
  parentMessage?: string;
  recommendedNextSkill?: string;
}

export interface SkillLearningScript {
  skillId: string;
  lessonTitle: string;
  lessonBigIdea: string;
  lessonSteps: LessonStep[];
  workedExample: WorkedExample;
  whatToNotice: string;
  guidedSupport: GuidedSupportDescriptor;
  feedback: FeedbackDescriptor;
  rescue: RescueDescriptor;
  masteryCheck: MasteryCheckDescriptor;
  nextStepAdvice: NextStepAdviceDescriptor;
}

export interface PedagogicalFeedback {
  status: "correct" | "incorrect" | "almost" | "careful-look";
  headline: string;
  explanation: string;
  mathReason?: string;
  nextAction?: string;
  rescueSuggested?: boolean;
  audioText?: string;
}

export interface AvatarDefinition {
  id: AvatarId;
  label: string;
  description: string;
  accent: string;
  glow: string;
  imageSrc: string;
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
  ccssCodes: string[];
  gradeBand: GradeBand;
  isCoreK2: boolean;
  isExtension: boolean;
  alignmentNotes?: string;
  constraints?: SkillConstraints;
  pedagogicalUxProfileId?: string;
  pedagogicalUxProfile?: UxPedProfile;
  pedagogicalUx?: SkillPedagogicalUxMapping;
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
  cardVisualSrc?: string;
  levels: SkillDefinition[];
}

export interface AnswerChoice {
  id: string;
  label: string;
  value: string | number;
  speechLabel?: string;
  renderKind?: ChoiceRenderKind;
  tint?: string;
  icon?: string;
  shape?: ShapeKind;
  coin?: CoinKind;
  numericValue?: number;
  partition?: {
    shape: "circle" | "bar" | "rectangle";
    parts: number;
    equal: boolean;
    highlightedParts?: number;
  };
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
  graphKind?: "bar-graph" | "picture-graph" | "line-plot";
  bars: GraphBar[];
  question: string;
}

export interface ClockChoiceData {
  targetHour: number;
  targetMinute: number;
  label: string;
}

export interface CoinVisual {
  id: string;
  kind: CoinKind;
  label: string;
  value: number;
}

export interface CountTapData {
  total: number;
  token: string;
  color: string;
  layout?: "arranged" | "scattered" | "line" | "array" | "circle";
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

export interface QuestionPresentation {
  instructionVisibility: InstructionVisibility;
  choiceVisibility: ChoiceVisibility;
  layout: LayoutMode;
  promptCue?: PromptCueData;
}

export interface PromptCueData {
  visualKey: string;
  count: number;
}

export interface DragTarget {
  id: string;
  label: string;
  position?: "left" | "right" | "center";
}

export interface DragModel {
  mode: "choice-to-target" | "prompt-to-zones";
  promptItem?: AnswerChoice;
  targets: DragTarget[];
}

export interface QuestionExplanation {
  text: string;
  speech: string;
  correctAnswerLabel: string;
}

export interface QuestionDefinition {
  id: string;
  skillId: string;
  strandId: StrandId;
  level: number;
  ccssCodes?: string[];
  gradeBand?: GradeBand;
  constraints?: SkillConstraints;
  mode: TeachingMode;
  type: ActivityType;
  prompt: string;
  speech: string;
  supportText: string;
  hint: string;
  hintSpeech?: string;
  minResponseMs: number;
  choices: AnswerChoice[];
  correctChoiceId: string;
  presentation: QuestionPresentation;
  explanation: QuestionExplanation;
  groups?: VisualGroup[];
  tenFrame?: TenFrameData;
  numberLine?: NumberLineData;
  buildNumber?: BuildNumberData;
  graph?: GraphData;
  clockChoices?: ClockChoiceData[];
  coins?: CoinVisual[];
  countTap?: CountTapData;
  drag?: DragModel;
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
  selectedVoiceURI?: string;
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
  focusLabel?: string;
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
