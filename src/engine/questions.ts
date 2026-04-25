import { STRAND_MAP } from "../data/catalog";
import { ACTIVITY_MIN_RESPONSE_MS } from "../data/rules";
import type {
  ActivityType,
  AnswerChoice,
  ClockChoiceData,
  CoinKind,
  CoinVisual,
  DragModel,
  GraphBar,
  LayoutMode,
  QuestionDefinition,
  QuestionExplanation,
  ShapeKind,
  SkillDefinition,
  StrandId,
  TeachingMode,
  VisualGroup
} from "../types";

interface ThemeCounter {
  token: string;
  singular: string;
  plural: string;
}

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const sample = <T,>(items: T[]) => items[rand(0, items.length - 1)];

const shuffle = <T,>(items: T[]) => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = rand(0, index);
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

const numberWordsBelowTwenty = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen"
];

const tensWords = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety"
];

const numberToWords = (value: number): string => {
  if (value < 20) {
    return numberWordsBelowTwenty[value];
  }
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return ones === 0 ? tensWords[tens] : `${tensWords[tens]}-${numberWordsBelowTwenty[ones]}`;
  }
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    return rest === 0
      ? `${numberWordsBelowTwenty[hundreds]} hundred`
      : `${numberWordsBelowTwenty[hundreds]} hundred ${numberToWords(rest)}`;
  }
  if (value === 1000) {
    return "one thousand";
  }
  return String(value);
};

const uniqueNumbers = (correct: number, count: number, min: number, max: number) => {
  const values = new Set<number>([correct]);
  while (values.size < count) {
    values.add(rand(min, max));
  }
  return shuffle([...values]);
};

const uniqueValues = (count: number, min: number, max: number) => {
  const values = new Set<number>();
  while (values.size < count) {
    values.add(rand(min, max));
  }
  return shuffle([...values]);
};

const numberChoices = (
  correct: number,
  min: number,
  max: number,
  count = 4
): AnswerChoice[] =>
  uniqueNumbers(correct, count, min, max).map((value) => ({
    id: `choice-${value}`,
    label: String(value),
    speechLabel: numberToWords(value),
    value,
    renderKind: "number"
  }));

const textChoices = (correct: string, options: string[]): AnswerChoice[] =>
  shuffle(
    options.map((value) => ({
      id: value === correct ? `correct-${value}` : `choice-${value}`,
      label: value,
      speechLabel: value,
      value,
      renderKind: "text" as const
    }))
  );

const themeCounters: ThemeCounter[] = [
  { token: "fart", singular: "fart cloud", plural: "fart clouds" },
  { token: "poop", singular: "poop pal", plural: "poop pals" },
  { token: "diaper", singular: "poopy diaper", plural: "poopy diapers" }
];

const themedCountLabel = (count: number, counter: ThemeCounter) =>
  `${count} ${count === 1 ? counter.singular : counter.plural}`;

const groupsFromCounts = (
  left: number,
  right: number,
  leftLabel: string,
  rightLabel: string,
  leftToken = "poop",
  rightToken = leftToken
): VisualGroup[] => [
  {
    id: randomId(),
    count: left,
    token: leftToken,
    color: "#7dc6ff",
    label: leftLabel
  },
  {
    id: randomId(),
    count: right,
    token: rightToken,
    color: "#ffbc67",
    label: rightLabel
  }
];

const makeExplanation = (
  text: string,
  correctAnswerLabel: string
): QuestionExplanation => ({
  text,
  speech: text,
  correctAnswerLabel
});

const promptVariant = (skill: SkillDefinition, seed: number) => {
  const visibleModes = ["minimal", "visible", "audio-only"] as const;
  const mode = visibleModes[(skill.level + seed) % visibleModes.length];
  return mode;
};

const buildBase = (
  skill: SkillDefinition,
  mode: TeachingMode,
  config: {
    prompt: string;
    speech: string;
    hint: string;
    explanation: QuestionExplanation;
    activityType: ActivityType;
    layout?: LayoutMode;
    instructionVisibility?: "visible" | "minimal" | "audio-only";
    choiceVisibility?: "visible" | "audio-only";
    promptCue?: QuestionDefinition["presentation"]["promptCue"];
  }
) => ({
  id: randomId(),
  skillId: skill.id,
  strandId: skill.strandId,
  level: skill.level,
  ccssCodes: skill.ccssCodes,
  gradeBand: skill.gradeBand,
  constraints: skill.constraints,
  mode,
  type: config.activityType,
  prompt: config.prompt,
  speech: config.speech,
  supportText:
    mode === "example"
      ? skill.scaffold.concrete
      : mode === "check"
        ? skill.scaffold.abstract
        : skill.scaffold.pictorial,
  hint: config.hint,
  hintSpeech: config.hint,
  minResponseMs: ACTIVITY_MIN_RESPONSE_MS[config.activityType],
  presentation: {
    instructionVisibility: config.instructionVisibility ?? "visible",
    choiceVisibility: config.choiceVisibility ?? "visible",
    layout: config.layout ?? "grid",
    promptCue: config.promptCue
  },
  explanation: config.explanation
});

const hasStandard = (skill: SkillDefinition, code: string) =>
  skill.ccssCodes.includes(code);

const hasAnyStandard = (skill: SkillDefinition, codes: string[]) =>
  codes.some((code) => hasStandard(skill, code));

const getMaxNumber = (skill: SkillDefinition, fallback: number) =>
  skill.constraints?.maxNumber ?? fallback;

const getMaxObjects = (skill: SkillDefinition, fallback: number) =>
  skill.constraints?.maxObjects ?? skill.constraints?.maxNumber ?? fallback;

const getMaxCategories = (skill: SkillDefinition, fallback: number) =>
  skill.constraints?.maxCategories ?? fallback;

