import type {
  ActivityType,
  AvatarDefinition,
  RewardDefinition,
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
    imageSrc: "/avatars/farting-emoji.svg"
  },
  {
    id: "pooping-emoji",
    label: "Toilet Plop",
    description: "A squishy emoji sitting on the toilet and trying very hard.",
    accent: "#7c4d23",
    glow: "rgba(255, 194, 102, 0.45)",
    imageSrc: "/avatars/pooping-emoji.svg"
  },
  {
    id: "toilet-roll-hero",
    label: "Nose Pinch Roll",
    description: "A toilet roll pinching its nose at the stinkiest math jokes.",
    accent: "#7fd4ff",
    glow: "rgba(115, 204, 255, 0.48)",
    imageSrc: "/avatars/toilet-roll-hero.svg"
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
}

const difficultyBandFromLevel = (level: number) => {
  if (level <= 2) return "Kindergarten foundations";
  if (level <= 4) return "Late Kindergarten to Grade 1 bridge";
  if (level <= 7) return "Grade 1 growth";
  if (level <= 9) return "Grade 2 readiness";
  return "Beyond Grade 2 starter";
};

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
      "Count scattered sets to 20.",
      "Understand last number said = total.",
      "Count mixed layouts without losing track.",
      "Count on to find totals within 20.",
      "Count objects in equal groups and small arrays.",
      "Count tens and ones blocks to 100.",
      "Count hundreds, tens, and ones to 1000."
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
      "Use number lines and measurement visuals to compare.",
      "Compare three-digit numbers.",
      "Explain a comparison using place-value language."
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
      "Make and break 10 on ten-frames.",
      "Add / subtract within 20 with counting on/back.",
      "Solve missing-part and missing-addend within 20.",
      "Add two-digit + one-digit or + tens within 100.",
      "Subtract multiples of 10; use drawings within 100.",
      "Fluently add and subtract within 100.",
      "Add / subtract within 1000 with drawings and place-value methods."
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
      "Read two-digit numbers as tens and ones.",
      "Compare two-digit numbers by place value.",
      "Add / subtract 10 mentally within 100.",
      "Build 3-digit numbers with hundreds, tens, ones.",
      "Read, write, and compare numbers to 1000.",
      "Use expanded form and mental +100 / -100."
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
      "Solve one-step stories within 20.",
      "Find the unknown in any position within 20.",
      "Use drawings / equations for put-together / compare stories.",
      "Solve one-step addition / subtraction within 100.",
      "Solve one- and two-step mixed stories within 100.",
      "Solve length, time, and money story problems.",
      "Explain which operation fits a K–2 story problem."
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
      "Sort by measurable attribute.",
      "Measure with nonstandard units.",
      "Use equal-size units with no gaps / overlaps.",
      "Measure lengths with a ruler (whole units).",
      "Compare two measured lengths.",
      "Add / subtract lengths in word problems.",
      "Estimate then measure with inches / centimeters.",
      "Choose the right tool and unit for the job."
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
      "Create a bar graph from small data.",
      "Compare several categories and totals.",
      "Use graph information in short word problems."
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
      "Name rectangle, hexagon, and common 3D solids.",
      "Recognize shapes in any size / orientation.",
      "Describe sides, corners, flat, solid.",
      "Build and draw shapes.",
      "Compose simple shapes to make new shapes.",
      "Describe defining vs non-defining attributes.",
      "Sort shapes and explain why they belong.",
      "Partition rectangles into rows / columns; count squares.",
      "Combine and decompose shapes to solve puzzles."
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
      "Match 1/2, 1/3, 1/4 to shaded shapes.",
      "Compare simple unit fractions with the same whole visually.",
      "Build one whole from equal shares."
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
      "Read small arrays such as 2x3 or 3x4.",
      "Use arrays up to 5x5.",
      "Write equal-addend equations for arrays.",
      "Tell odd / even and write an equation for an even number.",
      "Use arrays as foundations for multiplication."
    ]
  }
];

export const STRANDS: StrandDefinition[] = STRAND_SEEDS.map((seed) => ({
  id: seed.id,
  title: seed.title,
  shortTitle: seed.shortTitle,
  color: seed.color,
  mascot: seed.mascot,
  description: seed.description,
  levels: seed.summaries.map((summary, index) => {
    const level = index + 1;
    return {
      id: makeSkillId(seed.id, level),
      strandId: seed.id,
      level,
      title: summary.replace(/\.$/, ""),
      summary,
      activityType: seed.activityType,
      difficultyBand: difficultyBandFromLevel(level),
      scaffold: {
        concrete: seed.concrete,
        pictorial: seed.pictorial,
        abstract: seed.abstract
      },
      prompt: summary.replace(/\.$/, ""),
      celebrationTitle: seed.celebrations[index]
    };
  })
}));

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
