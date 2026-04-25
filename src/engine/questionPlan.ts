import type {
  ActivityType,
  CoinKind,
  LayoutMode,
  QuestionDefinition,
  SkillDefinition,
  SkillPedagogicalUxMapping,
  TeachingMode,
  UxPedExerciseType,
  UxPedFeedbackType,
  UxPedLessonModel,
  UxPedRescueMove,
  UxPedVisualModel
} from "../types";

export interface QuestionGenerationConstraints {
  minNumber?: number;
  maxNumber?: number;
  maxObjects?: number;
  maxScatteredObjects?: number;
  maxArrangedObjects?: number;
  maxChoices?: number;
  minChoices?: number;
  allowedLayouts?: LayoutMode[];
  requiredLayout?: LayoutMode;
  maxGraphCategories?: number;
  maxArrayRows?: number;
  maxArrayColumns?: number;
  allowedMinuteIncrements?: number[];
  allowedCoinKinds?: CoinKind[];
  allowBills?: boolean;
  allowedFractionWords?: Array<"half" | "third" | "fourth" | "quarter">;
  allowFractionSymbols?: boolean;
  avoidFormalMultiplication?: boolean;
  requireVisualModel?: boolean;
  requireAudioSafePrompt?: boolean;
  maxPromptWords?: number;
  maxSupportTextWords?: number;
  allowSymbolicEquation?: boolean;
  requireConcreteModel?: boolean;
  requireExplanation?: boolean;
}

export interface QuestionAnatomySpec {
  requiredQuestionFields: Array<keyof QuestionDefinition>;
  requiredVisualData:
    | "groups"
    | "choices"
    | "clockChoices"
    | "coinVisuals"
    | "graphBars"
    | "arrayData"
    | "drag"
    | "numberLine"
    | "shapeData"
    | "none";
  requiredInteraction:
    | "tap"
    | "choice"
    | "drag"
    | "build"
    | "read-model"
    | "sequence";
  mustHaveChoices: boolean;
  mustHaveCorrectChoiceId: boolean;
  requiresLargeVisualModel: boolean;
  canUseTextOnly: boolean;
  expectedActivityType: ActivityType;
}