const getAllowedCoinKinds = (skill: SkillDefinition, fallback: CoinKind[]) =>
  skill.constraints?.allowedCoins ?? fallback;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const equationChoices = (correct: boolean): AnswerChoice[] => [
  {
    id: correct ? "choice-true" : "choice-false",
    label: correct ? "True" : "False",
    speechLabel: correct ? "True" : "False",
    value: correct ? "true" : "false",
    renderKind: "text"
  },
  {
    id: correct ? "choice-false" : "choice-true",
    label: correct ? "False" : "True",
    speechLabel: correct ? "False" : "True",
    value: correct ? "false" : "true",
    renderKind: "text"
  }
];

const moneyLabel = (cents: number) =>
  cents >= 100 && cents % 100 === 0 ? `$${cents / 100}` : `${cents}¢`;

const moneyChoices = (correct: number): AnswerChoice[] =>
  uniqueNumbers(correct, 4, 0, Math.max(100, correct + 50)).map((value) => ({
    id: `choice-${value}`,
    label: moneyLabel(value),
    speechLabel: moneyLabel(value),
    value,
    renderKind: "text"
  }));

const shapeChoice = (shape: ShapeKind, idPrefix = "shape"): AnswerChoice => ({
  id: `${idPrefix}-${shape}`,
  label: shape,
  speechLabel: shape,
  value: shape,
  renderKind: "shape",
  shape
});

const coinLibrary: Record<CoinKind, CoinVisual> = {
  penny: { id: "coin-penny", kind: "penny", label: "Penny", value: 1 },
  nickel: { id: "coin-nickel", kind: "nickel", label: "Nickel", value: 5 },
  dime: { id: "coin-dime", kind: "dime", label: "Dime", value: 10 },
  quarter: { id: "coin-quarter", kind: "quarter", label: "Quarter", value: 25 },
  dollar: { id: "coin-dollar", kind: "dollar", label: "Dollar", value: 100 }
};

const describeTime = (hour: number, minute: number) => {
  if (minute === 0) {
    return `${numberToWords(hour)} o'clock`;
  }
  if (minute === 15) {
    return `quarter past ${numberToWords(hour)}`;
  }
  if (minute === 30) {
    return `half past ${numberToWords(hour)}`;
  }
  if (minute === 45) {
    return `quarter to ${numberToWords(hour === 12 ? 1 : hour + 1)}`;
  }
  return `${numberToWords(hour)} ${numberToWords(minute)}`;
};

const buildDragChoices = (choices: AnswerChoice[], targetLabel: string): DragModel => ({
  mode: "choice-to-target",
  targets: [{ id: "target-drop", label: targetLabel, position: "center" }]
});

const buildPromptToZoneDrag = (
  promptItem: AnswerChoice,
  leftLabel: string,
  rightLabel: string
): DragModel => ({
  mode: "prompt-to-zones",
  promptItem,
  targets: [
    { id: "zone-left", label: leftLabel, position: "left" },
    { id: "zone-right", label: rightLabel, position: "right" }
  ]
});

const numberRecognitionQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const max = getMaxNumber(skill, [5, 10, 20, 30, 50, 100, 120, 150, 500, 1000][skill.level - 1]);
  const tensOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90].filter((value) => value <= max);
  const target = skill.level <= 3 ? rand(0, max) : sample([rand(0, max), sample(tensOptions.length ? tensOptions : [max])]);
  const word = numberToWords(target);
  const counter = sample(themeCounters);
  const instructionVisibility = promptVariant(skill, target);
  const prompt =
    instructionVisibility === "audio-only"
      ? `Listen and drag the numeral showing how many ${counter.plural} there are.`
      : `Drag the numeral showing ${word} ${counter.plural}.`;
  const speech = `Drag the numeral showing ${word} ${counter.plural}.`;
  const choices = numberChoices(target, Math.max(0, target - 4), Math.max(target + 6, 10));

  return {
    ...buildBase(skill, mode, {
      prompt,
      speech,
      hint: `The numeral ${target} shows ${word} ${counter.plural}.`,
      explanation: makeExplanation(
        `${target} is the numeral for ${word} ${counter.plural}.`,
        String(target)
      ),
      activityType: "drag-to-match",
      instructionVisibility,
      promptCue: skill.level <= 2 ? { visualKey: counter.token, count: target } : undefined
    }),
    choices,
    correctChoiceId: `choice-${target}`,
    targetLabel: "Drop the match here",
    drag: buildDragChoices(choices, "Drop the match here")
  };
};

const cardinalityQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const allowedLayouts = skill.constraints?.allowedLayouts ?? [];
  const layout =
    skill.constraints?.layoutConstraint === "arranged-or-scattered"
      ? sample(["scattered", "line", "array", "circle"] as const)
      : skill.constraints?.layoutConstraint === "arranged"
        ? sample(["line", "array", "circle"] as const)
        : skill.constraints?.layoutConstraint === "scattered"
          ? "scattered"
          : allowedLayouts.includes("scattered")
            ? "scattered"
            : "array";
  const fallbackMax = [3, 5, 10, 12, 15, 18, 20, 24, 30, 40][skill.level - 1];
  const max = hasStandard(skill, "K.CC.B.5") && layout === "scattered"
    ? Math.min(10, getMaxObjects(skill, fallbackMax))
    : getMaxObjects(skill, fallbackMax);
  const total = rand(Math.max(1, max - 3), max);
  const counter = sample(themeCounters);
  return {
    ...buildBase(skill, mode, {
      prompt: `Tap each ${counter.singular} one time, then press Done.`,
      speech: `Tap each ${counter.singular} one time, then press done.`,
      hint: `Each ${counter.singular} gets one tap. No skipping and no double taps.`,
      explanation: makeExplanation(
        `There are ${themedCountLabel(total, counter)} altogether.`,
        `${total}`
      ),
      activityType: "count-and-tap"
    }),
    choices: [],
    correctChoiceId: `count-${total}`,
    countTap: {
      total,
      token: counter.token,
      color: "#7ed89f",
      layout
    }
  };
};

const comparingQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  if (hasStandard(skill, "2.MD.B.6")) {
    const target = rand(4, 20);
    return {
      ...buildBase(skill, mode, {
        prompt: `Tap the point that shows a stink worm ${numberToWords(target)} units long from zero.`,
        speech: `Tap the point that shows a stink worm ${numberToWords(target)} units long from zero.`,
        hint: "Start at zero and count the length hops to the end point.",
        explanation: makeExplanation(
          `A length of ${target} units from zero ends at ${target} on the number line.`,
          String(target)
        ),
        activityType: "number-line-tap"
      }),
      choices: Array.from({ length: 21 }, (_, value) => ({
        id: `choice-${value}`,
        label: String(value),
        speechLabel: numberToWords(value),
        value,
        renderKind: "number" as const
      })),
      correctChoiceId: `choice-${target}`,
      numberLine: {
        start: 0,
        end: 20,
        target,
        jump: target
      }
    };
  }

  const max = [3, 10, 10, 20, 20, 99, 100, 120, 999, 999][skill.level - 1];
  const values = uniqueValues(2, 1, max);
  const left = values[0];
  const right = values[1];
  const correct = left > right ? "Left" : "Right";
  const counter = sample(themeCounters);
  const choices = [
    {
      id: "choice-left",
      label: "Left",
      speechLabel: "Left",
      value: "left",
      renderKind: "position" as const
    },
    {
      id: "choice-right",
      label: "Right",
      speechLabel: "Right",
      value: "right",
      renderKind: "position" as const
    }
  ];

  return {
    ...buildBase(skill, mode, {
      prompt: `Which side has more ${counter.plural}?`,
      speech: `Which side has more ${counter.plural}?`,
      hint: `Count the left ${counter.singular} group and the right ${counter.singular} group, then choose the bigger set.`,
      explanation: makeExplanation(
        `The left side has ${themedCountLabel(left, counter)} and the right side has ${themedCountLabel(right, counter)}, so ${correct.toLowerCase()} has more.`,
        correct
      ),
      activityType: "compare-two-groups",
      layout: "left-right"
    }),
    choices,
    correctChoiceId: correct === "Left" ? "choice-left" : "choice-right",
    groups: groupsFromCounts(left, right, "Left", "Right", counter.token)
  };
};

const additionSubtractionQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const limit = getMaxNumber(skill, [3, 5, 10, 10, 20, 20, 100, 100, 100, 1000][skill.level - 1]);

  if (skill.level === 4) {
    const filled = rand(1, 7);
    const target = rand(filled + 1, 10);
    return {
      ...buildBase(skill, mode, {
        prompt: `Tap more toilet stalls until there are ${numberToWords(target)} full.`,
        speech: `Tap more toilet stalls until there are ${numberToWords(target)} full.`,
        hint: "Start from the stalls already filled and add more poopy stalls until you reach the target.",
        explanation: makeExplanation(
          `You started with ${filled} full toilet stalls and needed ${target} full toilet stalls.`,
          String(target)
        ),
        activityType: "fill-ten-frame"
      }),
      choices: [],
      correctChoiceId: `fill-${target}`,
      tenFrame: {
        target,
        filled
      }
    };
  }

  if (hasStandard(skill, "1.OA.B.3") && Math.random() < 0.35) {
    const first = rand(2, 9);
    const second = rand(2, Math.min(9, 20 - first));
    const total = first + second;
    const prompt = `Which turn-around fart fact makes the same total as ${first} + ${second}?`;
    const correct = `${second} + ${first}`;
    const choices = textChoices(correct, [
      correct,
      `${first} + ${Math.max(1, second - 1)}`,
      `${total} - ${first}`,
      `${first} + ${second + 2}`
    ]);

    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: "You can add numbers in either order and the total stays the same.",
        explanation: makeExplanation(
          `${first} + ${second} and ${second} + ${first} both make ${total}.`,
          correct
        ),
        activityType: "choose-the-answer"
      }),
      choices,
      correctChoiceId: `correct-${correct}`
    };
  }

  if (hasStandard(skill, "1.OA.A.2")) {
    const first = rand(1, 8);
    const second = rand(1, 8);
    const third = rand(1, Math.max(1, 20 - first - second));
    const result = first + second + third;
    const prompt = `Three stink piles join: ${first} + ${second} + ${third}. How many altogether?`;

    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: "Add two piles first, then add the last pile.",
        explanation: makeExplanation(
          `${first} + ${second} + ${third} equals ${result}.`,
          String(result)
        ),
        activityType: "choose-the-answer"
      }),
      choices: numberChoices(result, Math.max(0, result - 5), 20),
      correctChoiceId: `choice-${result}`
    };
  }

  if (hasStandard(skill, "1.OA.D.7")) {
    const leftA = rand(2, 10);
    const leftB = rand(1, 10);
    const leftTotal = leftA + leftB;
    const isTrue = Math.random() > 0.45;
    const rightTotal = isTrue ? leftTotal : clamp(leftTotal + sample([-2, -1, 1, 2]), 1, 20);
    const prompt = `Is this toilet equation true or false: ${leftA} + ${leftB} = ${rightTotal}?`;

    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: "The equal sign means both sides have the same value.",
        explanation: makeExplanation(
          `${leftA} + ${leftB} makes ${leftTotal}, so the equation is ${isTrue ? "true" : "false"}.`,
          isTrue ? "True" : "False"
        ),
        activityType: "choose-the-answer"
      }),
      choices: equationChoices(isTrue),
      correctChoiceId: isTrue ? "choice-true" : "choice-false"
    };
  }

  if (hasStandard(skill, "2.NBT.B.6")) {
    const addends = Array.from({ length: rand(3, 4) }, () => rand(10, 49));
    const result = addends.reduce((sum, value) => sum + value, 0);
    const prompt = `Add these two-digit stink numbers: ${addends.join(" + ")}.`;

    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: "Add the ones, then the tens. You can make groups of ten when the ones pile gets big.",
        explanation: makeExplanation(
          `${addends.join(" + ")} equals ${result}.`,
          String(result)
        ),
        activityType: "choose-the-answer"
      }),
      choices: numberChoices(result, Math.max(0, result - 12), result + 12),
      correctChoiceId: `choice-${result}`
    };
  }

  const isSubtraction = skill.level >= 3 && Math.random() > 0.45;
  const addendA = rand(1, Math.max(2, Math.floor(limit * 0.7)));
  const addendB = isSubtraction
    ? rand(0, addendA)
    : rand(1, Math.max(2, Math.floor(limit * 0.4)));
  const result = isSubtraction ? addendA - addendB : addendA + addendB;
  const counter = sample(themeCounters);
  const prompt =
    skill.level >= 6
      ? isSubtraction
        ? `Tap the number you land on after moving back ${numberToWords(addendB)} fart hops.`
        : `Tap the number you land on after jumping forward ${numberToWords(addendB)} fart hops.`
      : isSubtraction
        ? `What is ${numberToWords(addendA)} ${counter.plural} minus ${numberToWords(addendB)}?`
        : `What is ${numberToWords(addendA)} ${counter.plural} plus ${numberToWords(addendB)} more?`;
  const explanation = isSubtraction
    ? `${addendA} ${counter.plural} take away ${addendB} leaves ${result}.`
    : `${addendA} ${counter.plural} plus ${addendB} more makes ${result}.`;

  if (skill.level >= 6) {
    const start = isSubtraction ? Math.max(0, result - 2) : Math.max(0, addendA - 2);
    const end = Math.max(result + 5, addendA + addendB + 3, 12);
    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: isSubtraction
          ? "Start at the bigger number and hop backward with your fart hops."
          : "Start at the first number and hop forward with your fart hops.",
        explanation: makeExplanation(explanation, String(result)),
        activityType: "number-line-tap"
      }),
      choices: Array.from({ length: end - start + 1 }, (_, index) => {
        const value = start + index;
        return {
          id: `choice-${value}`,
          label: String(value),
          speechLabel: numberToWords(value),
          value,
          renderKind: "number"
        };
      }),
      correctChoiceId: `choice-${result}`,
      numberLine: {
        start,
        end,
        target: result,
        jump: isSubtraction ? -addendB : addendB
      }
    };
  }

  return {
    ...buildBase(skill, mode, {
      prompt,
      speech: prompt,
      hint: isSubtraction
        ? "Use the pictures and count the diapers left after some go away."
        : "Join the poopy groups together and count the total.",
      explanation: makeExplanation(explanation, String(result)),
      activityType: "choose-the-answer"
    }),
      choices: numberChoices(result, Math.max(0, result - 4), result + 5),
      correctChoiceId: `choice-${result}`,
      groups: [
        {
          id: randomId(),
          count: addendA,
          token: counter.token,
          color: "#ff9b8d",
          label: "First group"
        },
        {
          id: randomId(),
          count: addendB,
          token: counter.token,
          color: "#7ed89f",
          label: isSubtraction ? "Taken away" : "Second group"
        }
      ]
    };
  };

const placeValueQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const max = getMaxNumber(skill, skill.level >= 8 ? 1000 : skill.level >= 4 ? 100 : 19);
  const target =
    max >= 1000
      ? rand(100, 1000)
      : max >= 100
        ? rand(10, 99)
        : rand(skill.level <= 1 ? 0 : 10, max);
  const hundreds = Math.floor(target / 100);
  const tens = Math.floor((target % 100) / 10);
  const ones = target % 10;

  return {
    ...buildBase(skill, mode, {
      prompt:
        target < 20
          ? `Build ${numberToWords(target)} with toilet-roll bundles and diapers.`
          : "Build the number shown by the toilet-roll bundles and diapers.",
      speech:
        target < 20
          ? `Build ${numberToWords(target)} with toilet-roll bundles and diapers.`
          : `Build the number with ${hundreds} hundreds, ${tens} tens, and ${ones} ones.`,
      hint: "Count the big toilet-roll bundles first, then tens, then single diapers.",
      explanation: makeExplanation(
        `${hundreds} hundreds, ${tens} tens, and ${ones} ones make ${target}.`,
        String(target)
      ),
      activityType: "build-a-number"
    }),
    choices: [],
    correctChoiceId: `choice-${target}`,
    buildNumber: {
      hundreds,
      tens,
      ones,
      target
    }
  };
};

const wordProblemQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const max = getMaxNumber(skill, skill.gradeBand === "G2" ? 100 : skill.gradeBand === "G1" ? 20 : 10);
  const problemTypes = skill.constraints?.allowedProblemTypes ?? ["add-to", "take-from"];
  const problemType = sample(problemTypes);
  const unknownPosition = skill.constraints?.unknownPosition ?? (skill.level >= 5 ? sample(["result", "change", "start"] as const) : "result");

  let scene = "";
  let equation = "";
  let answer = 0;

  if (hasStandard(skill, "2.OA.A.1") && skill.level >= 8) {
    const first = rand(10, 45);
    const second = rand(5, 25);
    const third = rand(3, 20);
    answer = clamp(first + second - third, 0, max);
    scene = `A toilet parade had ${first} rolls. ${second} more rolled in, then ${third} rolled away.`;
    equation = `${first} + ${second} - ${third}`;
  } else if (problemType === "compare") {
    const bigger = rand(5, max);
    const smaller = rand(1, bigger - 1);
    answer = bigger - smaller;
    scene = `The left stink worm is ${bigger} units long. The right stink worm is ${smaller} units long.`;
    equation = `${bigger} - ${smaller}`;
  } else if (problemType === "put-together" || problemType === "take-apart") {
    const first = rand(1, Math.max(2, Math.floor(max / 2)));
    const second = rand(1, Math.max(2, max - first));
    answer = unknownPosition === "change" ? second : first + second;
    scene =
      unknownPosition === "change"
        ? `A potty box has ${first + second} silly stickers. ${first} are fart stickers.`
        : `A potty box has ${first} fart stickers and ${second} poop stickers.`;
    equation = unknownPosition === "change" ? `${first} + ? = ${first + second}` : `${first} + ${second}`;
  } else if (problemType === "take-from") {
    const start = rand(3, max);
    const change = rand(1, Math.max(1, Math.floor(start / 2)));
    answer = unknownPosition === "start" ? start : unknownPosition === "change" ? change : start - change;
    scene =
      unknownPosition === "start"
        ? `Some poopy diapers were in a pile. ${change} rolled away and ${start - change} were left.`
        : unknownPosition === "change"
          ? `A poop monster had ${start} poopy diapers. Some rolled away and ${start - change} were left.`
          : `A poop monster had ${start} poopy diapers. Then ${change} rolled away.`;
    equation =
      unknownPosition === "start"
        ? `? - ${change} = ${start - change}`
        : unknownPosition === "change"
          ? `${start} - ? = ${start - change}`
          : `${start} - ${change}`;
  } else {
    const start = rand(1, Math.max(2, Math.floor(max * 0.7)));
    const change = rand(1, Math.max(1, max - start));
    answer = unknownPosition === "start" ? start : unknownPosition === "change" ? change : start + change;
    scene =
      unknownPosition === "start"
        ? `Some fart clouds floated by. ${change} more joined, and then there were ${start + change}.`
        : unknownPosition === "change"
          ? `${start} fart clouds floated by. Some more joined, and then there were ${start + change}.`
          : `${start} fart clouds floated by. Then ${change} more joined.`;
    equation =
      unknownPosition === "start"
        ? `? + ${change} = ${start + change}`
        : unknownPosition === "change"
          ? `${start} + ? = ${start + change}`
          : `${start} + ${change}`;
  }

  const prompt = `${scene} What number solves the story?`;

  return {
    ...buildBase(skill, mode, {
      prompt,
      speech: prompt,
      hint: "Listen for whether things joined, went away, were compared, or were split apart.",
      explanation: makeExplanation(
        `${equation} equals ${answer}.`,
        String(answer)
      ),
      activityType: "story-scene"
    }),
    choices: numberChoices(answer, Math.max(0, answer - 4), answer + 5),
    correctChoiceId: `choice-${answer}`,
    story: {
      scene,
      equation
    }
  };
};

const measurementQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  if (hasStandard(skill, "1.MD.A.1")) {
    const labels = ["Left worm", "Middle worm", "Right worm"];
    const lengths = uniqueValues(3, 3, 12).sort((left, right) => left - right);
    const shuffled = shuffle(labels.map((label, index) => ({ label, length: lengths[index] })));
    const longest = [...shuffled].sort((left, right) => right.length - left.length)[0];
    const prompt = "Order the stink worms in your head. Which worm is longest?";

    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: "Compare two worms, then use that to compare with the third worm.",
        explanation: makeExplanation(
          `${longest.label} is longest at ${longest.length} units.`,
          longest.label
        ),
        activityType: "choose-the-answer"
      }),
      choices: shuffled.map((item) => ({
        id: `choice-${item.label}`,
        label: item.label,
        speechLabel: item.label,
        value: item.label,
        renderKind: "text"
      })),
      correctChoiceId: `choice-${longest.label}`,
      groups: shuffled.map((item) => ({
        id: randomId(),
        count: item.length,
        token: "foot",
        color: "#8bc5ff",
        label: item.label
      }))
    };
  }

  if (hasStandard(skill, "2.MD.A.2")) {
    const bigUnits = rand(3, 7);
    const smallUnits = bigUnits * 2;
    const prompt = `The same toilet-paper worm is ${bigUnits} big units long or ${smallUnits} tiny units long. Which unit is shorter?`;

    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: "More units fit along the same object when each unit is shorter.",
        explanation: makeExplanation(
          `The tiny unit is shorter because it takes ${smallUnits} tiny units but only ${bigUnits} big units to cover the same length.`,
          "Tiny unit"
        ),
        activityType: "choose-the-answer"
      }),
      choices: textChoices("Tiny unit", ["Tiny unit", "Big unit", "Same unit", "No unit"]),
      correctChoiceId: "correct-Tiny unit",
      groups: groupsFromCounts(bigUnits, smallUnits, "Big units", "Tiny units", "foot")
    };
  }

  const lengths = uniqueValues(2, 2, 12 + skill.level);
  const left = lengths[0];
  const right = lengths[1];
  const correctSide = left > right ? "Left" : "Right";

  if (skill.level >= 4) {
    const promptItem: AnswerChoice = {
      id: "prompt-longer",
      label: "Longer",
      speechLabel: "Longer",
      value: "longer",
      renderKind: "text"
    };
    return {
      ...buildBase(skill, mode, {
        prompt: "Drag LONGER to the correct stink worm.",
        speech: "Drag the word longer to the correct stink worm.",
        hint: "Compare where each stink worm starts and ends. The longer one reaches farther.",
        explanation: makeExplanation(
          `The left worm is ${left} units and the right worm is ${right} units, so ${correctSide.toLowerCase()} is longer.`,
          correctSide
        ),
        activityType: "drag-to-match",
        layout: "left-right"
      }),
      choices: [
        { id: "zone-left", label: "Left", speechLabel: "Left", value: "left", renderKind: "position" },
        { id: "zone-right", label: "Right", speechLabel: "Right", value: "right", renderKind: "position" }
      ],
      correctChoiceId: correctSide === "Left" ? "zone-left" : "zone-right",
      groups: groupsFromCounts(left, right, "Left worm", "Right worm", "foot"),
      drag: buildPromptToZoneDrag(promptItem, "Left", "Right")
    };
  }

  return {
    ...buildBase(skill, mode, {
      prompt: "Which stink worm is longer?",
      speech: "Which stink worm is longer?",
      hint: "Look for the stink worm that reaches farther.",
      explanation: makeExplanation(
        `The left worm is ${left} units and the right worm is ${right} units, so ${correctSide.toLowerCase()} is longer.`,
        correctSide
      ),
      activityType: "choose-the-answer",
      layout: "left-right"
    }),
    choices: [
      { id: "choice-left", label: "Left", speechLabel: "Left", value: "left", renderKind: "position" },
      { id: "choice-right", label: "Right", speechLabel: "Right", value: "right", renderKind: "position" }
    ],
    correctChoiceId: correctSide === "Left" ? "choice-left" : "choice-right",
    groups: groupsFromCounts(left, right, "Left worm", "Right worm", "foot")
  };
};

const timeQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const increment = skill.constraints?.timeMinuteIncrement;
  const minutePool =
    increment === 60
      ? [0]
      : increment === 30
        ? [0, 30]
        : increment === 5
          ? [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
          : skill.level <= 2
            ? [0]
            : skill.level <= 4
              ? [0, 30]
              : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const hour = rand(1, 12);
  const minute = sample(minutePool);
  const dayPart = skill.constraints?.requireAmPm ? sample(["a.m.", "p.m."] as const) : "";
  const label = `${hour}:${String(minute).padStart(2, "0")}${dayPart ? ` ${dayPart}` : ""}`;
  const spoken = describeTime(hour, minute);
  const choices = new Map<string, ClockChoiceData>();
  choices.set(label, { targetHour: hour, targetMinute: minute, label });

  while (choices.size < 4) {
    const maybeHour = rand(1, 12);
    const maybeMinute = sample(minutePool);
    const maybeDayPart = skill.constraints?.requireAmPm ? sample(["a.m.", "p.m."] as const) : "";
    const maybeLabel = `${maybeHour}:${String(maybeMinute).padStart(2, "0")}${maybeDayPart ? ` ${maybeDayPart}` : ""}`;
    choices.set(maybeLabel, {
      targetHour: maybeHour,
      targetMinute: maybeMinute,
      label: maybeLabel
    });
  }

  const choiceArray = shuffle([...choices.values()]);

  return {
    ...buildBase(skill, mode, {
      prompt:
        promptVariant(skill, minute) === "audio-only"
          ? "Listen and tap the matching clock."
          : `Tap the clock for potty time: ${spoken}${dayPart ? ` ${dayPart}` : ""}.`,
      speech: `Tap the clock for potty time: ${spoken}${dayPart ? ` ${dayPart}` : ""}.`,
      hint: "Look at the short hand first. Then check the long hand for potty time.",
      explanation: makeExplanation(
        `The correct clock shows ${label}.`,
        label
      ),
      activityType: "clock-choice",
      instructionVisibility: promptVariant(skill, minute),
      layout: "clock-grid"
    }),
    choices: choiceArray.map((choice) => ({
      id: `clock-${choice.label}`,
      label: choice.label,
      speechLabel: describeTime(choice.targetHour, choice.targetMinute),
      value: choice.label,
      renderKind: "clock"
    })),
    correctChoiceId: `clock-${label}`,
    clockChoices: choiceArray
  };
};

const moneyQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const coinKinds = getAllowedCoinKinds(skill, ["penny", "nickel", "dime", "quarter"]);

  if (skill.level <= 3) {
    const targetKind = sample(coinKinds);
    const choiceKinds = shuffle([...new Set(coinKinds)]).slice(0, 4);
    if (!choiceKinds.includes(targetKind)) {
      choiceKinds[0] = targetKind;
    }

    const choices = shuffle(choiceKinds).map((kind) => ({
      id: kind === targetKind ? `correct-${kind}` : `choice-${kind}`,
      label: coinLibrary[kind].label,
      speechLabel: coinLibrary[kind].label,
      value: kind,
      renderKind: "coin" as const,
      coin: kind,
      numericValue: coinLibrary[kind].value
    }));

    return {
      ...buildBase(skill, mode, {
        prompt: `Tap the ${coinLibrary[targetKind].label.toLowerCase()} coin for the potty shop.`,
        speech: `Tap the ${coinLibrary[targetKind].label.toLowerCase()} coin for the potty shop.`,
        hint: "Look at the coin name and size.",
        explanation: makeExplanation(
          `The ${coinLibrary[targetKind].label.toLowerCase()} is worth ${moneyLabel(coinLibrary[targetKind].value)}.`,
          coinLibrary[targetKind].label
        ),
        activityType: "choose-the-answer"
      }),
      choices,
      correctChoiceId: `correct-${targetKind}`
    };
  }

  const coinCount = skill.level >= 7 ? rand(3, 6) : rand(2, 4);
  const pickedKinds = Array.from({ length: coinCount }, () => sample(coinKinds));
  const coins = pickedKinds.map((kind, index) => ({
    ...coinLibrary[kind],
    id: `coin-${index}-${kind}`
  }));
  const total = coins.reduce((sum, coin) => sum + coin.value, 0);
  return {
    ...buildBase(skill, mode, {
      prompt: "Count the potty-shop coins. How much money is here?",
      speech: "Count the potty-shop coins. How much money is here?",
      hint: "Add each coin's value carefully to buy the potty supplies.",
      explanation: makeExplanation(
        `The coins add up to ${moneyLabel(total)}.`,
        moneyLabel(total)
      ),
      activityType: "coin-counting"
    }),
    choices: moneyChoices(total),
    correctChoiceId: `choice-${total}`,
    coins
  };
};

const graphQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  if (hasStandard(skill, "2.MD.D.9")) {
    const labels = ["1 in", "2 in", "3 in", "4 in"];
    const values = labels.map(() => rand(1, 4));
    const bars: GraphBar[] = labels.map((label, index) => ({
      label,
      value: values[index],
      color: ["#7ed89f", "#7dc6ff", "#ffbc67", "#ff8cb1"][index]
    }));
    const winningBar = [...bars].sort((left, right) => right.value - left.value)[0];

    return {
      ...buildBase(skill, mode, {
        prompt: "Look at the toilet-paper line plot. Which length happened most?",
        speech: "Look at the toilet-paper line plot. Which length happened most?",
        hint: "Count the dots above each length and pick the tallest dot pile.",
        explanation: makeExplanation(
          `${winningBar.label} has the most measurements with ${winningBar.value} dots.`,
          winningBar.label
        ),
        activityType: "graph-reading"
      }),
      choices: bars.map((bar) => ({
        id: `bar-${bar.label}`,
        label: bar.label,
        speechLabel: bar.label,
        value: bar.label,
        renderKind: "text"
      })),
      correctChoiceId: `bar-${winningBar.label}`,
      graph: {
        graphKind: "line-plot",
        bars,
        question: "Which length happened most?"
      }
    };
  }

  const allLabels = ["Corn", "Beans", "Toast", "Apples"];
  const categoryCount = getMaxCategories(skill, skill.gradeBand === "G1" ? 3 : 4);
  const labels = allLabels.slice(0, categoryCount);
  const values = uniqueValues(labels.length, 1, 2 + skill.level);
  const bars: GraphBar[] = labels.map((label, index) => ({
    label,
    value: values[index],
    color: ["#7ed89f", "#7dc6ff", "#ffbc67", "#ff8cb1"][index]
  }));
  const winningBar = [...bars].sort((left, right) => right.value - left.value)[0];
  return {
    ...buildBase(skill, mode, {
      prompt: "Which snack made the biggest stink bar?",
      speech: "Which snack made the biggest stink bar?",
      hint: "Find the bar that reaches the highest point.",
      explanation: makeExplanation(
        `${winningBar.label} has the highest bar with ${winningBar.value}.`,
        winningBar.label
      ),
      activityType: "graph-reading"
    }),
    choices: bars.map((bar) => ({
      id: `bar-${bar.label}`,
      label: bar.label,
      speechLabel: bar.label,
      value: bar.label,
      renderKind: "text"
    })),
    correctChoiceId: `bar-${winningBar.label}`,
    graph: {
      graphKind: skill.constraints?.allowedLayouts?.includes("picture-graph") ? "picture-graph" : "bar-graph",
      bars,
      question: "Which snack made the biggest stink bar?"
    }
  };
};

const geometryQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  if (hasStandard(skill, "K.G.A.1")) {
    const positions = ["above", "below", "beside", "in front of", "behind", "next to"];
    const correct = sample(positions);
    const prompt = `The stinky star is ${correct} the toilet. Tap the position word.`;
    const positionOptions = [correct, ...shuffle(positions.filter((position) => position !== correct)).slice(0, 3)];
    const choices = textChoices(correct, positionOptions);

    return {
      ...buildBase(skill, mode, {
        prompt,
        speech: prompt,
        hint: "Listen for the word that tells where the stinky star is.",
        explanation: makeExplanation(
          `${correct} tells where the stinky star is compared with the toilet.`,
          correct
        ),
        activityType: "choose-the-answer"
      }),
      choices,
      correctChoiceId: `correct-${correct}`
    };
  }

  const shapesByLevel: ShapeKind[][] = [
    ["circle", "square", "triangle"],
    ["rectangle", "quadrilateral", "pentagon", "hexagon", "cube", "sphere", "cylinder", "cone"],
    ["circle", "square", "triangle", "rectangle", "hexagon"],
    ["triangle", "rectangle", "hexagon", "circle"],
    ["triangle", "rectangle", "hexagon", "square"],
    ["cube", "sphere", "cylinder", "cone"],
    ["triangle", "rectangle", "hexagon", "square"],
    ["circle", "square", "triangle", "rectangle", "quadrilateral", "pentagon", "hexagon"],
    ["rectangle", "square", "triangle", "hexagon"],
    ["rectangle", "square", "triangle", "hexagon"]
  ];
  const pool = shapesByLevel[skill.level - 1];
  const correct = sample(pool);
  const distractors = shuffle(pool.filter((shape) => shape !== correct)).slice(0, 3);
  const choices = shuffle([correct, ...distractors]).map((shape) => ({
    ...shapeChoice(shape, shape === correct ? "correct" : "choice")
  }));

  return {
    ...buildBase(skill, mode, {
      prompt: `Drag the ${correct} into the poopy shape bin.`,
      speech: `Drag the ${correct} into the poopy shape bin.`,
      hint: "Match the shape's sides and corners to the label on the poopy shape bin.",
      explanation: makeExplanation(
        `The correct shape is ${correct}.`,
        correct
      ),
      activityType: "shape-sort"
    }),
    choices,
    correctChoiceId: `correct-${correct}`,
    targetLabel: correct,
    drag: buildDragChoices(choices, `${correct} bin`)
  };
};

const equalSharesQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const optionPool: AnswerChoice[] = [
    {
      id: "choice-equal-halves",
      label: "Equal halves",
      speechLabel: "Equal halves",
      value: "equal-halves",
      renderKind: "fraction",
      partition: { shape: "circle", parts: 2, equal: true, highlightedParts: 1 }
    },
    {
      id: "choice-unequal-pieces",
      label: "Unequal pieces",
      speechLabel: "Unequal pieces",
      value: "unequal-pieces",
      renderKind: "fraction",
      partition: { shape: "circle", parts: 2, equal: false, highlightedParts: 1 }
    },
    {
      id: "choice-equal-fourths",
      label: "Equal fourths",
      speechLabel: "Equal fourths",
      value: "equal-fourths",
      renderKind: "fraction",
      partition: { shape: "circle", parts: 4, equal: true, highlightedParts: 1 }
    },
    {
      id: "choice-three-fair-shares",
      label: "Three fair shares",
      speechLabel: "Three fair shares",
      value: "three-fair-shares",
      renderKind: "fraction",
      partition: { shape: "circle", parts: 3, equal: true, highlightedParts: 1 }
    }
  ];

  const correctId =
    skill.level <= 2
      ? "choice-equal-halves"
      : skill.level <= 5
        ? "choice-equal-fourths"
        : "choice-three-fair-shares";

  const choices = shuffle(optionPool);

  if (skill.level >= 8) {
    return {
      ...buildBase(skill, mode, {
        prompt: "Drag the fair toilet-paper share picture into the tray.",
        speech: "Drag the fair toilet-paper share picture into the tray.",
        hint: "Fair shares mean all the pieces are the same size.",
        explanation: makeExplanation(
          `${choices.find((choice) => choice.id === correctId)?.label} shows fair shares.`,
          choices.find((choice) => choice.id === correctId)?.label ?? ""
        ),
        activityType: "drag-to-match"
      }),
      choices,
      correctChoiceId: correctId,
      drag: buildDragChoices(choices, "Fair share tray")
    };
  }

  return {
    ...buildBase(skill, mode, {
      prompt: "Pick the fair toilet-paper share picture.",
      speech: "Pick the fair toilet-paper share picture.",
      hint: "Fair shares mean equal-size pieces.",
      explanation: makeExplanation(
        `${choices.find((choice) => choice.id === correctId)?.label} shows equal shares.`,
        choices.find((choice) => choice.id === correctId)?.label ?? ""
      ),
      activityType: "choose-the-answer"
    }),
    choices,
    correctChoiceId: correctId
  };
};

const arraysQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  if (skill.level <= 2) {
    const total = rand(3, getMaxObjects(skill, 20));
    const correct = total % 2 === 0 ? "Even" : "Odd";
    const promptItem: AnswerChoice = {
      id: "prompt-socks",
      label: `${total} diapers`,
      speechLabel: `${total} diapers`,
      value: total,
      renderKind: "text"
    };

    return {
      ...buildBase(skill, mode, {
        prompt: "Drag the diaper group to odd or even.",
        speech: "Drag the diaper group to odd or even.",
        hint: "If one diaper is left without a pair, it is odd.",
        explanation: makeExplanation(
          `${total} is ${correct.toLowerCase()} because ${correct === "Even" ? "all the diapers can make pairs." : "one diaper is left over."}`,
          correct
        ),
        activityType: "odd-even-pairing",
        layout: "left-right"
      }),
      choices: [
        { id: "zone-left", label: "Odd", speechLabel: "Odd", value: "odd", renderKind: "text" },
        { id: "zone-right", label: "Even", speechLabel: "Even", value: "even", renderKind: "text" }
      ],
      correctChoiceId: correct === "Odd" ? "zone-left" : "zone-right",
      groups: [
        {
          id: randomId(),
          count: total,
          token: "panties",
          color: "#9cf0ef",
          label: `${total} diapers`
        }
      ],
      drag: buildPromptToZoneDrag(promptItem, "Odd", "Even")
    };
  }

  const maxRows = skill.constraints?.maxArrayRows ?? 5;
  const maxColumns = skill.constraints?.maxArrayColumns ?? 5;
  const rows = rand(2, Math.min(5, maxRows, 1 + skill.level));
  const columns = rand(2, Math.min(5, maxColumns, skill.level >= 7 ? 5 : 4));
  const total = rows * columns;
  const repeatedAddition = Array.from({ length: rows }, () => columns).join(" + ");
  return {
    ...buildBase(skill, mode, {
      prompt: `How many toilet-paper squares are in ${rows} rows with ${columns} in each row?`,
      speech: `How many toilet-paper squares are in ${rows} rows with ${columns} in each row?`,
      hint: "Count the rows and columns, or add the same row size again and again.",
      explanation: makeExplanation(
        `${rows} rows of ${columns} means ${repeatedAddition}, which makes ${total}.`,
        String(total)
      ),
      activityType: "array-counting"
    }),
    choices: numberChoices(total, Math.max(0, total - 6), total + 8),
    correctChoiceId: `choice-${total}`,
    arrayData: {
      rows,
      columns,
      target: total
    }
  };
};

export const generateQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  switch (skill.strandId) {
    case "number-recognition":
      return numberRecognitionQuestion(skill, mode);
    case "cardinality":
      return cardinalityQuestion(skill, mode);
    case "comparing":
      return comparingQuestion(skill, mode);
    case "addition-subtraction":
      return additionSubtractionQuestion(skill, mode);
    case "place-value":
      return placeValueQuestion(skill, mode);
    case "word-problems":
      return wordProblemQuestion(skill, mode);
    case "measurement":
      return measurementQuestion(skill, mode);
    case "time":
      return timeQuestion(skill, mode);
    case "money":
      return moneyQuestion(skill, mode);
    case "data-graphs":
      return graphQuestion(skill, mode);
    case "geometry":
      return geometryQuestion(skill, mode);
    case "equal-shares":
      return equalSharesQuestion(skill, mode);
    case "arrays-odd-even":
      return arraysQuestion(skill, mode);
    default:
      return numberRecognitionQuestion(skill, mode);
  }
};

export const getSkill = (strandId: StrandId, level: number) =>
  STRAND_MAP[strandId].levels[
    Math.max(0, Math.min(level - 1, STRAND_MAP[strandId].levels.length - 1))
  ];
