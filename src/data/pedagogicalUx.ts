import type {
  UxPedExerciseType,
  UxPedFeedbackType,
  UxPedLearningPhase,
  UxPedLessonModel,
  UxPedProfile,
  UxPedRescueMove,
  UxPedVisualModel
} from "../types";

export const UX_PED_EXERCISE_TYPES = [
  "tap-to-count",
  "choose-visual-answer",
  "left-right-same",
  "drag-to-category",
  "build-model",
  "match-pair",
  "number-line-sequence",
  "story-scene",
  "read-model",
  "explain-strategy"
] as const satisfies readonly UxPedExerciseType[];

export const UX_PED_LESSON_MODELS = [
  "show-and-name",
  "worked-example",
  "step-by-step-model",
  "manipulative-demo",
  "notice-pattern",
  "mistake-contrast",
  "strategy-choice"
] as const satisfies readonly UxPedLessonModel[];

export const UX_PED_VISUAL_MODELS = [
  "objects-arranged",
  "objects-scattered",
  "ten-frame",
  "part-part-whole",
  "base-ten-blocks",
  "number-line",
  "clock-face",
  "schedule-timeline",
  "coin-set",
  "bar-picture-graph",
  "shape-model",
  "equal-share-model",
  "array-grid",
  "measurement-lineup",
  "story-scene-model"
] as const satisfies readonly UxPedVisualModel[];

export const UX_PED_FEEDBACK_TYPES = [
  "confirm-and-name",
  "show-correction",
  "counting-error-feedback",
  "compare-again",
  "model-step-again",
  "strategy-reminder",
  "mistake-contrast-feedback",
  "reduce-and-retry-feedback",
  "transfer-praise",
  "next-step-feedback"
] as const satisfies readonly UxPedFeedbackType[];

export const UX_PED_RESCUE_MOVES = [
  "highlight-counted-objects",
  "reduce-set-size",
  "switch-scattered-to-arranged",
  "align-compare-groups",
  "show-one-more-one-less",
  "short-hand-first",
  "split-place-value",
  "show-unit-iteration",
  "highlight-relevant-graph-item",
  "pair-and-leftover",
  "equal-share-overlay",
  "act-out-story",
  "reduce-choice-load",
  "build-with-guides",
  "worked-example-reset"
] as const satisfies readonly UxPedRescueMove[];

export const UX_PED_LEARNING_PHASES = [
  "lesson",
  "worked-example",
  "guided-practice",
  "independent-practice",
  "feedback",
  "rescue",
  "mastery-check",
  "review",
  "next-step"
] as const satisfies readonly UxPedLearningPhase[];

const independentMastery = {
  requiresFirstTry: true,
  requiresNoHint: true,
  requiresNoSuspiciousFastTap: true,
  requiresRepresentationVariation: true,
  suggestedWindow: 5
} as const;

