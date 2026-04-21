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
  { token: "💨", singular: "fart cloud", plural: "fart clouds" },
  { token: "💩", singular: "poop pal", plural: "poop pals" },
  { token: "🩲", singular: "poopy diaper", plural: "poopy diapers" }
];

const themedCountLabel = (count: number, counter: ThemeCounter) =>
  `${count} ${count === 1 ? counter.singular : counter.plural}`;

const groupsFromCounts = (
  left: number,
  right: number,
  leftLabel: string,
  rightLabel: string,
  leftToken = "💩",
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
    promptCue?: string;
  }
) => ({
  id: randomId(),
  skillId: skill.id,
  strandId: skill.strandId,
  level: skill.level,
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
  const max = [5, 10, 20, 30, 50, 100, 120, 150, 500, 1000][skill.level - 1];
  const target = skill.level <= 3 ? rand(0, max) : sample([rand(0, max), sample([10, 20, 30, 40, 50, 60, 70, 80, 90])]);
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
      promptCue: skill.level <= 2 ? `${`${counter.token} `.repeat(Math.max(1, target || 1)).trim()}` : undefined
    }),
    choices,
    correctChoiceId: `choice-${target}`,
    targetLabel: "Drop the match here",
    drag: buildDragChoices(choices, "Drop the match here")
  };
};

const cardinalityQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const max = [3, 5, 10, 12, 15, 18, 20, 24, 30, 40][skill.level - 1];
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
      color: "#7ed89f"
    }
  };
};

const comparingQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
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
  const limit = [3, 5, 10, 10, 20, 20, 100, 100, 100, 1000][skill.level - 1];

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
    const start = isSubtraction ? addendA : Math.max(0, addendA - 2);
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
  const hundreds = skill.level >= 8 ? rand(0, Math.min(3, skill.level - 6)) : 0;
  const tens = skill.level >= 2 ? rand(1, skill.level >= 8 ? 9 : 5) : 0;
  const ones = rand(0, skill.level >= 5 ? 9 : 5);
  const target = hundreds * 100 + tens * 10 + ones;

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
  const start = rand(3, skill.level >= 6 ? 40 : 12);
  const change = rand(1, Math.max(2, Math.floor(start / 2)));
  const isAddition = Math.random() > 0.5;
  const answer = isAddition ? start + change : start - Math.min(change, start);
  const action = isAddition ? "more rolled in" : "rolled away";
  const equation = isAddition ? `${start} + ${change}` : `${start} - ${Math.min(change, start)}`;
  const scene = `A poop monster had ${start} poopy diapers. Then ${change} ${action}.`;
  const prompt = `${scene} How many are there now?`;

  return {
    ...buildBase(skill, mode, {
      prompt,
      speech: prompt,
      hint: "Look at whether more poopy diapers joined or some went away.",
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
      groups: groupsFromCounts(left, right, "Left worm", "Right worm", "🪱"),
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
    groups: groupsFromCounts(left, right, "Left worm", "Right worm", "🪱")
  };
};

const timeQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const minutePool =
    skill.level <= 2
      ? [0]
      : skill.level <= 4
        ? [0, 30]
        : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const hour = rand(1, 12);
  const minute = sample(minutePool);
  const label = `${hour}:${String(minute).padStart(2, "0")}`;
  const spoken = describeTime(hour, minute);
  const choices = new Map<string, ClockChoiceData>();
  choices.set(label, { targetHour: hour, targetMinute: minute, label });

  while (choices.size < 4) {
    const maybeHour = rand(1, 12);
    const maybeMinute = sample(minutePool);
    const maybeLabel = `${maybeHour}:${String(maybeMinute).padStart(2, "0")}`;
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
          : `Tap the clock for potty time: ${spoken}.`,
      speech: `Tap the clock for potty time: ${spoken}.`,
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
  const coinKinds: CoinKind[] = ["penny", "nickel", "dime", "quarter"];

  if (skill.level <= 3) {
    const targetKind = sample(coinKinds);
    const choiceKinds = shuffle(coinKinds).slice(0, 4);
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
          `The ${coinLibrary[targetKind].label.toLowerCase()} is worth ${coinLibrary[targetKind].value} cents.`,
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
        `The coins add up to ${total} cents.`,
        `${total} cents`
      ),
      activityType: "coin-counting"
    }),
    choices: numberChoices(total, 0, Math.max(50, total + 20)),
    correctChoiceId: `choice-${total}`,
    coins
  };
};

const graphQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const labels = ["Corn", "Beans", "Toast", "Apples"];
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
      bars,
      question: "Which snack made the biggest stink bar?"
    }
  };
};

const geometryQuestion = (skill: SkillDefinition, mode: TeachingMode): QuestionDefinition => {
  const shapesByLevel: ShapeKind[][] = [
    ["circle", "square", "triangle"],
    ["circle", "square", "triangle", "rectangle"],
    ["circle", "square", "triangle", "rectangle", "hexagon"],
    ["triangle", "rectangle", "hexagon", "circle"],
    ["triangle", "rectangle", "hexagon", "square"],
    ["cube", "sphere", "cylinder", "cone"],
    ["triangle", "rectangle", "hexagon", "square"],
    ["circle", "square", "triangle", "rectangle", "hexagon"],
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
    const total = rand(3, 11);
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
          token: "🩲",
          color: "#9cf0ef",
          label: `${total} diapers`
        }
      ],
      drag: buildPromptToZoneDrag(promptItem, "Odd", "Even")
    };
  }

  const rows = rand(2, Math.min(5, 1 + skill.level));
  const columns = rand(2, Math.min(5, skill.level >= 7 ? 5 : 4));
  const total = rows * columns;
  return {
    ...buildBase(skill, mode, {
      prompt: "How many toilet-paper squares are in the array?",
      speech: "How many toilet-paper squares are in the array?",
      hint: "Count the rows and columns of toilet-paper squares carefully.",
      explanation: makeExplanation(
        `${rows} rows of ${columns} make ${total}.`,
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
