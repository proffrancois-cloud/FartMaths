import type {
  ActivityType,
  AvatarDefinition,
  GradeBand,
  RewardDefinition,
  SkillAlignmentSeed,
  SkillConstraints,
  StrandDefinition,
  StrandId
} from "../types";

export const SESSION_LENGTHS = [5, 8, 10] as const;

export const AVATARS: AvatarDefinition[] = [
  {
    id: "farting-emoji",
    label: "Fart Dash",
    description: "A speedy emoji with little fart clouds behind it.",
    accent: "#68cf9a",
    glow: "rgba(125, 255, 198, 0.4)",
    imageSrc: "/avatars/farting-emoji.png"
  },
  {
    id: "pooping-emoji",
    label: "Toilet Plop",
    description: "A squishy emoji sitting on the toilet and trying very hard.",
    accent: "#7c4d23",
    glow: "rgba(255, 194, 102, 0.45)",
    imageSrc: "/avatars/pooping-emoji.png"
  },
  {
    id: "toilet-roll-hero",
    label: "Nose Pinch Roll",
    description: "A toilet roll pinching its nose at the stinkiest math jokes.",
    accent: "#7fd4ff",
    glow: "rgba(115, 204, 255, 0.48)",
    imageSrc: "/avatars/toilet-roll-hero.png"
  }
];

export const REWARDS: RewardDefinition[] = [
  {
    id: "first-puff",
    title: "First Puff",
    description: "Finished the very first FartMaths round.",
    color: "#7ed89f"
  },
  {
    id: "streak-3",
    title: "Three-Day Toot",
    description: "Played three days in a row.",
    color: "#ffbc67"
  },
  {
    id: "streak-7",
    title: "Mega Stink Week",
    description: "Kept a seven-day streak alive.",
    color: "#ff8b8b"
  },
  {
    id: "mastery-1",
    title: "Golden Toilet Seat",
    description: "Mastered a micro-skill level.",
    color: "#ffd86c"
  },
  {
    id: "checkpoint-pro",
    title: "Checkpoint Champ",
    description: "Passed a five-question checkpoint.",
    color: "#7dc6ff"
  },
  {
    id: "careful-clicker",
    title: "Careful Clicker",
    description: "Completed a round with no suspicious fast taps.",
    color: "#dab3ff"
  },
  {
    id: "review-ranger",
    title: "Review Ranger",
    description: "Came back and strengthened an older skill.",
    color: "#79e0d3"
  },
  {
    id: "potty-professor",
    title: "Potty Professor",
    description: "Reached Grade-2 Ready in a strand.",
    color: "#c5ff7d"
  }
];

export const PROFILE_PRESETS = [
  {
    id: "ely",
    displayName: "Ély",
    aliases: ["ely", "ély"],
    defaultAvatarId: "farting-emoji"
  },
  {
    id: "ira",
    displayName: "Ira",
    aliases: ["ira"],
    defaultAvatarId: "pooping-emoji"
  }
] as const;

interface StrandSeed {
  id: StrandId;
  title: string;
  shortTitle: string;
  color: string;
  mascot: string;
  description: string;
  activityType: ActivityType;
  concrete: string;
  pictorial: string;
  abstract: string;
  celebrations: string[];
  summaries: string[];
  ccss: SkillAlignmentSeed[];
}

const gradeBandToDifficultyBand = (gradeBand: GradeBand) => {
  switch (gradeBand) {
    case "K":
      return "Kindergarten Core";
    case "G1":
      return "Grade 1 Core";
    case "G2":
      return "Grade 2 Core";
    case "K-G1":
      return "Kindergarten to Grade 1 bridge";
    case "G1-G2":
      return "Grade 1 to Grade 2 bridge";
    case "K-G2":
      return "K-2 cross-grade reasoning";
    case "Extension":
      return "Extension beyond required K-2";
  }
};

const withOptionalAlignmentFields = (
  alignmentNotes?: string,
  constraints?: SkillConstraints
) => ({
  ...(alignmentNotes ? { alignmentNotes } : {}),
  ...(constraints ? { constraints } : {})
});

const coreAlignment = (
  ccssCodes: string[],
  gradeBand: GradeBand,
  alignmentNotes?: string,
  constraints?: SkillConstraints
): SkillAlignmentSeed => ({
  ccssCodes,
  gradeBand,
  isCoreK2: true,
  isExtension: false,
  ...withOptionalAlignmentFields(alignmentNotes, constraints)
});

const extensionAlignment = (
  alignmentNotes: string,
  constraints?: SkillConstraints
): SkillAlignmentSeed => ({
  ccssCodes: ["Extension"],
  gradeBand: "Extension",
  isCoreK2: false,
  isExtension: true,
  ...withOptionalAlignmentFields(alignmentNotes, constraints)
});

const makeSkillId = (strandId: StrandId, level: number) =>
  `${strandId}-level-${String(level).padStart(2, "0")}`;

