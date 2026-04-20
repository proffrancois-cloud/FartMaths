import { ACTIVITY_MIN_RESPONSE_MS } from "../data/rules";
import { STRAND_MAP } from "../data/catalog";
import type {
  ActivityType,
  AnswerChoice,
  ClockChoiceData,
  GraphBar,
  QuestionDefinition,
  SkillDefinition,
  StrandId,
  TeachingMode,
  VisualGroup
} from "../types";

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

const uniqueNumbers = (correct: number, count: number, min: number, max: number) => {
  const values = new Set<number>([correct]);
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
    value
  }));

const stringChoices = (correct: string, options: string[]): AnswerChoice[] =>
  shuffle(
    options.map((value) => ({
      id: `choice-${value}`,
      label: value,
      value
    }))
  ).map((choice) => ({
    ...choice,
    id: choice.value === correct ? `correct-${choice.value}` : choice.id
  }));

const supportTextForMode = (skill: SkillDefinition, mode: TeachingMode) => {
  if (mode === "example") return skill.scaffold.concrete;
  if (mode === "check") return skill.scaffold.abstract;
  return skill.scaffold.pictorial;
};

const typeForSkill = (skill: SkillDefinition): ActivityType => {
  if (skill.strandId === "addition-subtraction" && skill.level >= 6) {
    return "number-line-tap";
  }
  if (skill.strandId === "measurement" && skill.level >= 4) {
    return "drag-to-match";
  }
  if (skill.strandId === "equal-shares" && skill.level >= 8) {
    return "drag-to-match";
  }
  if (skill.strandId === "arrays-odd-even" && skill.level <= 2) {
    return "odd-even-pairing";
  }
  return skill.activityType;
};

const bubbleToken = ["💨", "✨", "🫧", "💩", "🧻"];
const graphColors = ["#7ed89f", "#7dc6ff", "#ffbc67", "#ff8cb1", "#c7a8ff"];
const shapeSet = ["circle", "square", "triangle", "rectangle", "hexagon"];
const equalShareOptions = [
  "Equal halves",
  "Unequal pieces",
  "Equal fourths",
  "Three fair shares"
];

const makeBase = (
  skill: SkillDefinition,
  mode: TeachingMode,
  prompt: string,
  speech: string,
  hint: string
): Pick<
  QuestionDefinition,
  "id" | "skillId" | "strandId" | "level" | "mode" | "prompt" | "speech" | "supportText" | "hint" | "minResponseMs"
> => ({
  id: randomId(),
  skillId: skill.id,
  strandId: skill.strandId,
  level: skill.level,
  mode,
  prompt,
  speech,
  supportText: supportTextForMode(skill, mode),
  hint,
  minResponseMs: ACTIVITY_MIN_RESPONSE_MS[typeForSkill(skill)]
});

const group = (count: number, color: string, label?: string): VisualGroup => ({
  id: randomId(),
  count,
  color,
  label,
  token: sample(bubbleToken)
});

const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

const clockChoiceSet = (hour: number, minute: number): ClockChoiceData[] => {
  const choices = new Map<string, ClockChoiceData>();
  choices.set(formatTime(hour, minute), {
    targetHour: hour,
    targetMinute: minute,
    label: formatTime(hour, minute)
  });

  while (choices.size < 4) {
    const maybeMinute = sample([0, 30, 5, 10, 15, 20, 25, 35, 40, 45, 50, 55]);
    const maybeHour = rand(1, 12);
    choices.set(formatTime(maybeHour, maybeMinute), {
      targetHour: maybeHour,
      targetMinute: maybeMinute,
      label: formatTime(maybeHour, maybeMinute)
    });
  }

  return shuffle([...choices.values()]);
};

const numberRecognitionQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const max = [5, 10, 20, 30, 50, 100, 120, 120, 1000, 1000][skill.level - 1];
  const target = skill.level >= 8 ? sample([5, 10]) * rand(2, Math.min(10, Math.floor(max / 10))) : rand(0, max);
  const base = makeBase(
    skill,
    mode,
    `Tap the numeral for ${target}.`,
    `Tap the numeral ${target}.`,
    `Look for the card that says ${target}.`
  );

  return {
    ...base,
    type: "drag-to-match",
    choices: numberChoices(target, Math.max(0, target - 3), Math.max(target + 5, 10)),
    correctChoiceId: `choice-${target}`,
    targetLabel: `${target}`
  };
};

const cardinalityQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const max = [3, 5, 10, 20, 20, 20, 20, 24, 30, 40][skill.level - 1];
  const count = rand(Math.max(1, max - 4), max);
  const base = makeBase(
    skill,
    mode,
    "Count the silly things. How many are there?",
    "Count the silly things and tap how many there are.",
    "Touch each item once, then choose the total."
  );

  return {
    ...base,
    type: "count-and-tap",
    choices: numberChoices(count, 0, Math.max(count + 4, 6)),
    correctChoiceId: `choice-${count}`,
    groups: [group(count, "#7ed89f", "Count me")]
  };
};

const comparingQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const max = [3, 10, 10, 20, 20, 99, 100, 120, 999, 999][skill.level - 1];
  const left = rand(1, max);
  const rightOffset = skill.level <= 2 ? rand(1, 3) : rand(0, 8);
  const right = Math.max(1, left + sample([-1, 1]) * rightOffset);
  const correct =
    left === right ? "Same" : left > right ? "Left has more" : "Right has more";
  const base = makeBase(
    skill,
    mode,
    "Which side has more?",
    "Look carefully. Which side has more, or are they the same?",
    "Count or compare the two groups one by one."
  );

  return {
    ...base,
    type: "compare-two-groups",
    choices: stringChoices(correct, ["Left has more", "Right has more", "Same"]),
    correctChoiceId:
      correct === "Left has more"
        ? "correct-Left has more"
        : correct === "Right has more"
          ? "correct-Right has more"
          : "correct-Same",
    groups: [group(left, "#7dc6ff", "Left"), group(right, "#ffbc67", "Right")]
  };
};

const additionQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const limit = [3, 5, 10, 10, 20, 20, 100, 100, 100, 1000][skill.level - 1];
  const addendA = rand(1, Math.max(2, Math.floor(limit * 0.6)));
  const addendB = rand(1, Math.max(2, Math.floor(limit * 0.4)));
  const operation = sample(["+", "-"]);
  const result = operation === "+" ? addendA + addendB : Math.max(0, addendA - rand(0, addendA));
  const basePrompt =
    operation === "+"
      ? `What is ${addendA} plus ${addendB}?`
      : `What is ${addendA} minus ${addendB}?`;
  const base = makeBase(
    skill,
    mode,
    basePrompt,
    basePrompt,
    operation === "+"
      ? "Try joining the two groups together."
      : "Try taking some away and count what is left."
  );

  if (skill.level >= 6) {
    return {
      ...base,
      type: "number-line-tap",
      choices: numberChoices(result, Math.max(0, result - 4), result + 8),
      correctChoiceId: `choice-${result}`,
      numberLine: {
        start: operation === "+" ? addendA : Math.max(0, addendA - addendB - 2),
        end: Math.max(limit, result + 5),
        target: result,
        jump: operation === "+" ? addendB : -addendB
      }
    };
  }

  return {
    ...base,
    type: "fill-ten-frame",
    choices: numberChoices(result, 0, Math.max(limit, result + 3)),
    correctChoiceId: `choice-${result}`,
    tenFrame: {
      target: Math.min(10, addendA + addendB),
      filled: Math.min(10, addendA)
    },
    groups: [group(addendA, "#ff9b8d", "First"), group(addendB, "#7ed89f", "Second")]
  };
};

const placeValueQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const hundreds = skill.level >= 8 ? rand(1, Math.min(3, skill.level - 6)) : 0;
  const tens = skill.level >= 2 ? rand(1, skill.level >= 8 ? 9 : 4) : 0;
  const ones = rand(0, skill.level >= 5 ? 9 : 5);
  const target = hundreds * 100 + tens * 10 + ones;
  const prompt = target < 20 ? `Build the teen number ${target}.` : `Which number matches these bundles?`;
  const base = makeBase(
    skill,
    mode,
    prompt,
    prompt,
    "Count the big bundles first, then the small ones."
  );

  return {
    ...base,
    type: "build-a-number",
    choices: numberChoices(target, Math.max(0, target - 20), target + 30),
    correctChoiceId: `choice-${target}`,
    buildNumber: {
      hundreds,
      tens,
      ones,
      target
    }
  };
};

const wordProblemQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const total = rand(4, skill.level >= 6 ? 40 : 12);
  const change = rand(1, Math.max(2, Math.floor(total / 2)));
  const addStory = Math.random() > 0.5;
  const answer = addStory ? total + change : total - change;
  const scene = addStory
    ? `A poop monster had ${total} corn kernels. Then ${change} more rolled in.`
    : `A fart cloud had ${total} bubbles. Then ${change} popped away.`;
  const question = "How many are there now?";
  const prompt = `${scene} ${question}`;
  const base = makeBase(
    skill,
    mode,
    prompt,
    prompt,
    "Watch the story picture and think about whether more joined or some went away."
  );

  return {
    ...base,
    type: "story-scene",
    choices: numberChoices(answer, Math.max(0, answer - 4), answer + 5),
    correctChoiceId: `choice-${answer}`,
    story: {
      scene,
      equation: addStory ? `${total} + ${change}` : `${total} - ${change}`
    }
  };
};

const measurementQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const left = rand(2, 10 + skill.level);
  const right = rand(2, 10 + skill.level);
  const relation =
    left === right ? "Same length" : left > right ? "Left is longer" : "Right is longer";
  const prompt =
    skill.level <= 3
      ? "Which one is longer?"
      : "Match the ruler idea to the longer object.";
  const base = makeBase(
    skill,
    mode,
    prompt,
    prompt,
    "Compare one end to the other end so the starts line up."
  );

  return {
    ...base,
    type: skill.level <= 3 ? "choose-the-answer" : "drag-to-match",
    choices: stringChoices(relation, ["Left is longer", "Right is longer", "Same length"]),
    correctChoiceId:
      relation === "Left is longer"
        ? "correct-Left is longer"
        : relation === "Right is longer"
          ? "correct-Right is longer"
          : "correct-Same length",
    groups: [group(left, "#7dc6ff", "Left worm"), group(right, "#ffbc67", "Right worm")]
  };
};

const timeQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const minutesPool =
    skill.level <= 2
      ? [0]
      : skill.level <= 4
        ? [0, 30]
        : [0, 30, 5, 10, 15, 20, 25, 35, 40, 45, 50, 55];
  const hour = rand(1, 12);
  const minute = sample(minutesPool);
  const label = `${hour}:${String(minute).padStart(2, "0")}`;
  const prompt = `Tap the clock that says ${label}.`;
  const choices = clockChoiceSet(hour, minute);
  const correctChoice = choices.find((choice) => choice.label === formatTime(hour, minute));
  const base = makeBase(
    skill,
    mode,
    prompt,
    `Tap the clock that says ${label}.`,
    "Look for the hour hand first, then the minute hand."
  );

  return {
    ...base,
    type: "clock-choice",
    choices: choices.map((choice) => ({
      id: `clock-${choice.label}`,
      label: choice.label,
      value: choice.label
    })),
    correctChoiceId: `clock-${correctChoice?.label ?? formatTime(hour, minute)}`,
    clockChoices: choices
  };
};

const moneyQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const coinValues = [1, 5, 10, 25];
  const coinCount = rand(2, skill.level >= 7 ? 5 : 3);
  const picked = Array.from({ length: coinCount }, () => sample(coinValues));
  const total = picked.reduce((sum, value) => sum + value, 0);
  const prompt = "Count the coins. How much stink-cash is here?";
  const base = makeBase(
    skill,
    mode,
    prompt,
    prompt,
    "Count coin values carefully. Nickels are 5, dimes are 10, and quarters are 25."
  );

  return {
    ...base,
    type: "coin-counting",
    choices: numberChoices(total, 0, Math.max(50, total + 20)),
    correctChoiceId: `choice-${total}`,
    groups: picked.map((value, index) =>
      group(
        1,
        value === 25 ? "#ffd86c" : value === 10 ? "#bcd6ff" : value === 5 ? "#ffe8ad" : "#f2b7b7",
        `Coin ${index + 1}: ${value}¢`
      )
    )
  };
};

const graphQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const bars: GraphBar[] = ["Corn", "Beans", "Toast", "Apples"].map((label, index) => ({
    label,
    value: rand(1, 2 + skill.level),
    color: graphColors[index]
  }));
  const winningBar = [...bars].sort((left, right) => right.value - left.value)[0];
  const prompt = "Which snack made the biggest stink bar?";
  const base = makeBase(
    skill,
    mode,
    prompt,
    prompt,
    "Find the bar that reaches the highest."
  );

  return {
    ...base,
    type: "graph-reading",
    choices: bars.map((bar) => ({
      id: `bar-${bar.label}`,
      label: bar.label,
      value: bar.label
    })),
    correctChoiceId: `bar-${winningBar.label}`,
    graph: {
      bars,
      question: prompt
    }
  };
};

const geometryQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const correct = sample(shapeSet.slice(0, Math.min(shapeSet.length, skill.level + 2)));
  const prompt = "Which shape belongs in the potty bin?";
  const base = makeBase(
    skill,
    mode,
    prompt,
    "Choose the shape that matches the potty bin.",
    "Look at the corners and sides before you tap."
  );

  return {
    ...base,
    type: "shape-sort",
    choices: shuffle(
      shapeSet.slice(0, 4).map((shape) => ({
        id: shape === correct ? `correct-${shape}` : `shape-${shape}`,
        label: shape,
        value: shape
      }))
    ),
    correctChoiceId: `correct-${correct}`,
    targetLabel: correct
  };
};

const equalSharesQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  const correct =
    skill.level <= 2
      ? "Equal halves"
      : skill.level <= 5
        ? "Equal fourths"
        : skill.level <= 7
          ? "Three fair shares"
          : sample(["Equal halves", "Equal fourths", "Three fair shares"]);
  const prompt = "Pick the fair share picture.";
  const base = makeBase(
    skill,
    mode,
    prompt,
    prompt,
    "Fair shares mean all the pieces are the same size."
  );

  const type: ActivityType = skill.level >= 8 ? "drag-to-match" : "choose-the-answer";
  return {
    ...base,
    type,
    choices: equalShareOptions.map((option) => ({
      id: option === correct ? `correct-${option}` : `share-${option}`,
      label: option,
      value: option
    })),
    correctChoiceId: `correct-${correct}`
  };
};

const arraysQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  if (skill.level <= 2) {
    const count = rand(3, 11);
    const odd = count % 2 === 1;
    const prompt = "Is this set odd or even?";
    const base = makeBase(
      skill,
      mode,
      prompt,
      prompt,
      "Try pairing the objects. One left over means odd."
    );

    return {
      ...base,
      type: "odd-even-pairing",
      choices: stringChoices(odd ? "Odd" : "Even", ["Odd", "Even"]),
      correctChoiceId: odd ? "correct-Odd" : "correct-Even",
      groups: [group(count, "#9cf0ef", `${count} socks`)]
    };
  }

  const rows = rand(2, Math.min(5, 1 + skill.level));
  const columns = rand(2, Math.min(5, skill.level >= 7 ? 5 : 4));
  const total = rows * columns;
  const prompt = "How many are in the array?";
  const base = makeBase(
    skill,
    mode,
    prompt,
    prompt,
    "Count the rows and columns, then multiply by repeated addition in your head."
  );

  return {
    ...base,
    type: "array-counting",
    choices: numberChoices(total, Math.max(0, total - 6), total + 8),
    correctChoiceId: `choice-${total}`,
    arrayData: {
      rows,
      columns,
      target: total
    }
  };
};

export const generateQuestion = (
  skill: SkillDefinition,
  mode: TeachingMode
): QuestionDefinition => {
  switch (skill.strandId) {
    case "number-recognition":
      return numberRecognitionQuestion(skill, mode);
    case "cardinality":
      return cardinalityQuestion(skill, mode);
    case "comparing":
      return comparingQuestion(skill, mode);
    case "addition-subtraction":
      return additionQuestion(skill, mode);
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
  STRAND_MAP[strandId].levels[Math.max(0, Math.min(level - 1, STRAND_MAP[strandId].levels.length - 1))];