export const UX_PED_PROFILES = {
  "count-arranged-objects-k": {
    id: "count-arranged-objects-k",
    label: "Count arranged objects",
    shortDescription: "Touch each arranged object exactly once and identify the total.",
    primaryExerciseType: "tap-to-count",
    secondaryExerciseType: "choose-visual-answer",
    lessonModel: "worked-example",
    visualModel: "objects-arranged",
    feedbackType: "counting-error-feedback",
    rescueMove: "highlight-counted-objects",
    learningGoalTemplate: "Count each object exactly once and use the last number as the total.",
    lessonFocus: "Touch one object for each number word.",
    guidedSupport: "Highlight or lock each object after it is tapped.",
    independentPracticeExpectation: "Child counts without highlights unless a rescue is triggered.",
    commonMistakes: [
      "Double-counting an object",
      "Skipping an object",
      "Not understanding that the last number is the total"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Use arranged rows, circles, and arrays before scattered layouts."
    },
    antiPatterns: [
      "Do not use text-only counting prompts for early K.",
      "Do not make objects too small to tap reliably."
    ]
  },
  "count-scattered-objects-k": {
    id: "count-scattered-objects-k",
    label: "Count scattered objects",
    shortDescription: "Count a small scattered set without skipping or double-counting.",
    primaryExerciseType: "tap-to-count",
    secondaryExerciseType: "choose-visual-answer",
    lessonModel: "worked-example",
    visualModel: "objects-scattered",
    feedbackType: "counting-error-feedback",
    rescueMove: "switch-scattered-to-arranged",
    learningGoalTemplate: "Keep track while counting scattered objects and name the total.",
    lessonFocus: "Move carefully from one object to the next.",
    guidedSupport: "Show a count path or temporarily arrange the same objects.",
    independentPracticeExpectation: "Child counts the scattered set without visible path support.",
    commonMistakes: [
      "Losing track in a scattered layout",
      "Counting the same object twice",
      "Stopping before every object has been counted"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Keep scattered Kindergarten sets small and return to arranged objects for rescue."
    },
    antiPatterns: [
      "Do not use scattered layouts before arranged counting is stable.",
      "Do not crowd objects so closely that touches become ambiguous."
    ]
  },
  "compare-left-right-sets-k": {
    id: "compare-left-right-sets-k",
    label: "Compare left and right sets",
    shortDescription: "Compare two visible groups and choose left, right, or same.",
    primaryExerciseType: "left-right-same",
    secondaryExerciseType: "choose-visual-answer",
    lessonModel: "worked-example",
    visualModel: "objects-arranged",
    feedbackType: "compare-again",
    rescueMove: "align-compare-groups",
    learningGoalTemplate: "Compare two groups by counting or matching objects, then decide more, less, or same.",
    lessonFocus: "Count or match both sides before choosing.",
    guidedSupport: "Show both totals and optionally align objects one-to-one.",
    independentPracticeExpectation: "Child chooses left, right, or same without totals shown first.",
    commonMistakes: [
      "Choosing the group that looks bigger visually without counting",
      "Confusing more and less",
      "Ignoring the same or equal option"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Mix close quantities and same/equal examples."
    },
    antiPatterns: [
      "Do not use symbols > < = before the child understands more, less, and same.",
      "Do not crowd objects so that counting or matching is visually unclear."
    ]
  },
  "make-ten-ten-frame-k": {
    id: "make-ten-ten-frame-k",
    label: "Make ten on a ten-frame",
    shortDescription: "Use a ten-frame to compose and decompose numbers up to 10.",
    primaryExerciseType: "build-model",
    secondaryExerciseType: "match-pair",
    lessonModel: "manipulative-demo",
    visualModel: "ten-frame",
    feedbackType: "model-step-again",
    rescueMove: "show-one-more-one-less",
    learningGoalTemplate: "Use the ten-frame to see how many are filled and how many more make 10.",
    lessonFocus: "A full ten-frame means 10. Empty spaces show how many more are needed.",
    guidedSupport: "Show filled spaces first, then invite the child to add or remove one at a time.",
    independentPracticeExpectation: "Child builds the requested amount or missing part on the frame.",
    commonMistakes: [
      "Counting filled and empty spaces together",
      "Adding one too many",
      "Not connecting the frame to the total of 10"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Vary totals and missing parts, including 0 and 10 when appropriate."
    },
    antiPatterns: [
      "Do not present make-ten as a memorized equation only.",
      "Do not use decorative frame art that hides the 2 by 5 structure."
    ]
  },
  "place-value-tens-ones-g1": {
    id: "place-value-tens-ones-g1",
    label: "Build tens and ones",
    shortDescription: "Represent two-digit numbers as tens and ones.",
    primaryExerciseType: "build-model",
    secondaryExerciseType: "match-pair",
    lessonModel: "manipulative-demo",
    visualModel: "base-ten-blocks",
    feedbackType: "strategy-reminder",
    rescueMove: "split-place-value",
    learningGoalTemplate: "Understand that the digits in a two-digit number represent tens and ones.",
    lessonFocus: "The first digit tells how many tens. The second digit tells how many ones.",
    guidedSupport: "Show tens bundles and ones separated before combining them into the numeral.",
    independentPracticeExpectation: "Child builds or identifies the correct tens-and-ones model.",
    commonMistakes: [
      "Treating each digit as a separate object count only",
      "Reversing tens and ones",
      "Counting all blocks by ones instead of recognizing tens"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Include numbers with different tens and ones. Later add 0 ones cases."
    },
    antiPatterns: [
      "Do not ask for abstract expanded form before the child can see tens and ones.",
      "Do not use decorative bundles that are hard to distinguish from ones."
    ]
  },
  "clock-hour-choice-g1": {
    id: "clock-hour-choice-g1",
    label: "Read o'clock times",
    shortDescription: "Choose the analog clock showing a named o'clock time.",
    primaryExerciseType: "choose-visual-answer",
    secondaryExerciseType: "match-pair",
    lessonModel: "step-by-step-model",
    visualModel: "clock-face",
    feedbackType: "model-step-again",
    rescueMove: "short-hand-first",
    learningGoalTemplate: "Read o'clock times by checking the short hand first and the long hand at 12.",
    lessonFocus: "Short hand tells the hour. Long hand at 12 means o'clock.",
    guidedSupport: "Highlight the short hand first, then the long hand.",
    independentPracticeExpectation: "Child chooses the correct clock among clear distractors.",
    commonMistakes: [
      "Reading the minute hand as the hour hand",
      "Ignoring the long hand",
      "Choosing a clock with the correct hour hand but wrong minute hand"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Distractors should be pedagogically meaningful, not visually random."
    },
    antiPatterns: [
      "Do not use tiny clock faces.",
      "Do not teach half-hour or five-minute reading inside the o'clock profile."
    ]
  },
  "graph-read-category-g2": {
    id: "graph-read-category-g2",
    label: "Read graph categories",
    shortDescription: "Read one clear picture or bar graph question at a time.",
    primaryExerciseType: "read-model",
    secondaryExerciseType: "choose-visual-answer",
    lessonModel: "worked-example",
    visualModel: "bar-picture-graph",
    feedbackType: "model-step-again",
    rescueMove: "highlight-relevant-graph-item",
    learningGoalTemplate: "Use the graph labels and bars or pictures to answer a data question.",
    lessonFocus: "Find the category first, then read its value or compare it with another category.",
    guidedSupport: "Highlight the relevant bar, picture row, or category label.",
    independentPracticeExpectation: "Child answers using the graph without decorative clues.",
    commonMistakes: [
      "Reading the wrong category",
      "Choosing the tallest bar when the question asks for a different comparison",
      "Counting graph pictures inconsistently"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Keep Grade 2 displays to four categories or fewer."
    },
    antiPatterns: [
      "Do not ask multiple graph questions at once.",
      "Do not let theme art make the graph scale hard to read."
    ]
  },
  "fair-share-equal-unequal-g1": {
    id: "fair-share-equal-unequal-g1",
    label: "Sort fair and unfair shares",
    shortDescription: "Classify equal and unequal partitions using visual share models.",
    primaryExerciseType: "drag-to-category",
    secondaryExerciseType: "choose-visual-answer",
    lessonModel: "mistake-contrast",
    visualModel: "equal-share-model",
    feedbackType: "mistake-contrast-feedback",
    rescueMove: "equal-share-overlay",
    learningGoalTemplate: "Decide whether all parts of a shared whole are the same size.",
    lessonFocus: "Fair shares must be equal-size pieces of the same whole.",
    guidedSupport: "Overlay or compare piece sizes before asking for the category.",
    independentPracticeExpectation: "Child sorts or chooses fair shares from clear visual models.",
    commonMistakes: [
      "Counting pieces without checking size",
      "Assuming all cut shapes are fair",
      "Comparing pieces from different wholes"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Vary shape orientation and partition style while keeping the whole clear."
    },
    antiPatterns: [
      "Do not center symbolic fraction notation for early equal-share work.",
      "Do not use partitions where unequal pieces are too subtle to notice."
    ]
  },
  "odd-even-pairing-g2": {
    id: "odd-even-pairing-g2",
    label: "Odd and even through pairs",
    shortDescription: "Pair objects to decide whether a number is odd or even.",
    primaryExerciseType: "drag-to-category",
    secondaryExerciseType: "read-model",
    lessonModel: "notice-pattern",
    visualModel: "array-grid",
    feedbackType: "model-step-again",
    rescueMove: "pair-and-leftover",
    learningGoalTemplate: "Make pairs and notice whether every object has a partner or one is left over.",
    lessonFocus: "Even numbers make complete pairs. Odd numbers have one leftover.",
    guidedSupport: "Show pairing lines or group objects into two equal rows.",
    independentPracticeExpectation: "Child classifies odd/even and can connect to equal groups.",
    commonMistakes: [
      "Calling a number even because it looks large",
      "Forgetting to check for a leftover",
      "Confusing count-by-twos with the odd/even decision"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Include small sets, equations with equal addends, and array-style visuals."
    },
    antiPatterns: [
      "Do not introduce multiplication facts as the primary task.",
      "Do not make the pairing visual too dense to inspect."
    ]
  },
  "story-add-take-visual-k-g1": {
    id: "story-add-take-visual-k-g1",
    label: "Visual add and take stories",
    shortDescription: "Solve add-to and take-from stories through a concrete scene.",
    primaryExerciseType: "story-scene",
    secondaryExerciseType: "choose-visual-answer",
    lessonModel: "worked-example",
    visualModel: "story-scene-model",
    feedbackType: "show-correction",
    rescueMove: "act-out-story",
    learningGoalTemplate: "Use the story action to decide whether objects join, leave, or are compared.",
    lessonFocus: "Watch what changes in the scene before choosing a number or equation.",
    guidedSupport: "Act out the joining or leaving action with visible objects.",
    independentPracticeExpectation: "Child solves a short visual story without dense text.",
    commonMistakes: [
      "Adding when objects are taken away",
      "Using the first number as the answer",
      "Ignoring what changed in the story"
    ],
    masteryCheck: {
      ...independentMastery,
      notes: "Vary add-to and take-from contexts before adding compare or unknown-position stories."
    },
    antiPatterns: [
      "Do not make K-1 word problems text-heavy.",
      "Do not hide the math action behind decorative story art."
    ]
  }
} as const satisfies Record<string, UxPedProfile>;

export type UxPedProfileId = keyof typeof UX_PED_PROFILES;

export const UX_PED_STARTER_PROFILE_IDS = Object.keys(UX_PED_PROFILES) as UxPedProfileId[];

export const isUxPedProfileId = (value: string): value is UxPedProfileId =>
  value in UX_PED_PROFILES;

export const getUxPedProfile = (profileId: string) =>
  isUxPedProfileId(profileId) ? UX_PED_PROFILES[profileId] : undefined;