const STRAND_SEEDS: StrandSeed[] = [
  {
    id: "number-recognition",
    title: "Number Recognition & Counting",
    shortTitle: "Counting",
    color: "#7af0aa",
    mascot: "Fart Cloud Parade",
    description: "See numerals, count forward, and build flexible number sense.",
    activityType: "drag-to-match",
    concrete: "Count fart clouds and poopy diapers one touch at a time.",
    pictorial: "Match spoken numbers to bright numeral cards and picture sets.",
    abstract: "Read, order, and skip-count without concrete counters every time.",
    celebrations: [
      "Tiny Toot",
      "Number Nibbler",
      "Count Boss",
      "Rocket Rumbler",
      "Cloud Counter",
      "Big Number Boot",
      "Count Champion",
      "Skip-Count Stinker",
      "Thousand Tooter",
      "Number Name Ninja"
    ],
    summaries: [
      "Recognize numerals 0–5.",
      "Count to 10; match spoken number to numeral 0–10.",
      "Count to 20; recognize numerals 11–20.",
      "Count on from any number to 30.",
      "Read / select numerals to 50.",
      "Count to 100 by ones and tens.",
      "Start counting at any number up to 120.",
      "Skip-count by 5s and 10s.",
      "Count within 1000; skip-count by 100s.",
      "Read / write numbers to 1000; use number names and expanded form."
    ],
    ccss: [
      coreAlignment(["K.CC.A.3"], "K", "Numerals 0-20; this is an early slice.", { maxNumber: 5 }),
      coreAlignment(["K.CC.A.1", "K.CC.A.3"], "K", "Count sequence plus numeral recognition.", { maxNumber: 10 }),
      coreAlignment(["K.CC.A.3"], "K", "Keep 0-20 explicit.", { maxNumber: 20 }),
      coreAlignment(["K.CC.A.2"], "K-G1", "Counting forward from a given number, with a Grade 1 bridge.", {
        maxNumber: 30
      }),
      coreAlignment(["1.NBT.A.1"], "G1", "Grade 1 extends count, read, and write to 120.", {
        maxNumber: 50
      }),
      coreAlignment(["K.CC.A.1"], "K", "Officially Kindergarten; current level placement must not imply G1 only.", {
        maxNumber: 100
      }),
      coreAlignment(["1.NBT.A.1"], "G1", "Grade 1 counting and numeral sequence to 120.", { maxNumber: 120 }),
      coreAlignment(["2.NBT.A.2"], "G2", "Skip-count by 5s is Grade 2.", { maxNumber: 100 }),
      coreAlignment(["2.NBT.A.2"], "G2", "Grade 2 skip-counting within 1000.", { maxNumber: 1000 }),
      coreAlignment(["2.NBT.A.3"], "G2", "Not Beyond; official Grade 2.", { maxNumber: 1000 })
    ]
  },
  {
    id: "cardinality",
    title: "Counting Objects / Cardinality",
    shortTitle: "Cardinality",
    color: "#ffce73",
    mascot: "Poop Parade Buckets",
    description: "Know that the last number counted tells how many there are.",
    activityType: "count-and-tap",
    concrete: "Tap each object once so every silly token has a counted home.",
    pictorial: "Count rows, arrays, and scattered items without losing track.",
    abstract: "Recognize total amounts in equal groups and place-value blocks.",
    celebrations: [
      "Tap Toot",
      "Counter Caper",
      "Last-Number Legend",
      "Scatter Sniffer",
      "Total Finder",
      "Track Master",
      "Count-On Captain",
      "Group Grabber",
      "Block Boss",
      "Hundreds Hopper"
    ],
    summaries: [
      "Match 1–3 objects to the right number.",
      "Use one-to-one counting for sets to 5.",
      "Count sets to 10 in lines or arrays.",
      "Count scattered sets to 10; arranged sets to 20.",
      "Understand last number said = total and the next number is one more.",
      "Count mixed layouts without losing track.",
      "Count on to find totals within 20.",
      "Count objects in equal groups and small arrays.",
      "Count tens and ones blocks to 100.",
      "Count hundreds, tens, and ones to 1000."
    ],
    ccss: [
      coreAlignment(["K.CC.B.4", "K.CC.B.5"], "K", "Early cardinality.", { maxObjects: 3 }),
      coreAlignment(["K.CC.B.4a"], "K", "One object receives one number word.", { maxObjects: 5 }),
      coreAlignment(["K.CC.B.5"], "K", "Arranged sets can go to 20.", {
        maxObjects: 20,
        layoutConstraint: "arranged",
        allowedLayouts: ["line", "array", "circle"]
      }),
      coreAlignment(["K.CC.B.5"], "K", "Scattered sets stay to 10; arranged sets may go to 20.", {
        maxObjects: 20,
        layoutConstraint: "arranged-or-scattered",
        allowedLayouts: ["scattered", "line", "array", "circle"]
      }),
      coreAlignment(["K.CC.B.4b", "K.CC.B.4c"], "K", "Cardinality principle and one-more sequence.", { maxObjects: 20 }),
      coreAlignment(["K.CC.B.4a", "K.CC.B.5"], "K", "Respect object and layout limits.", {
        maxObjects: 20,
        layoutConstraint: "arranged-or-scattered"
      }),
      coreAlignment(["1.OA.C.5", "1.OA.C.6"], "G1", "Addition strategy.", { maxNumber: 20 }),
      coreAlignment(["2.OA.C.4"], "G2", "Foundation for multiplication through arrays and equal groups.", {
        maxArrayRows: 5,
        maxArrayColumns: 5,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["1.NBT.B.2"], "G1", "Tens and ones place value.", { maxNumber: 100 }),
      coreAlignment(["2.NBT.A.1", "2.NBT.A.1a", "2.NBT.A.1b"], "G2", "Not Beyond.", { maxNumber: 1000 })
    ]
  },
  {
    id: "comparing",
    title: "Comparing Quantities and Numbers",
    shortTitle: "Comparing",
    color: "#7ec8ff",
    mascot: "Bubble Battle",
    description: "Compare sets and numerals with meaning before symbols.",
    activityType: "compare-two-groups",
    concrete: "Look at two silly groups and decide who has more, less, or the same.",
    pictorial: "Use pictures, bars, and lines to compare close quantities.",
    abstract: "Compare numerals using place value and symbols with confidence.",
    celebrations: [
      "More-or-Less Mess",
      "Bubble Judge",
      "Compare Champ",
      "Number Ref",
      "Symbol Sniffer",
      "Two-Digit Judge",
      "Order Boss",
      "Line Comparer",
      "Three-Digit Showdown",
      "Place-Value Speaker"
    ],
    summaries: [
      "Spot which group has more / less / same up to 3.",
      "Compare two groups up to 10.",
      "Compare numerals to 10.",
      "Compare numbers to 20.",
      "Use >, <, = within 20.",
      "Compare two-digit numbers by tens and ones.",
      "Order three numbers to 100.",
      "Use number lines as lengths from 0 and measurement visuals to compare.",
      "Compare three-digit numbers.",
      "Explain a comparison using place-value language."
    ],
    ccss: [
      coreAlignment(["K.CC.C.6"], "K", "Compare groups.", { maxObjects: 3 }),
      coreAlignment(["K.CC.C.6"], "K", "Kindergarten group comparison.", { maxObjects: 10 }),
      coreAlignment(["K.CC.C.7"], "K", "Kindergarten numerals 1-10.", { maxNumber: 10 }),
      coreAlignment(["1.NBT.B.3"], "G1", "Grade 1 comparison extension.", { maxNumber: 20 }),
      coreAlignment(["1.NBT.B.3"], "G1", "Symbols supported by meaning.", { maxNumber: 20 }),
      coreAlignment(["1.NBT.B.3"], "G1", "Grade 1 two-digit comparison.", { maxNumber: 100 }),
      coreAlignment(["1.NBT.B.3"], "G1", "Extension of compare; acceptable as a skill.", { maxNumber: 100 }),
      coreAlignment(["2.MD.B.6"], "G2", "Supports number line and length reasoning.", {
        allowedLayouts: ["number-line"]
      }),
      coreAlignment(["2.NBT.A.4"], "G2", "Grade 2 three-digit comparison.", { maxNumber: 1000 }),
      coreAlignment(["2.NBT.A.4", "2.NBT.B.9"], "G2", "Reasoning and explanation, not Beyond.", {
        maxNumber: 1000
      })
    ]
  },
  {
    id: "addition-subtraction",
    title: "Addition & Subtraction",
    shortTitle: "Add & Subtract",
    color: "#ff9b8d",
    mascot: "Toilet Stall Ten-Frame",
    description: "Build addition and subtraction from joining, separating, and making tens.",
    activityType: "fill-ten-frame",
    concrete: "Join or take away visual tokens with big touch targets and instant models.",
    pictorial: "Use ten-frames, number lines, and drawings to make thinking visible.",
    abstract: "Work with missing numbers, mental jumps, and larger place-value moves.",
    celebrations: [
      "Tiny Add Toot",
      "Five-Frame Flinger",
      "Ten-Frame Titan",
      "Make-10 Master",
      "Twenty Tooter",
      "Missing-Part Pro",
      "Double-Digit Dancer",
      "Hundred Hopper",
      "Fluent Farter",
      "Thousand Thunder"
    ],
    summaries: [
      "Join / take away within 3 with pictures.",
      "Add and subtract within 5.",
      "Add and subtract within 10 using objects.",
      "Decompose numbers to 10 in more than one way on ten-frames.",
      "Add / subtract within 20, including three addends.",
      "Solve missing numbers and true / false equations within 20.",
      "Add two-digit + one-digit or + tens within 100.",
      "Subtract multiples of 10; use drawings within 100.",
      "Fluently add and subtract within 100; add up to four two-digit numbers.",
      "Add / subtract within 1000 with drawings and place-value methods."
    ],
    ccss: [
      coreAlignment(["K.OA.A.1", "K.OA.A.2"], "K", "Meaning of add and subtract.", {
        maxNumber: 3,
        allowedProblemTypes: ["add-to", "take-from"]
      }),
      coreAlignment(["K.OA.A.5"], "K", "Fluency within 5.", { maxNumber: 5 }),
      coreAlignment(["K.OA.A.2"], "K", "Within 10.", { maxNumber: 10 }),
      coreAlignment(["K.OA.A.3", "K.OA.A.4"], "K", "Decompose numbers and make 10.", {
        maxNumber: 10,
        allowedLayouts: ["ten-frame"]
      }),
      coreAlignment(["1.OA.A.2", "1.OA.B.3", "1.OA.C.5", "1.OA.C.6"], "G1", "Grade 1, including three-addend and strategy prompts.", { maxNumber: 20 }),
      coreAlignment(["1.OA.B.4", "1.OA.D.7", "1.OA.D.8"], "G1", "Unknown addend and equal-sign meaning.", {
        maxNumber: 20,
        unknownPosition: "any"
      }),
      coreAlignment(["1.NBT.C.4"], "G1", "Place-value addition.", { maxNumber: 100 }),
      coreAlignment(["1.NBT.C.6"], "G1", "Subtract multiples of 10.", { maxNumber: 100 }),
      coreAlignment(["2.OA.B.2", "2.NBT.B.5", "2.NBT.B.6"], "G2", "Grade 2 fluency and multi-addend two-digit addition.", { maxNumber: 100 }),
      coreAlignment(["2.NBT.B.7", "2.NBT.B.9"], "G2", "Not Beyond; official Grade 2 with place-value explanation.", { maxNumber: 1000 })
    ]
  },
  {
    id: "place-value",
    title: "Place Value",
    shortTitle: "Place Value",
    color: "#c59eff",
    mascot: "Bundle Builder",
    description: "See how ones bundle into tens and tens bundle into hundreds.",
    activityType: "build-a-number",
    concrete: "Bundle toilet rolls and poop nuggets into ones, tens, and hundreds.",
    pictorial: "Match base-ten drawings with written numerals and expanded views.",
    abstract: "Use place-value language, compare numbers, and shift by +10 or +100.",
    celebrations: [
      "One-Pile Pal",
      "Teen Builder",
      "Ten-and-Some Hero",
      "Bundle Buddy",
      "Tens-and-Ones Ace",
      "Compare Bundles Pro",
      "Mental Tens Tooter",
      "Hundreds Hatchling",
      "Thousand Builder",
      "Expanded-Form Expert"
    ],
    summaries: [
      "Sort groups of ones.",
      "Build teen numbers as 10 + ones with visuals.",
      "See 11–19 as one ten and some ones.",
      "Group ones into tens.",
      "Read two-digit numbers as tens and ones, including bundles and leftovers.",
      "Compare two-digit numbers by place value.",
      "Add / subtract 10 mentally within 100.",
      "Build 3-digit numbers with hundreds, tens, ones.",
      "Read, write, and compare numbers to 1000.",
      "Use expanded form, mental +100 / -100, and explain place-value moves."
    ],
    ccss: [
      coreAlignment(["K.NBT.A.1"], "K", "Pre-place-value ones.", { maxNumber: 10 }),
      coreAlignment(["K.NBT.A.1"], "K", "Kindergarten base-ten foundation.", { maxNumber: 19 }),
      coreAlignment(["K.NBT.A.1"], "K", "Kindergarten.", { maxNumber: 19 }),
      coreAlignment(["1.NBT.B.2", "1.NBT.B.2a"], "G1", "10 ones = 1 ten.", { maxNumber: 100 }),
      coreAlignment(["1.NBT.B.2", "1.NBT.B.2b", "1.NBT.B.2c"], "G1", "Tens and ones, including multiples of ten.", { maxNumber: 100 }),
      coreAlignment(["1.NBT.B.3"], "G1", "Grade 1.", { maxNumber: 100 }),
      coreAlignment(["1.NBT.C.5"], "G1", "10 more / 10 less.", { maxNumber: 100 }),
      coreAlignment(["2.NBT.A.1", "2.NBT.A.1a", "2.NBT.A.1b"], "G2", "Hundreds, tens, and ones.", { maxNumber: 1000 }),
      coreAlignment(["2.NBT.A.3", "2.NBT.A.4"], "G2", "Grade 2.", { maxNumber: 1000 }),
      coreAlignment(["2.NBT.A.3", "2.NBT.B.8", "2.NBT.B.9"], "G2", "Not Beyond.", { maxNumber: 1000 })
    ]
  },
  {
    id: "word-problems",
    title: "Word Problems",
    shortTitle: "Word Problems",
    color: "#7fded6",
    mascot: "Story Toilet Theater",
    description: "Use visual scenes and spoken stories to choose or build the right math.",
    activityType: "story-scene",
    concrete: "Act out short stories with pictures before looking at equations.",
    pictorial: "Match a spoken story to a visual scene, model, or equation.",
    abstract: "Reason through one-step and two-step stories across several strands.",
    celebrations: [
      "Story Sniff",
      "Picture Picker",
      "Story Solver",
      "Twenty Tale Tooter",
      "Unknown Finder",
      "Equation Explorer",
      "Hundred Helper",
      "Two-Step Tinkerer",
      "Life-Math Legend",
      "Operation Oracle"
    ],
    summaries: [
      "Act out tiny add / take away stories.",
      "Choose the picture that matches a story.",
      "Solve one-step stories within 10.",
      "Solve one-step and three-addend stories within 20.",
      "Find the unknown in any position within 20.",
      "Use drawings / equations for put-together / compare stories.",
      "Solve one-step addition / subtraction within 100.",
      "Solve one- and two-step mixed stories within 100.",
      "Solve length, time, and money story problems.",
      "Explain which operation fits a K–2 story problem."
    ],
    ccss: [
      coreAlignment(["K.OA.A.1", "K.OA.A.2"], "K", "Concrete story problems.", {
        maxNumber: 10,
        allowedProblemTypes: ["add-to", "take-from"]
      }),
      coreAlignment(["K.OA.A.1"], "K", "Representation.", { maxNumber: 10 }),
      coreAlignment(["K.OA.A.2"], "K", "Kindergarten.", { maxNumber: 10 }),
      coreAlignment(["1.OA.A.1", "1.OA.A.2"], "G1", "Grade 1, including three whole numbers.", { maxNumber: 20 }),
      coreAlignment(["1.OA.A.1", "1.OA.D.8"], "G1", "Unknown in all positions.", {
        maxNumber: 20,
        unknownPosition: "any"
      }),
      coreAlignment(["1.OA.A.1", "1.OA.B.4"], "G1", "Compare and unknown-addend.", {
        maxNumber: 20,
        allowedProblemTypes: ["put-together", "take-apart", "compare"]
      }),
      coreAlignment(["2.OA.A.1"], "G2", "Grade 2.", { maxNumber: 100 }),
      coreAlignment(["2.OA.A.1"], "G2", "Grade 2.", { maxNumber: 100 }),
      coreAlignment(["2.MD.B.5", "2.MD.C.8"], "G2", "Length and money are explicit; time is an application.", {
        maxNumber: 100
      }),
      coreAlignment(["MP1", "MP2", "MP4"], "K-G2", "Mathematical practice and operation reasoning.", {
        maxNumber: 100
      })
    ]
  },
  {
    id: "measurement",
    title: "Measurement",
    shortTitle: "Measurement",
    color: "#8bc5ff",
    mascot: "Toilet Paper Worm Race",
    description: "Compare, measure, and pick the right tool or unit.",
    activityType: "choose-the-answer",
    concrete: "Use language like longer or heavier while touching real-looking visual objects.",
    pictorial: "Drag unit tiles and compare picture lengths with big clear visuals.",
    abstract: "Measure with rulers, solve length problems, and choose efficient tools.",
    celebrations: [
      "Longer-Looker",
      "Compare Critter",
      "Measure Mixer",
      "Unit Walker",
      "Equal-Unit Eagle",
      "Ruler Rookie",
      "Length Legend",
      "Tool Tracker",
      "Inch Detective",
      "Tool Boss"
    ],
    summaries: [
      "Use words like taller, shorter, longer, heavier.",
      "Directly compare two objects.",
      "Sort and order three objects by measurable attribute.",
      "Compare lengths indirectly using a third object.",
      "Use equal-size units with no gaps / overlaps.",
      "Measure the same length with two different units.",
      "Compare two measured lengths.",
      "Add / subtract lengths in word problems.",
      "Estimate then measure with inches / centimeters.",
      "Choose the right tool and unit for the job."
    ],
    ccss: [
      coreAlignment(["K.MD.A.1"], "K", "Describe measurable attributes."),
      coreAlignment(["K.MD.A.2"], "K", "Direct comparison."),
      coreAlignment(["K.MD.B.3", "1.MD.A.1"], "K-G1", "Classification and ordering three objects."),
      coreAlignment(["1.MD.A.1"], "G1", "Indirect comparison through a third object."),
      coreAlignment(["1.MD.A.2"], "G1", "Critical precision."),
      coreAlignment(["2.MD.A.1", "2.MD.A.2"], "G2", "Measure the same object with different units."),
      coreAlignment(["2.MD.A.4"], "G2", "Difference in length."),
      coreAlignment(["2.MD.B.5"], "G2", "Length word problems.", { maxNumber: 100 }),
      coreAlignment(["2.MD.A.3"], "G2", "Estimation."),
      coreAlignment(["2.MD.A.1"], "G2", "Tool choice.")
    ]
  },
  {
    id: "time",
    title: "Time",
    shortTitle: "Time",
    color: "#ffd281",
    mascot: "Bath Time Clock Club",
    description: "Move from time-order words to clocks, schedules, and five-minute reasoning.",
    activityType: "clock-choice",
    concrete: "Talk about what comes before, after, first, and next in daily life.",
    pictorial: "Read big friendly analog clocks, then match to digital times.",
    abstract: "Use five-minute intervals and solve simple time stories.",
    celebrations: [
      "Before-and-After Blaster",
      "Clock Parts Pal",
      "Hour Hero",
      "Half-Hour Hopper",
      "Clock Matcher",
      "Five-Minute Finder",
      "Schedule Sniffer",
      "Plan Captain",
      "Story-Time Solver",
      "A.M. / P.M. Ace"
    ],
    summaries: [
      "Talk about daily order: before / after / first / next.",
      "Recognize parts of an analog clock.",
      "Read o'clock times.",
      "Read half-hour times.",
      "Match analog and digital: hour / half-hour.",
      "Choose nearest 5-minute times from options.",
      "Read time to the nearest 5 minutes.",
      "Use a simple schedule with start times.",
      "Solve basic time story problems in 5-minute steps.",
      "Use a.m. / p.m. and daily schedule reasoning."
    ],
    ccss: [
      extensionAlignment("Useful pre-skill; not an explicit CCSS math standard."),
      coreAlignment(["1.MD.B.3"], "G1", "Prepares hour and half-hour.", { timeMinuteIncrement: 60 }),
      coreAlignment(["1.MD.B.3"], "G1", "Grade 1.", { timeMinuteIncrement: 60 }),
      coreAlignment(["1.MD.B.3"], "G1", "Grade 1.", { timeMinuteIncrement: 30 }),
      coreAlignment(["1.MD.B.3"], "G1", "Grade 1.", { timeMinuteIncrement: 30 }),
      coreAlignment(["2.MD.C.7"], "G2", "Grade 2.", { timeMinuteIncrement: 5 }),
      coreAlignment(["2.MD.C.7"], "G2", "Grade 2.", { timeMinuteIncrement: 5 }),
      coreAlignment(["2.MD.C.7"], "G2", "Application.", { timeMinuteIncrement: 5 }),
      extensionAlignment("Useful, but not explicit K-2 CCSS content.", { timeMinuteIncrement: 5 }),
      coreAlignment(["2.MD.C.7"], "G2", "Grade 2.", { timeMinuteIncrement: 5, requireAmPm: true })
    ]
  },
  {
    id: "money",
    title: "Money",
    shortTitle: "Money",
    color: "#9bf27b",
    mascot: "Piggy Toilet Bank",
    description: "Recognize coins and bills, count values, and solve simple money totals.",
    activityType: "coin-counting",
    concrete: "Sort coins by how they look before worrying about totals.",
    pictorial: "Count like coins and mixed coins with friendly visuals and price tags.",
    abstract: "Make exact amounts and solve simple money stories with coins and bills.",
    celebrations: [
      "Coin Sniffer",
      "Coin Spotter",
      "Coin Value Pal",
      "Like-Coin Counter",
      "Mixed Coin Mover",
      "Enough-or-Not Agent",
      "Dollar Detective",
      "Bill Builder",
      "Money Story Maker",
      "Exact Amount Expert"
    ],
    summaries: [
      "Sort coins by appearance.",
      "Identify penny / nickel / dime / quarter.",
      "Know the value of common coins.",
      "Count sets of like coins.",
      "Count mixed coins up to 25¢.",
      "Decide enough / not enough for small prices.",
      "Count mixed coins up to $1.",
      "Use bills + coins in simple totals.",
      "Solve simple money stories.",
      "Make an exact amount in more than one way."
    ],
    ccss: [
      coreAlignment(["2.MD.C.8"], "G2", "Pre-skill for money; money is Grade 2 in strict K-2 CCSS.", {
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "U.S. money.", {
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "U.S. money.", {
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "Grade 2.", {
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "Grade 2.", {
        maxNumber: 25,
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "Application.", {
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "Grade 2.", {
        maxNumber: 100,
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "Grade 2.", {
        maxNumber: 100,
        allowedCoins: ["penny", "nickel", "dime", "quarter", "dollar"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "Word problems.", {
        maxNumber: 100,
        allowedCoins: ["penny", "nickel", "dime", "quarter"]
      }),
      coreAlignment(["2.MD.C.8"], "G2", "Good extension within the same standard.", {
        maxNumber: 100,
        allowedCoins: ["penny", "nickel", "dime", "quarter", "dollar"]
      })
    ]
  },
  {
    id: "data-graphs",
    title: "Data / Graphs",
    shortTitle: "Data & Graphs",
    color: "#ff9ed4",
    mascot: "Stink Bar Chart",
    description: "Sort data, count categories, and read simple graphs for comparison questions.",
    activityType: "graph-reading",
    concrete: "Sort snacks, toys, and tokens into categories before drawing graphs.",
    pictorial: "Read picture graphs and bar graphs with one question at a time.",
    abstract: "Create graphs and solve more/fewer questions from the data shown.",
    celebrations: [
      "Sort Sprite",
      "Category Counter",
      "Picture Graph Popper",
      "Graph Reader",
      "Graph Maker",
      "Bar Boss",
      "Compare Bar Champ",
      "Data Builder",
      "Totals Tracker",
      "Graph Story Genius"
    ],
    summaries: [
      "Sort objects into categories.",
      "Count how many in each category.",
      "Tell which category has more / less / same.",
      "Read a simple picture graph.",
      "Make a simple picture graph.",
      "Read a bar graph.",
      "Answer how many more / fewer from a graph.",
      "Create a bar graph or line plot from small data.",
      "Compare several categories and totals.",
      "Use graph information in short word problems."
    ],
    ccss: [
      coreAlignment(["K.MD.B.3"], "K", "Classify.", { maxCategories: 3 }),
      coreAlignment(["K.MD.B.3"], "K", "Count categories.", { maxCategories: 3 }),
      coreAlignment(["K.MD.B.3", "1.MD.C.4"], "K-G1", "Compare data.", { maxCategories: 3 }),
      coreAlignment(["1.MD.C.4"], "G1", "Up to 3 categories in Grade 1.", {
        maxCategories: 3,
        allowedLayouts: ["picture-graph"]
      }),
      coreAlignment(["1.MD.C.4"], "G1", "Up to 3 categories.", {
        maxCategories: 3,
        allowedLayouts: ["picture-graph"]
      }),
      coreAlignment(["2.MD.D.10"], "G2", "Up to 4 categories.", {
        maxCategories: 4,
        allowedLayouts: ["bar-graph"]
      }),
      coreAlignment(["2.MD.D.9", "2.MD.D.10"], "G2", "Grade 2 line plots and bar graphs.", {
        maxCategories: 4,
        allowedLayouts: ["bar-graph", "line-plot"]
      }),
      coreAlignment(["2.MD.D.10"], "G2", "Grade 2.", {
        maxCategories: 4,
        allowedLayouts: ["bar-graph"]
      }),
      coreAlignment(["2.MD.D.10"], "G2", "Max 4 categories.", {
        maxCategories: 4,
        allowedLayouts: ["bar-graph"]
      }),
      coreAlignment(["2.MD.D.10"], "G2", "Grade 2.", {
        maxCategories: 4,
        allowedLayouts: ["bar-graph"]
      })
    ]
  },
  {
    id: "geometry",
    title: "Geometry / Shapes",
    shortTitle: "Geometry",
    color: "#90a6ff",
    mascot: "Shape Sort Sewer",
    description: "Recognize, build, sort, and combine 2D and 3D shapes.",
    activityType: "shape-sort",
    concrete: "Touch and sort big shapes by obvious features first.",
    pictorial: "Notice sides, corners, solids, and shapes in new orientations.",
    abstract: "Compose shapes and use attributes to explain thinking.",
    celebrations: [
      "Shape Spotter",
      "Solid Sniffer",
      "Turn-and-Tell Pro",
      "Corner Counter",
      "Shape Builder",
      "Compose Captain",
      "Attribute Ace",
      "Sort Scientist",
      "Rectangle Ranger",
      "Puzzle Professor"
    ],
    summaries: [
      "Name circle, square, triangle.",
      "Name rectangles, quadrilaterals, pentagons, hexagons, cubes, and common solids.",
      "Recognize shapes in any size, orientation, or position.",
      "Describe sides, corners, flat, solid.",
      "Build and draw shapes.",
      "Compose simple shapes to make new shapes.",
      "Describe defining vs non-defining attributes.",
      "Sort shapes and explain why they belong.",
      "Partition rectangles into rows / columns; count squares.",
      "Combine and decompose shapes to solve puzzles."
    ],
    ccss: [
      coreAlignment(["K.G.A.2"], "K", "Shape naming."),
      coreAlignment(["K.G.A.2", "K.G.A.3", "2.G.A.1"], "K-G2", "Quadrilaterals, pentagons, hexagons, cubes, and common solids are explicit."),
      coreAlignment(["K.G.A.1", "K.G.A.2"], "K", "Orientation, size, and spatial language."),
      coreAlignment(["K.G.B.4"], "K", "Attributes."),
      coreAlignment(["K.G.B.5"], "K", "Modeling shapes."),
      coreAlignment(["K.G.B.6"], "K", "Composition."),
      coreAlignment(["1.G.A.1"], "G1", "Grade 1."),
      coreAlignment(["1.G.A.1", "2.G.A.1"], "G1-G2", "Attribute reasoning."),
      coreAlignment(["2.G.A.2"], "G2", "Grade 2.", {
        allowedLayouts: ["array"]
      }),
      coreAlignment(["K.G.B.6", "1.G.A.2"], "K-G1", "Not necessarily Beyond.")
    ]
  },
  {
    id: "equal-shares",
    title: "Equal Shares / Early Fractions",
    shortTitle: "Equal Shares",
    color: "#ffe2a8",
    mascot: "Fair Slice Feast",
    description: "See fair shares first, then connect them to early fraction language.",
    activityType: "choose-the-answer",
    concrete: "Look for fair and unfair sharing in familiar shapes and snacks.",
    pictorial: "Choose halves, fourths, and thirds from shaded visual models.",
    abstract: "Match unit fraction names and compare simple equal-share models.",
    celebrations: [
      "Fair Share Friend",
      "Half Hunter",
      "Quarter Quest",
      "Equal Picker",
      "Different-Look Shares",
      "Fraction Word Finder",
      "Thirds Trailblazer",
      "Shade Matcher",
      "Unit Fraction Viewer",
      "Whole Builder"
    ],
    summaries: [
      "Notice same-size vs different-size pieces.",
      "Find halves in familiar shapes.",
      "Find fourths / quarters in familiar shapes.",
      "Choose equal vs unequal shares.",
      "See that equal shares of the same whole can look different.",
      "Use words half, fourth, quarter.",
      "Intro to thirds with visuals.",
      "Match one half, one third, and one fourth words to shaded shapes.",
      "Extension: compare simple unit fractions with the same whole visually.",
      "Build one whole from equal shares."
    ],
    ccss: [
      coreAlignment(["1.G.A.3"], "G1", "Equal shares.", {
        allowFractionNotation: false
      }),
      coreAlignment(["1.G.A.3"], "G1", "Halves.", {
        allowedFractionWords: ["half", "halves"],
        allowFractionNotation: false
      }),
      coreAlignment(["1.G.A.3"], "G1", "Fourths and quarters.", {
        allowedFractionWords: ["fourth", "fourths", "quarter", "quarters"],
        allowFractionNotation: false
      }),
      coreAlignment(["1.G.A.3"], "G1", "Equal partitioning.", {
        allowFractionNotation: false
      }),
      coreAlignment(["2.G.A.3"], "G2", "Grade 2 nuance.", {
        allowedFractionWords: ["half", "halves", "third", "thirds", "fourth", "fourths", "quarter", "quarters"],
        allowFractionNotation: false
      }),
      coreAlignment(["1.G.A.3"], "G1", "Use words, not just symbols.", {
        allowedFractionWords: ["half", "halves", "fourth", "fourths", "quarter", "quarters"],
        allowFractionNotation: false
      }),
      coreAlignment(["2.G.A.3"], "G2", "Thirds are Grade 2.", {
        allowedFractionWords: ["third", "thirds"],
        allowFractionNotation: false
      }),
      coreAlignment(["2.G.A.3"], "G2", "Treat notation as support; prefer words.", {
        allowedFractionWords: ["half", "third", "fourth", "quarter"],
        allowFractionNotation: true
      }),
      extensionAlignment("Fraction comparison is beyond Grade 2.", {
        allowedFractionWords: ["half", "third", "fourth", "quarter"],
        allowFractionNotation: true
      }),
      coreAlignment(["1.G.A.3", "2.G.A.3"], "G1-G2", "Good K-2 reasoning.", {
        allowedFractionWords: ["half", "halves", "third", "thirds", "fourth", "fourths", "quarter", "quarters"],
        allowFractionNotation: false
      })
    ]
  },
  {
    id: "arrays-odd-even",
    title: "Arrays / Odd-Even / Equal Groups",
    shortTitle: "Arrays & Odd/Even",
    color: "#9cf0ef",
    mascot: "Sock Pair Station",
    description: "Make pairs, see equal groups, build arrays, and connect to equations.",
    activityType: "array-counting",
    concrete: "Pair objects and build equal groups with touchable tokens.",
    pictorial: "Use arrays and repeated-addition visuals to organize counting.",
    abstract: "Write equations for arrays, even numbers, and grouped totals.",
    celebrations: [
      "Pair Patrol",
      "Odd-or-Even Owl",
      "Two-by-Two Tooter",
      "Group Giggler",
      "Repeat-Add Ranger",
      "Array Reader",
      "Five-by-Five Flyer",
      "Equation Echo",
      "Even Steven Stinker",
      "Multiplication Starter"
    ],
    summaries: [
      "Make equal pairs to 10.",
      "Tell odd / even by pairing small sets.",
      "Count by 2s to 20.",
      "See equal groups with pictures.",
      "Use repeated addition for equal groups.",
      "Read small arrays as rows and columns, such as 2 rows of 3.",
      "Use arrays up to 5 rows by 5 columns.",
      "Write equal-addend equations for arrays.",
      "Tell odd / even and write an equation for an even number.",
      "Use arrays as foundations for multiplication."
    ],
    ccss: [
      coreAlignment(["2.OA.C.3"], "G2", "Odd/even foundation.", {
        maxObjects: 10,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.3"], "G2", "Grade 2.", {
        maxObjects: 20,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.3", "2.NBT.A.2"], "G2", "Supports even and odd.", {
        maxNumber: 20,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.4"], "G2", "Equal groups.", {
        maxArrayRows: 5,
        maxArrayColumns: 5,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.4"], "G2", "Grade 2.", {
        maxArrayRows: 5,
        maxArrayColumns: 5,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.4"], "G2", "Pass 2: avoid formal multiplication notation.", {
        maxArrayRows: 5,
        maxArrayColumns: 5,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.4"], "G2", "Official limit: up to 5 rows and 5 columns.", {
        maxArrayRows: 5,
        maxArrayColumns: 5,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.4"], "G2", "Example: 5 + 5 + 5.", {
        maxArrayRows: 5,
        maxArrayColumns: 5,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.3"], "G2", "Even number as two equal addends.", {
        maxObjects: 20,
        avoidFormalMultiplication: true
      }),
      coreAlignment(["2.OA.C.4"], "G2", "Grade 2 foundation; no multiplication facts yet.", {
        maxArrayRows: 5,
        maxArrayColumns: 5,
        avoidFormalMultiplication: true
      })
    ]
  }
];

export const STRANDS: StrandDefinition[] = STRAND_SEEDS.map((seed) => {
  if (
    seed.summaries.length !== 10 ||
    seed.celebrations.length !== 10 ||
    seed.ccss.length !== 10
  ) {
    throw new Error(`Strand ${seed.id} must have exactly 10 summaries, celebrations, and CCSS entries.`);
  }

  return {
    id: seed.id,
    title: seed.title,
    shortTitle: seed.shortTitle,
    color: seed.color,
    mascot: seed.mascot,
    description: seed.description,
    levels: seed.summaries.map((summary, index) => {
      const level = index + 1;
      const alignment = seed.ccss[index];
      if (!alignment) {
        throw new Error(`Missing CCSS alignment for ${seed.id} level ${level}`);
      }

      return {
        id: makeSkillId(seed.id, level),
        strandId: seed.id,
        level,
        title: summary.replace(/\.$/, ""),
        summary,
        activityType: seed.activityType,
        difficultyBand: gradeBandToDifficultyBand(alignment.gradeBand),
        ccssCodes: [...alignment.ccssCodes],
        gradeBand: alignment.gradeBand,
        isCoreK2: alignment.isCoreK2,
        isExtension: alignment.isExtension,
        alignmentNotes: alignment.alignmentNotes,
        constraints: alignment.constraints,
        scaffold: {
          concrete: seed.concrete,
          pictorial: seed.pictorial,
          abstract: seed.abstract
        },
        prompt: summary.replace(/\.$/, ""),
        celebrationTitle: seed.celebrations[index]
      };
    })
  };
});

export const STRAND_ORDER = STRANDS.map((strand) => strand.id);

export const STRAND_MAP = Object.fromEntries(
  STRANDS.map((strand) => [strand.id, strand])
) as Record<StrandId, StrandDefinition>;

export const ACTIVITY_CATALOG = [
  {
    id: "G01",
    type: "count-and-tap",
    title: "Count-and-Tap",
    bestStrands: ["number-recognition", "cardinality"],
    example: "Count dancing poops into the toilet."
  },
  {
    id: "G02",
    type: "drag-to-match",
    title: "Drag-to-Match",
    bestStrands: ["number-recognition", "place-value", "money"],
    example: "Drag toilet rolls to the right number."
  },
  {
    id: "G03",
    type: "compare-two-groups",
    title: "Which Is More?",
    bestStrands: ["comparing"],
    example: "Which fart cloud has more bubbles?"
  },
  {
    id: "G04",
    type: "fill-ten-frame",
    title: "Ten-Frame Fill",
    bestStrands: ["addition-subtraction"],
    example: "Fill the toilet stalls to make 10."
  },
  {
    id: "G05",
    type: "build-a-number",
    title: "Build-a-Number",
    bestStrands: ["place-value"],
    example: "Build 34 with poop nuggets and toilet-roll bundles."
  },
  {
    id: "G06",
    type: "number-line-tap",
    title: "Number Line Jump",
    bestStrands: ["addition-subtraction", "comparing"],
    example: "Fart rocket jumps on a number line."
  },
  {
    id: "G07",
    type: "story-scene",
    title: "Story Scene Choice",
    bestStrands: ["word-problems"],
    example: "A poop monster had 6 corn kernels; 2 rolled away."
  },
  {
    id: "G08",
    type: "clock-choice",
    title: "Clock Choice",
    bestStrands: ["time"],
    example: "Which clock says 3:30 before bath time?"
  },
  {
    id: "G09",
    type: "coin-counting",
    title: "Coin Sort & Total",
    bestStrands: ["money"],
    example: "How much stink-cash is here?"
  },
  {
    id: "G10",
    type: "graph-reading",
    title: "Graph Read",
    bestStrands: ["data-graphs"],
    example: "Which snack made the biggest stink bar?"
  },
  {
    id: "G11",
    type: "shape-sort",
    title: "Shape Sort",
    bestStrands: ["geometry"],
    example: "Sort flat vs solid potty blocks."
  },
  {
    id: "G12",
    type: "choose-the-answer",
    title: "Equal Share Picker",
    bestStrands: ["equal-shares", "measurement"],
    example: "Pick the pizza cut into fair poop-slices."
  },
  {
    id: "G13",
    type: "array-counting",
    title: "Array Builder",
    bestStrands: ["arrays-odd-even"],
    example: "Make 4 rows of 3 toilet rolls."
  }
] as const;