export interface QuestionGenerationPlan {
  skill: SkillDefinition;
  mode: TeachingMode;
  uxProfile: SkillPedagogicalUxMapping;
  uxProfileId: string;
  primaryUxActivity: UxPedExerciseType;
  secondaryUxActivity?: UxPedExerciseType;
  resolvedUxActivity: UxPedExerciseType;
  activityType: ActivityType;
  lessonModel: UxPedLessonModel;
  visualModel: UxPedVisualModel;
  feedbackType: UxPedFeedbackType;
  rescueMove: UxPedRescueMove;
  gradeBand?: string;
  ccssCodes?: string[];
  constraints: QuestionGenerationConstraints;
  anatomy: QuestionAnatomySpec;
  generationIntent:
    | "lesson-example"
    | "guided-practice"
    | "independent-practice"
    | "mastery-check"
    | "review";
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

export interface QuestionValidationIssue {
  severity: "error" | "warning";
  code:
    | "missing-required-field"
    | "activity-type-mismatch"
    | "unsupported-profile"
    | "constraint-violation"
    | "ambiguous-correct-answer"
    | "invalid-choice-set"
    | "visual-model-mismatch"
    | "prompt-interaction-mismatch"
    | "explanation-mismatch"
    | "common-core-boundary-risk"
    | "unsafe-fallback-used";
  message: string;
  skillId: string;
  uxProfileId?: string;
}

const defaultVisualModelByStrand: Record<SkillDefinition["strandId"], UxPedVisualModel> = {
  "number-recognition": "number-line",
  cardinality: "objects-arranged",
  comparing: "objects-arranged",
  "addition-subtraction": "part-part-whole",
  "place-value": "base-ten-blocks",
  "word-problems": "story-scene-model",
  measurement: "measurement-lineup",
  time: "clock-face",
  money: "coin-set",
  "data-graphs": "bar-picture-graph",
  geometry: "shape-model",
  "equal-shares": "equal-share-model",
  "arrays-odd-even": "array-grid"
};

const defaultMaxNumberByStrand: Record<SkillDefinition["strandId"], number> = {
  "number-recognition": 120,
  cardinality: 20,
  comparing: 100,
  "addition-subtraction": 20,
  "place-value": 1000,
  "word-problems": 20,
  measurement: 20,
  time: 60,
  money: 100,
  "data-graphs": 20,
  geometry: 10,
  "equal-shares": 4,
  "arrays-odd-even": 25
};

const minuteValuesForIncrement = (increment?: 60 | 30 | 5) => {
  if (increment === 60) return [0];
  if (increment === 30) return [0, 30];
  if (increment === 5) return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  return [0, 30];
};

const normalizeFractionWords = (
  words?: SkillDefinition["constraints"] extends infer C
    ? C extends { allowedFractionWords?: infer W }
      ? W
      : never
    : never
) => {
  const normalized = new Set<"half" | "third" | "fourth" | "quarter">();
  (words as string[] | undefined)?.forEach((word) => {
    if (word === "half" || word === "halves") normalized.add("half");
    if (word === "third" || word === "thirds") normalized.add("third");
    if (word === "fourth" || word === "fourths") normalized.add("fourth");
    if (word === "quarter" || word === "quarters") normalized.add("quarter");
  });
  return [...normalized];
};

const isEarlySkill = (skill: SkillDefinition) =>
  skill.gradeBand === "K" || skill.gradeBand === "K-G1" || skill.level <= 3;

const profileFromLegacyProfile = (skill: SkillDefinition): SkillPedagogicalUxMapping | undefined => {
  const profile = skill.pedagogicalUxProfile;
  if (!profile) {
    return undefined;
  }

  return {
    profileId: profile.id,
    primaryExerciseType: profile.primaryExerciseType,
    secondaryExerciseType: profile.secondaryExerciseType,
    lessonModel: profile.lessonModel,
    visualModel: profile.visualModel,
    learningGoal: profile.learningGoalTemplate,
    lessonFocus: profile.lessonFocus,
    commonMistakes: profile.commonMistakes,
    feedbackType: profile.feedbackType,
    rescueMove: profile.rescueMove,
    masteryCheck: profile.masteryCheck.notes ?? profile.independentPracticeExpectation,
    implementationNote: profile.implementationNotes
  };
};

const fallbackProfileForSkill = (skill: SkillDefinition): SkillPedagogicalUxMapping => ({
  profileId: `${skill.id}-safe-visual-fallback`,
  sourceSkillLabel: skill.summary,
  primaryExerciseType: "choose-visual-answer",
  lessonModel: "worked-example",
  visualModel: defaultVisualModelByStrand[skill.strandId],
  learningGoal: skill.summary,
  lessonFocus: skill.scaffold.pictorial,
  commonMistakes: ["Needs a profile-specific UX mapping"],
  feedbackType: "show-correction",
  rescueMove: "reduce-choice-load",
  masteryCheck: `Answer a visual multiple-choice item for ${skill.summary}`
});

const resolveSkillProfile = (skill: SkillDefinition) => {
  if (skill.pedagogicalUx) {
    return { profile: skill.pedagogicalUx, fallbackReason: undefined };
  }

  const legacyProfile = profileFromLegacyProfile(skill);
  if (legacyProfile) {
    return { profile: legacyProfile, fallbackReason: "Used legacy pedagogicalUxProfile object." };
  }

  return {
    profile: fallbackProfileForSkill(skill),
    fallbackReason: "Missing skill-level UX-Ped profile; used safe visual fallback profile."
  };
};

const resolveActivityType = (
  uxActivity: UxPedExerciseType,
  visualModel: UxPedVisualModel,
  skill: SkillDefinition
): ActivityType => {
  if (visualModel === "clock-face" && uxActivity !== "explain-strategy") {
    return "clock-choice";
  }

  if (visualModel === "coin-set") {
    return uxActivity === "choose-visual-answer" || uxActivity === "match-pair" || uxActivity === "drag-to-category"
      ? "choose-the-answer"
      : "coin-counting";
  }

  if (visualModel === "bar-picture-graph") {
    return uxActivity === "drag-to-category" || uxActivity === "build-model"
      ? "drag-to-match"
      : "graph-reading";
  }

  if (visualModel === "array-grid") {
    if (uxActivity === "number-line-sequence") return "number-line-tap";
    if (skill.strandId === "arrays-odd-even" && skill.level <= 2) return "odd-even-pairing";
    return "array-counting";
  }

  if (visualModel === "measurement-lineup") {
    return uxActivity === "drag-to-category" ? "drag-to-match" : "compare-two-groups";
  }

  if (visualModel === "base-ten-blocks" && (uxActivity === "build-model" || uxActivity === "read-model")) {
    return "build-a-number";
  }

  if (visualModel === "ten-frame") {
    return "fill-ten-frame";
  }

  switch (uxActivity) {
    case "tap-to-count":
      return "count-and-tap";
    case "choose-visual-answer":
      return "choose-the-answer";
    case "left-right-same":
      return "compare-two-groups";
    case "drag-to-category":
      return visualModel === "shape-model" ? "shape-sort" : "drag-to-match";
    case "build-model":
      if (visualModel === "number-line") return "number-line-tap";
      if (visualModel === "story-scene-model") return "story-scene";
      return "choose-the-answer";
    case "match-pair":
      return "drag-to-match";
    case "number-line-sequence":
      return "number-line-tap";
    case "story-scene":
      return "story-scene";
    case "read-model":
      if (visualModel === "number-line" || visualModel === "schedule-timeline") {
        return "number-line-tap";
      }
      return "choose-the-answer";
    case "explain-strategy":
      return "choose-the-answer";
  }
};

const createConstraints = (
  skill: SkillDefinition,
  profile: SkillPedagogicalUxMapping,
  mode: TeachingMode
): QuestionGenerationConstraints => {
  const maxNumber = skill.constraints?.maxNumber ?? defaultMaxNumberByStrand[skill.strandId];
  const maxObjects = skill.constraints?.maxObjects ?? Math.min(maxNumber, skill.gradeBand === "K" ? 20 : 40);
  const maxChoices = mode === "example" || isEarlySkill(skill) ? 3 : 4;
  const allowedCoinKinds = skill.constraints?.allowedCoins ?? ["penny", "nickel", "dime", "quarter"];
  const maxPromptWords =
    profile.primaryExerciseType === "story-scene" || skill.strandId === "word-problems"
      ? 28
      : skill.gradeBand === "K"
        ? 12
        : skill.gradeBand === "G1" || skill.gradeBand === "K-G1"
          ? 16
          : 20;

  return {
    minNumber: skill.strandId === "number-recognition" ? 0 : 1,
    maxNumber,
    maxObjects,
    maxScatteredObjects: skill.ccssCodes.includes("K.CC.B.5") ? Math.min(maxObjects, 10) : Math.min(maxObjects, 12),
    maxArrangedObjects: maxObjects,
    maxChoices,
    minChoices: 2,
    allowedLayouts: ["grid", "left-right", "top-bottom", "clock-grid"],
    maxGraphCategories: skill.constraints?.maxCategories ?? (skill.gradeBand === "G2" ? 4 : 3),
    maxArrayRows: skill.constraints?.maxArrayRows ?? 5,
    maxArrayColumns: skill.constraints?.maxArrayColumns ?? 5,
    allowedMinuteIncrements: minuteValuesForIncrement(skill.constraints?.timeMinuteIncrement),
    allowedCoinKinds,
    allowBills: allowedCoinKinds.includes("dollar") || skill.level >= 8,
    allowedFractionWords: normalizeFractionWords(skill.constraints?.allowedFractionWords),
    allowFractionSymbols: !!skill.constraints?.allowFractionNotation || skill.gradeBand === "Extension",
    avoidFormalMultiplication: skill.constraints?.avoidFormalMultiplication ?? skill.strandId === "arrays-odd-even",
    requireVisualModel: true,
    requireAudioSafePrompt: isEarlySkill(skill),
    maxPromptWords,
    maxSupportTextWords: 24,
    allowSymbolicEquation: skill.level >= 5,
    requireConcreteModel: isEarlySkill(skill),
    requireExplanation: true
  };
};

const anatomyByActivityType = (activityType: ActivityType): QuestionAnatomySpec => {
  const common = {
    requiredQuestionFields: ["prompt", "speech", "hint", "supportText", "explanation"] as Array<keyof QuestionDefinition>,
    mustHaveCorrectChoiceId: true,
    requiresLargeVisualModel: false,
    canUseTextOnly: false,
    expectedActivityType: activityType
  };

  switch (activityType) {
    case "count-and-tap":
      return { ...common, requiredVisualData: "groups", requiredInteraction: "tap", mustHaveChoices: false, canUseTextOnly: false };
    case "drag-to-match":
    case "shape-sort":
      return { ...common, requiredVisualData: "drag", requiredInteraction: "drag", mustHaveChoices: true };
    case "choose-the-answer":
      return { ...common, requiredVisualData: "choices", requiredInteraction: "choice", mustHaveChoices: true };
    case "compare-two-groups":
      return { ...common, requiredVisualData: "groups", requiredInteraction: "choice", mustHaveChoices: true };
    case "number-line-tap":
      return { ...common, requiredVisualData: "numberLine", requiredInteraction: "sequence", mustHaveChoices: true };
    case "fill-ten-frame":
      return { ...common, requiredVisualData: "none", requiredInteraction: "build", mustHaveChoices: false };
    case "build-a-number":
      return { ...common, requiredVisualData: "none", requiredInteraction: "build", mustHaveChoices: false };
    case "graph-reading":
      return { ...common, requiredVisualData: "graphBars", requiredInteraction: "read-model", mustHaveChoices: true };
    case "clock-choice":
      return { ...common, requiredVisualData: "clockChoices", requiredInteraction: "choice", mustHaveChoices: true };
    case "coin-counting":
      return { ...common, requiredVisualData: "coinVisuals", requiredInteraction: "read-model", mustHaveChoices: true };
    case "story-scene":
      return { ...common, requiredVisualData: "groups", requiredInteraction: "choice", mustHaveChoices: true };
    case "odd-even-pairing":
      return { ...common, requiredVisualData: "groups", requiredInteraction: "drag", mustHaveChoices: true };
    case "array-counting":
      return { ...common, requiredVisualData: "arrayData", requiredInteraction: "read-model", mustHaveChoices: true };
  }
};

const resolveGenerationIntent = (mode: TeachingMode): QuestionGenerationPlan["generationIntent"] => {
  if (mode === "example") return "lesson-example";
  if (mode === "practice") return "guided-practice";
  if (mode === "check" || mode === "placement") return "mastery-check";
  return "independent-practice";
};

export const createQuestionGenerationPlan = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionGenerationPlan => {
  const { profile, fallbackReason } = resolveSkillProfile(skill);
  const resolvedUxActivity = profile.primaryExerciseType;
  const activityType = resolveActivityType(resolvedUxActivity, profile.visualModel, skill);
  const constraints = createConstraints(skill, profile, mode);

  return {
    skill,
    mode,
    uxProfile: profile,
    uxProfileId: profile.profileId,
    primaryUxActivity: profile.primaryExerciseType,
    secondaryUxActivity: profile.secondaryExerciseType,
    resolvedUxActivity,
    activityType,
    lessonModel: profile.lessonModel,
    visualModel: profile.visualModel,
    feedbackType: profile.feedbackType,
    rescueMove: profile.rescueMove,
    gradeBand: skill.gradeBand,
    ccssCodes: skill.ccssCodes,
    constraints,
    anatomy: anatomyByActivityType(activityType),
    generationIntent: resolveGenerationIntent(mode),
    fallbackUsed: !!fallbackReason,
    fallbackReason
  };
};

const issue = (
  plan: QuestionGenerationPlan,
  severity: QuestionValidationIssue["severity"],
  code: QuestionValidationIssue["code"],
  message: string
): QuestionValidationIssue => ({
  severity,
  code,
  message,
  skillId: plan.skill.id,
  uxProfileId: plan.uxProfileId
});

const wordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

const hasPromptActionVerb = (question: QuestionDefinition, activityType: ActivityType) => {
  const prompt = question.prompt.toLowerCase();
  if (activityType === "count-and-tap") return /\b(tap|count)\b/.test(prompt);
  if (activityType === "drag-to-match" || activityType === "shape-sort" || activityType === "odd-even-pairing") return /\bdrag\b/.test(prompt);
  if (activityType === "number-line-tap" || activityType === "clock-choice") return /\b(tap|where|choose)\b/.test(prompt);
  if (activityType === "build-a-number" || activityType === "fill-ten-frame") return /\b(build|fill|make|tap)\b/.test(prompt);
  return /\b(choose|which|what|how|tap|pick|drag|count)\b/.test(prompt);
};

const hasVisualForPlan = (question: QuestionDefinition, plan: QuestionGenerationPlan) => {
  switch (plan.visualModel) {
    case "objects-arranged":
    case "objects-scattered":
      return !!question.countTap || !!question.groups?.length || !!question.presentation.promptCue;
    case "ten-frame":
      return !!question.tenFrame || !!question.presentation.promptCue;
    case "part-part-whole":
      return !!question.groups?.length || !!question.story;
    case "base-ten-blocks":
      return !!question.buildNumber || question.choices.some((choice) => choice.renderKind === "number");
    case "number-line":
    case "schedule-timeline":
      return !!question.numberLine || !!question.story || question.choices.length > 0;
    case "clock-face":
      return !!question.clockChoices?.length;
    case "coin-set":
      return !!question.coins?.length || question.choices.some((choice) => choice.renderKind === "coin");
    case "bar-picture-graph":
      return !!question.graph?.bars.length || !!question.drag || question.choices.length > 0;
    case "shape-model":
      return question.choices.some((choice) => choice.renderKind === "shape") || !!question.drag;
    case "equal-share-model":
      return question.choices.some((choice) => choice.renderKind === "fraction") || !!question.drag;
    case "array-grid":
      return !!question.arrayData || !!question.groups?.length;
    case "measurement-lineup":
      return !!question.groups?.length || !!question.numberLine;
    case "story-scene-model":
      return !!question.story || !!question.groups?.length;
  }
};

export const validateGeneratedQuestion = (
  question: QuestionDefinition,
  plan: QuestionGenerationPlan
): QuestionValidationIssue[] => {
  const issues: QuestionValidationIssue[] = [];

  if (plan.fallbackUsed) {
    issues.push(issue(plan, "warning", "unsafe-fallback-used", plan.fallbackReason ?? "Fallback profile used."));
  }

  if (question.type !== plan.activityType) {
    issues.push(issue(plan, "error", "activity-type-mismatch", `Expected ${plan.activityType}, got ${question.type}.`));
  }

  plan.anatomy.requiredQuestionFields.forEach((field) => {
    if (!question[field]) {
      issues.push(issue(plan, "error", "missing-required-field", `Missing required field: ${String(field)}.`));
    }
  });

  if (plan.anatomy.mustHaveChoices && question.choices.length < (plan.constraints.minChoices ?? 2)) {
    issues.push(issue(plan, "error", "invalid-choice-set", "Question needs at least two answer choices."));
  }

  if ((plan.anatomy.mustHaveChoices || question.choices.length > 0) && !question.choices.some((choice) => choice.id === question.correctChoiceId)) {
    issues.push(issue(plan, "error", "invalid-choice-set", "correctChoiceId does not match any choice."));
  }

  const choiceValues = question.choices.map((choice) => String(choice.value));
  if (new Set(choiceValues).size !== choiceValues.length) {
    issues.push(issue(plan, "error", "ambiguous-correct-answer", "Choice values must be unique."));
  }

  if (question.type !== "number-line-tap" && question.choices.length > (plan.constraints.maxChoices ?? 4)) {
    issues.push(issue(plan, "error", "invalid-choice-set", "Question has too many choices for the skill/mode."));
  }

  if (!hasVisualForPlan(question, plan)) {
    issues.push(issue(plan, "error", "visual-model-mismatch", `Question is missing visual support for ${plan.visualModel}.`));
  }

  if (!hasPromptActionVerb(question, question.type)) {
    issues.push(issue(plan, "error", "prompt-interaction-mismatch", "Prompt does not match the required interaction."));
  }

  if (wordCount(question.prompt) > (plan.constraints.maxPromptWords ?? 20)) {
    issues.push(issue(plan, "warning", "common-core-boundary-risk", "Prompt may be too wordy for this grade band."));
  }

  if (!question.explanation?.text || question.explanation.text.length < 12 || question.explanation.text.toLowerCase() === "correct") {
    issues.push(issue(plan, "error", "explanation-mismatch", "Explanation must name the mathematical reason."));
  }

  if (question.countTap) {
    const maxForLayout = question.countTap.layout === "scattered"
      ? plan.constraints.maxScatteredObjects
      : plan.constraints.maxObjects;
    if (maxForLayout && question.countTap.total > maxForLayout) {
      issues.push(issue(plan, "error", "constraint-violation", "Count-and-tap total exceeds object constraint."));
    }
  }

  question.groups?.forEach((group) => {
    if (plan.constraints.maxObjects && group.count > Math.max(plan.constraints.maxObjects, 40)) {
      issues.push(issue(plan, "error", "constraint-violation", "Visual group exceeds object constraint."));
    }
  });

  if (question.graph && plan.constraints.maxGraphCategories && question.graph.bars.length > plan.constraints.maxGraphCategories) {
    issues.push(issue(plan, "error", "constraint-violation", "Graph has too many categories."));
  }

  if (question.arrayData) {
    if (question.arrayData.rows > (plan.constraints.maxArrayRows ?? 5) || question.arrayData.columns > (plan.constraints.maxArrayColumns ?? 5)) {
      issues.push(issue(plan, "error", "constraint-violation", "Array exceeds allowed rows/columns."));
    }
    if (question.arrayData.target !== question.arrayData.rows * question.arrayData.columns) {
      issues.push(issue(plan, "error", "constraint-violation", "Array target does not match rows x columns."));
    }
  }

  question.clockChoices?.forEach((clock) => {
    if (!(plan.constraints.allowedMinuteIncrements ?? [0, 30]).includes(clock.targetMinute)) {
      issues.push(issue(plan, "error", "constraint-violation", "Clock minute is outside allowed increments."));
    }
  });

  question.coins?.forEach((coin) => {
    if (!(plan.constraints.allowedCoinKinds ?? []).includes(coin.kind)) {
      issues.push(issue(plan, "error", "constraint-violation", `Coin kind ${coin.kind} is not allowed.`));
    }
  });

  const combinedText = `${question.prompt} ${question.hint} ${question.explanation.text}`;
  if (plan.constraints.avoidFormalMultiplication && /[×*]|\b\d+\s*x\s*\d+\b/i.test(combinedText)) {
    issues.push(issue(plan, "error", "common-core-boundary-risk", "Formal multiplication notation is forbidden for this core skill."));
  }

  if (
    plan.visualModel === "equal-share-model" &&
    !plan.constraints.allowFractionSymbols &&
    question.choices.some((choice) => /\d+\s*\/\s*\d+/.test(choice.label))
  ) {
    issues.push(issue(plan, "warning", "common-core-boundary-risk", "Fraction symbols should stay supportive, not primary, for this skill."));
  }

  return issues;
};

export const getQuestionValidationErrors = (issues: QuestionValidationIssue[]) =>
  issues.filter((item) => item.severity === "error");
