import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AVATARS, PROFILE_PRESETS, REWARDS, STRANDS, STRAND_MAP } from "../data/catalog";
import { DEFAULT_SESSION_LENGTH, MASTERY_LABELS } from "../data/rules";
import {
  advanceAfterAnswer,
  applyPlacementResults,
  buildPlacementProgress,
  finalizeSession,
  getWindowStats,
  planDailySession
} from "../engine/progression";
import { getUpcomingRewards, getStrandCompletion } from "../engine/rewards";
import {
  buildPedagogicalFeedback,
  getLearningScriptSpeech,
  getSkillLearningScript
} from "../engine/learningLoop";
import { useFartAudio } from "../hooks/useFartAudio";
import { useSpeech } from "../hooks/useSpeech";
import {
  computeReadinessLabel,
  loadState,
  normalizeNameInput,
  resetSkillProgress,
  resetStrandProgress,
  resolveProfileId,
  saveState
} from "../lib/storage";
import type {
  ActiveSession,
  AnswerChoice,
  AvatarDefinition,
  AvatarId,
  BuildNumberData,
  ChildProfile,
  CoinKind,
  DragTarget,
  ParentGateChallenge,
  PersistedState,
  PlacementProgress,
  ProfileId,
  QuestionDefinition,
  SessionTask,
  ShapeKind,
  SkillLearningScript,
  StrandDefinition,
  StrandId
} from "../types";

type Screen = "home" | "dashboard" | "placement" | "practice" | "parent";

interface ReviewState {
  scope: "placement" | "practice";
  correct: boolean;
  feedbackText: string;
  feedbackSpeech: string;
  explanationText: string;
  explanationSpeech: string;
  noteText?: string;
  nextActionText?: string;
  rescueText?: string;
  detailText?: string;
  rewardTitles?: string[];
  nextScreen: Screen;
  nextPlacement?: PlacementProgress | null;
  nextProfile?: ChildProfile;
  nextSession?: ActiveSession | null;
  bannerMessage: string;
}

interface ParentDetailsState {
  profileId: ProfileId;
  strandId: StrandId;
}

interface TaskAttemptState {
  attemptsUsed: number;
}

interface ThemeVisual {
  key: string;
  label: string;
  src: string;
  aliases: string[];
}

const baseUrl = import.meta.env.BASE_URL ?? "/";
const APP_LOGO_SRC = "/logo.png";
const avatarMap = Object.fromEntries(
  AVATARS.map((avatar) => [avatar.id, avatar])
) as Partial<Record<AvatarId, AvatarDefinition>>;

const THEME_VISUALS: ThemeVisual[] = [
  { key: "fart", label: "Fart", src: "/visuals/Fart.png", aliases: ["fart", "toot", "puff"] },
  { key: "poop", label: "Poo", src: "/visuals/poo.png", aliases: ["poop", "poopy", "poo", "caca"] },
  { key: "pee", label: "Pee", src: "/visuals/pee.png", aliases: ["pee", "pipi"] },
  { key: "diaper", label: "Diaper", src: "/visuals/diaper.png", aliases: ["diaper", "diapers", "couche"] },
  { key: "toilet", label: "Toilet", src: "/visuals/toilet.png", aliases: ["toilet", "potty"] },
  { key: "stinky", label: "Stinky", src: "/visuals/stinky.png", aliases: ["stinky", "stink"] },
  { key: "butt", label: "Butt", src: "/visuals/butt.png", aliases: ["butt"] },
  { key: "foot", label: "Foot", src: "/visuals/foot.png", aliases: ["foot", "feet"] },
  { key: "panties", label: "Panties", src: "/visuals/panties.png", aliases: ["panties"] }
];

const TASK_VISUAL_SIZE = 36;

const makeParentGateChallenge = (): ParentGateChallenge => {
  const left = 7 + Math.floor(Math.random() * 5);
  const right = 4 + Math.floor(Math.random() * 6);
  return {
    left,
    right,
    answer: left + right
  };
};

const toAssetUrl = (path: string) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path.replace(/^\//, "")}`;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const getOverallProgress = (profile: ChildProfile) => {
  const { mastered, total } = getOverallMasteryCounts(profile);
  return total === 0 ? 0 : mastered / total;
};

const getOverallMasteryCounts = (profile: ChildProfile) => {
  const total = STRANDS.reduce((sum, strand) => sum + strand.levels.length, 0);
  const mastered = Object.values(profile.skillProgress).filter(
    (skill) => skill.status === "mastered" || skill.status === "review-needed"
  ).length;

  return {
    mastered,
    total
  };
};

const getStrandSnapshot = (profile: ChildProfile, strand: StrandDefinition) => {
  const strandProgress = profile.strandProgress[strand.id];
  const currentSkill = strand.levels[strandProgress.currentLevel - 1];
  const currentProgress = profile.skillProgress[currentSkill.id];
  const accuracy =
    currentProgress.scoredAttempts > 0
      ? currentProgress.firstTryCorrectCount / currentProgress.scoredAttempts
      : 0;

  return {
    strand,
    strandProgress,
    currentSkill,
    currentProgress,
    accuracy,
    readiness: computeReadinessLabel(strandProgress.highestUnlockedLevel, strand.id)
  };
};

const getStrandSkillBuckets = (profile: ChildProfile, strand: StrandDefinition) => {
  const mastered = strand.levels.filter((skill) => {
    const status = profile.skillProgress[skill.id].status;
    return status === "mastered" || status === "review-needed";
  });
  const remaining = strand.levels.filter((skill) => {
    const status = profile.skillProgress[skill.id].status;
    return status !== "mastered" && status !== "review-needed";
  });

  return {
    mastered,
    remaining
  };
};

const resolveAvatar = (avatarId: AvatarId) =>
  avatarMap[avatarId] ?? AVATARS[0];

const getChoiceSpeech = (question: QuestionDefinition) => {
  if (question.choices.length === 0) return "";
  const parts = question.choices.map((choice, index) => {
    const badge = String.fromCharCode(65 + index);
    return `${badge}: ${choice.speechLabel ?? choice.label}`;
  });
  return `Answer choices. ${parts.join(". ")}.`;
};

const getInstructionDisplay = (question: QuestionDefinition) => {
  if (question.presentation.instructionVisibility === "visible") {
    return {
      title: question.prompt,
      helper: "",
      cue: question.presentation.promptCue
    };
  }

  if (question.presentation.instructionVisibility === "minimal") {
    return {
      title: "Listen, look carefully, then choose.",
      helper: "",
      cue: question.presentation.promptCue
    };
  }

  return {
    title: "Tap the speaker, then choose the best answer.",
    helper: "",
    cue: question.presentation.promptCue
  };
};

const buildReviewDetails = ({
  question,
  correct,
  firstTryCorrect,
  suspiciousFast,
  hintUsed
}: {
  question: QuestionDefinition;
  correct: boolean;
  firstTryCorrect: boolean;
  suspiciousFast: boolean;
  hintUsed: boolean;
}) => {
  const detailParts = [
    `Prompt: ${question.prompt}`,
    `Helpful clue: ${question.hint}`,
    `Why it works: ${question.explanation.text}`,
    correct
      ? firstTryCorrect
        ? "This answer counted as a clean first-try success."
        : "This answer was fixed after a mistake, so it did not count as a first-try success."
      : `Suggested answer: ${question.explanation.correctAnswerLabel}.`
  ];

  if (hintUsed) {
    detailParts.push("A hint was used on this item, so it cannot count as mastery evidence.");
  }

  if (suspiciousFast) {
    detailParts.push("It was answered too quickly to count as reliable mastery evidence.");
  }

  return detailParts.join("\n\n");
};

const getTaskSkill = (task: Pick<SessionTask, "strandId" | "level">) =>
  STRAND_MAP[task.strandId].levels[Math.max(0, task.level - 1)];

const getWorkedExampleText = (script: SkillLearningScript) =>
  [
    script.workedExample.prompt,
    script.workedExample.modelDescription,
    ...script.workedExample.solutionSteps.map((step, index) => `${index + 1}. ${step}`),
    script.workedExample.answerStatement
  ].join("\n");

const getLessonStepsText = (script: SkillLearningScript) =>
  script.lessonSteps.map((step, index) => `${index + 1}. ${step.text}`).join("\n");

const renderAudioBadge = (index: number) => String.fromCharCode(65 + index);

const MiniBadge = ({
  text,
  tone = "mint"
}: {
  text: string;
  tone?: "mint" | "peach" | "blue";
}) => <span className={`mini-badge mini-badge-${tone}`}>{text}</span>;

const SpeakerButton = ({
  label,
  onSpeak,
  small = false,
  disabled = false
}: {
  label: string;
  onSpeak: () => void;
  small?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    className={`speaker-button ${small ? "speaker-button-small" : ""}`}
    onClick={onSpeak}
    aria-label={label}
    title={label}
    disabled={disabled}
  >
    🔊
  </button>
);

const InfoPanel = ({
  title,
  text,
  ttsLabel,
  onSpeak,
  ttsEnabled
}: {
  title: string;
  text: string;
  ttsLabel?: string;
  onSpeak?: () => void;
  ttsEnabled: boolean;
}) => (
  <div className="hint-banner">
    <div className="info-panel-head">
      <strong>{title}</strong>
      {onSpeak ? (
        <SpeakerButton label={ttsLabel ?? `Read ${title}`} onSpeak={onSpeak} small disabled={!ttsEnabled} />
      ) : null}
    </div>
    <span>{text}</span>
  </div>
);

const resolveThemeVisual = (key: string) =>
  THEME_VISUALS.find((visual) => visual.key === key || visual.aliases.includes(key.toLowerCase()));

const ThemeVisualToken = ({
  visualKey,
  label,
  size = TASK_VISUAL_SIZE
}: {
  visualKey: string;
  label: string;
  size?: number;
}) => {
  const visual = resolveThemeVisual(visualKey);

  if (!visual) {
    return (
      <span
        className="theme-visual-fallback"
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-label={label}
      />
    );
  }

  return (
    <img
      src={toAssetUrl(visual.src)}
      alt={label}
      className="theme-visual-image"
      width={size}
      height={size}
      draggable={false}
    />
  );
};

const PromptCueVisual = ({ cue }: { cue: NonNullable<QuestionDefinition["presentation"]["promptCue"]> }) => {
  if (cue.count <= 0) {
    return null;
  }

  return (
    <div className="prompt-cue prompt-cue-visual">
      {Array.from({ length: cue.count }, (_, index) => (
        <ThemeVisualToken
          key={`${cue.visualKey}-${index}`}
          visualKey={cue.visualKey}
          label={cue.visualKey}
        />
      ))}
    </div>
  );
};

const SectionWithAudio = ({
  title,
  onSpeak,
  ttsEnabled
}: {
  title: string;
  onSpeak: () => void;
  ttsEnabled: boolean;
}) => (
  <div className="section-audio-row">
    <strong>{title}</strong>
    <SpeakerButton label={`Read ${title}`} onSpeak={onSpeak} small disabled={!ttsEnabled} />
  </div>
);

const AvatarArt = ({
  avatarId,
  label,
  large = false
}: {
  avatarId: AvatarId;
  label: string;
  large?: boolean;
}) => {
  const avatar = resolveAvatar(avatarId);
  const size = large ? 112 : 70;

  return (
    <div
      className={`avatar-frame ${large ? "avatar-frame-large" : ""}`}
      style={
        {
          "--avatar-accent": avatar.accent,
          "--avatar-glow": avatar.glow,
          width: `${size}px`,
          height: `${size}px`
        } as CSSProperties
      }
    >
      <img
        src={toAssetUrl(avatar.imageSrc)}
        alt={label}
        className="avatar-image"
        width={size}
        height={size}
      />
    </div>
  );
};

const ProgressRing = ({ value, label }: { value: number; label: string }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * value;

  return (
    <div className="progress-ring">
      <svg viewBox="0 0 140 140" width="140" height="140">
        <circle cx="70" cy="70" r={radius} className="progress-ring-track" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          className="progress-ring-value"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="progress-ring-text">
        <strong>{formatPercent(value)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
};

const AnalogClock = ({ hour, minute }: { hour: number; minute: number }) => {
  const minuteAngle = (minute / 60) * 360;
  const hourAngle = ((hour % 12) / 12) * 360 + minuteAngle / 12;

  return (
    <svg viewBox="0 0 100 100" className="clock-face" role="img" aria-label={`${hour}:${minute}`}>
      <circle cx="50" cy="50" r="42" fill="#fff8d8" stroke="#374250" strokeWidth="4" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        const x1 = 50 + Math.cos(angle - Math.PI / 2) * 30;
        const y1 = 50 + Math.sin(angle - Math.PI / 2) * 30;
        const x2 = 50 + Math.cos(angle - Math.PI / 2) * 36;
        const y2 = 50 + Math.sin(angle - Math.PI / 2) * 36;
        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374250" strokeWidth="3" />;
      })}
      <line
        x1="50"
        y1="50"
        x2={50 + Math.cos((hourAngle - 90) * (Math.PI / 180)) * 18}
        y2={50 + Math.sin((hourAngle - 90) * (Math.PI / 180)) * 18}
        stroke="#2a7fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2={50 + Math.cos((minuteAngle - 90) * (Math.PI / 180)) * 28}
        y2={50 + Math.sin((minuteAngle - 90) * (Math.PI / 180)) * 28}
        stroke="#ff7b6e"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="4" fill="#374250" />
    </svg>
  );
};

const ShapePreview = ({ shape }: { shape: ShapeKind }) => {
  if (shape === "cube") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <polygon points="30,30 60,20 82,35 52,45" fill="#8fd1ff" />
        <polygon points="30,30 30,65 52,80 52,45" fill="#7ec5f3" />
        <polygon points="52,45 82,35 82,70 52,80" fill="#5ca7d9" />
      </svg>
    );
  }

  if (shape === "sphere") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <defs>
          <radialGradient id="sphere-fill" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#8fd1ff" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="30" fill="url(#sphere-fill)" stroke="#296e93" strokeWidth="4" />
      </svg>
    );
  }

  if (shape === "cylinder") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <ellipse cx="50" cy="28" rx="26" ry="12" fill="#a0e3ff" stroke="#296e93" strokeWidth="4" />
        <rect x="24" y="28" width="52" height="40" fill="#7dc6ff" stroke="#296e93" strokeWidth="4" />
        <ellipse cx="50" cy="68" rx="26" ry="12" fill="#72c0f5" stroke="#296e93" strokeWidth="4" />
      </svg>
    );
  }

  if (shape === "cone") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <polygon points="50,18 24,72 76,72" fill="#ffbc67" stroke="#a55f17" strokeWidth="4" />
        <ellipse cx="50" cy="72" rx="26" ry="10" fill="#ffd8a1" stroke="#a55f17" strokeWidth="4" />
      </svg>
    );
  }

  if (shape === "circle") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <circle cx="50" cy="50" r="28" fill="#8fd1ff" stroke="#296e93" strokeWidth="5" />
      </svg>
    );
  }

  if (shape === "square") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <rect x="24" y="24" width="52" height="52" fill="#ffd06c" stroke="#a55f17" strokeWidth="5" />
      </svg>
    );
  }

  if (shape === "triangle") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <polygon points="50,20 20,76 80,76" fill="#7ed89f" stroke="#2e8a58" strokeWidth="5" />
      </svg>
    );
  }

  if (shape === "rectangle") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <rect x="16" y="30" width="68" height="40" fill="#ff9db2" stroke="#a4425a" strokeWidth="5" />
      </svg>
    );
  }

  if (shape === "quadrilateral") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <polygon points="24,28 76,20 84,68 32,78" fill="#ffa9d7" stroke="#9e3a78" strokeWidth="5" />
      </svg>
    );
  }

  if (shape === "pentagon") {
    return (
      <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
        <polygon points="50,16 80,38 68,78 32,78 20,38" fill="#ffe07a" stroke="#9a7419" strokeWidth="5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className="shape-svg" aria-hidden="true">
      <polygon
        points="50,18 76,34 76,66 50,82 24,66 24,34"
        fill="#d5b4ff"
        stroke="#6b4da0"
        strokeWidth="5"
      />
    </svg>
  );
};

const coinTheme: Record<CoinKind, { fill: string; stroke: string; size: number; cents: string }> = {
  penny: { fill: "#cb7a42", stroke: "#844824", size: 74, cents: "1¢" },
  nickel: { fill: "#d9dadd", stroke: "#7a7f89", size: 78, cents: "5¢" },
  dime: { fill: "#eef1f7", stroke: "#8f96a5", size: 66, cents: "10¢" },
  quarter: { fill: "#e6ecf8", stroke: "#7d889f", size: 82, cents: "25¢" },
  dollar: { fill: "#e6d07a", stroke: "#938041", size: 88, cents: "$1" }
};

const CoinPreview = ({ kind }: { kind: CoinKind }) => {
  const theme = coinTheme[kind];
  return (
    <div
      className="coin-token"
      style={
        {
          "--coin-fill": theme.fill,
          "--coin-stroke": theme.stroke,
          width: `${theme.size}px`,
          height: `${theme.size}px`
        } as CSSProperties
      }
    >
      <span>{theme.cents}</span>
    </div>
  );
};

const FractionPreview = ({
  partition
}: {
  partition: NonNullable<AnswerChoice["partition"]>;
}) => {
  const unequalWidths =
    partition.equal || partition.parts !== 2
      ? Array.from({ length: partition.parts }, () => `${100 / partition.parts}%`)
      : ["35%", "65%"];

  return (
    <div className={`fraction-preview fraction-${partition.shape}`}>
      {unequalWidths.map((width, index) => (
        <span
          key={`${partition.shape}-${index}`}
          className={index < (partition.highlightedParts ?? 0) ? "fraction-part-highlight" : ""}
          style={{ width }}
        />
      ))}
    </div>
  );
};

const QuestionSupportVisual = ({ question }: { question: QuestionDefinition }) => {
  if (question.graph) {
    if (question.graph.graphKind === "line-plot") {
      return (
        <div className="graph-card line-plot-card">
          {question.graph.bars.map((bar) => (
            <div key={bar.label} className="line-plot-row">
              <span>{bar.label}</span>
              <div className="line-plot-dots" aria-label={`${bar.value} measurements`}>
                {Array.from({ length: bar.value }, (_, index) => (
                  <i key={`${bar.label}-${index}`} style={{ background: bar.color }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="graph-card">
        {question.graph.bars.map((bar) => (
          <div key={bar.label} className="graph-row">
            <span>{bar.label}</span>
            <div className="graph-bar-track">
              <div className="graph-bar-fill" style={{ width: `${bar.value * 18}px`, background: bar.color }} />
            </div>
            <strong>{bar.value}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (question.story) {
    return (
      <div className="story-card">
        <strong>{question.story.scene}</strong>
        <span>{question.story.equation}</span>
      </div>
    );
  }

  if (question.coins) {
    return (
      <div className="coin-strip card-surface">
        {question.coins.map((coin) => (
          <div key={coin.id} className="coin-strip-item">
            <CoinPreview kind={coin.kind} />
          </div>
        ))}
      </div>
    );
  }

  if (question.arrayData) {
    return (
      <div
        className="array-grid"
        style={{ gridTemplateColumns: `repeat(${question.arrayData.columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: question.arrayData.target }, (_, index) => (
          <span key={index} className="array-token">
            <ThemeVisualToken visualKey="diaper" label="diaper" />
          </span>
        ))}
      </div>
    );
  }

  if (question.groups) {
    return (
      <div className={`group-visuals ${question.presentation.layout === "left-right" ? "group-visuals-left-right" : ""}`}>
        {question.groups.map((group) => (
          <div key={group.id} className="group-card">
            <strong>{group.label}</strong>
            <div className="token-cloud">
              {Array.from({ length: Math.min(group.count, 24) }, (_, index) => (
                <ThemeVisualToken
                  key={`${group.id}-${index}`}
                  visualKey={group.token}
                  label={group.label ?? group.token}
                />
              ))}
            </div>
            <em>{group.count}</em>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const ChoiceCardBody = ({
  question,
  choice,
  index
}: {
  question: QuestionDefinition;
  choice: AnswerChoice;
  index: number;
}) => {
  const audioOnly = question.presentation.choiceVisibility === "audio-only";

  if (audioOnly) {
    return (
      <div className="audio-choice-body">
        <strong>{renderAudioBadge(index)}</strong>
      </div>
    );
  }

  if (question.type === "clock-choice" && question.clockChoices) {
    const clock = question.clockChoices.find((item) => item.label === choice.value);
    if (clock) {
      return (
        <div className="clock-card">
          <AnalogClock hour={clock.targetHour} minute={clock.targetMinute} />
        </div>
      );
    }
  }

  if (choice.renderKind === "shape" && choice.shape) {
    return (
      <div className="choice-visual-stack">
        <ShapePreview shape={choice.shape} />
        <span>{choice.label}</span>
      </div>
    );
  }

  if (choice.renderKind === "coin" && choice.coin) {
    return (
      <div className="choice-visual-stack">
        <CoinPreview kind={choice.coin} />
      </div>
    );
  }

  if (choice.renderKind === "fraction" && choice.partition) {
    return (
      <div className="choice-visual-stack">
        <FractionPreview partition={choice.partition} />
        <span>{choice.label}</span>
      </div>
    );
  }

  if (choice.renderKind === "position") {
    return (
      <div className="choice-visual-stack">
        <span className="position-arrow">{choice.label === "Left" ? "⬅︎" : choice.label === "Right" ? "➡︎" : "↔︎"}</span>
        <span>{choice.label}</span>
      </div>
    );
  }

  if (choice.renderKind === "number") {
    return <strong className="choice-number">{choice.label}</strong>;
  }

  return <strong className="choice-label">{choice.label}</strong>;
};

const ChoiceGridActivity = ({
  question,
  onSubmit,
  disabled
}: {
  question: QuestionDefinition;
  onSubmit: (choiceId: string) => void;
  disabled: boolean;
}) => {
  const layoutClass =
    question.presentation.layout === "left-right"
      ? "choice-grid-left-right"
      : question.presentation.layout === "top-bottom"
        ? "choice-grid-top-bottom"
        : question.presentation.layout === "clock-grid" || question.type === "clock-choice"
          ? "choice-grid-clock"
          : "choice-grid-standard";

  return (
    <div className={`choice-grid ${layoutClass}`}>
      {question.choices.map((choice, index) => (
        <button
          key={choice.id}
          type="button"
          className="choice-button"
          onClick={() => onSubmit(choice.id)}
          disabled={disabled}
        >
          <ChoiceCardBody question={question} choice={choice} index={index} />
        </button>
      ))}
    </div>
  );
};

const CountTapActivity = ({
  question,
  onSubmit,
  disabled
}: {
  question: QuestionDefinition;
  onSubmit: (choiceId: string) => void;
  disabled: boolean;
}) => {
  const total = question.countTap?.total ?? 0;
  const [tapped, setTapped] = useState<boolean[]>(() => Array.from({ length: total }, () => false));
  const selectedCount = tapped.filter(Boolean).length;

  useEffect(() => {
    setTapped(Array.from({ length: total }, () => false));
  }, [question.id, total]);

  return (
    <div className="interactive-stack">
      <div className="count-tap-grid">
        {tapped.map((selected, index) => (
          <button
            key={`${question.id}-${index}`}
            type="button"
            className={`count-tap-token ${selected ? "count-tap-token-selected" : ""}`}
            onClick={() =>
              setTapped((current) => current.map((value, currentIndex) => (currentIndex === index ? !value : value)))
            }
            disabled={disabled}
          >
            <ThemeVisualToken visualKey={question.countTap?.token ?? "poop"} label="count token" />
          </button>
        ))}
      </div>

      <div className="interactive-footer">
        <strong>Counted: {selectedCount}</strong>
        <div className="row-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setTapped(Array.from({ length: total }, () => false))}
            disabled={disabled}
          >
            Woops mistake
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onSubmit(`count-${selectedCount}`)}
            disabled={disabled}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const FillTenFrameActivity = ({
  question,
  onSubmit,
  disabled
}: {
  question: QuestionDefinition;
  onSubmit: (choiceId: string) => void;
  disabled: boolean;
}) => {
  const baseFilled = question.tenFrame?.filled ?? 0;
  const [extraFilled, setExtraFilled] = useState<boolean[]>(() => Array.from({ length: 10 - baseFilled }, () => false));

  useEffect(() => {
    setExtraFilled(Array.from({ length: 10 - baseFilled }, () => false));
  }, [question.id, baseFilled]);

  const totalFilled = baseFilled + extraFilled.filter(Boolean).length;

  return (
    <div className="interactive-stack">
      <div className="ten-frame">
        {Array.from({ length: 10 }, (_, index) => {
          const locked = index < baseFilled;
          const selectableIndex = index - baseFilled;
          const selected = locked || extraFilled[selectableIndex];
          return (
            <button
              key={`${question.id}-slot-${index}`}
              type="button"
              className={`ten-slot ${selected ? "filled" : ""} ${locked ? "ten-slot-locked" : ""}`}
              disabled={disabled || locked}
              onClick={() =>
                setExtraFilled((current) =>
                  current.map((value, currentIndex) =>
                    currentIndex === selectableIndex ? !value : value
                  )
                )
              }
            >
              {selected ? <ThemeVisualToken visualKey="toilet" label="toilet" /> : null}
            </button>
          );
        })}
      </div>

      <div className="interactive-footer">
        <strong>Full stalls: {totalFilled}</strong>
        <div className="row-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setExtraFilled(Array.from({ length: 10 - baseFilled }, () => false))}
            disabled={disabled}
          >
            Woops mistake
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onSubmit(`fill-${totalFilled}`)}
            disabled={disabled}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const NumberStepper = ({
  label,
  value,
  max,
  onChange,
  disabled
}: {
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
  disabled: boolean;
}) => (
  <div className="stepper-card">
    <strong>{label}</strong>
    <div className="stepper-controls">
      <button type="button" className="secondary-button stepper-button" onClick={() => onChange(Math.max(0, value - 1))} disabled={disabled}>
        −
      </button>
      <span>{value}</span>
      <button type="button" className="secondary-button stepper-button" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled}>
        +
      </button>
    </div>
  </div>
);

const BuildNumberActivity = ({
  question,
  onSubmit,
  disabled
}: {
  question: QuestionDefinition;
  onSubmit: (choiceId: string) => void;
  disabled: boolean;
}) => {
  const target = question.buildNumber as BuildNumberData | undefined;
  const [hundreds, setHundreds] = useState(0);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);

  useEffect(() => {
    setHundreds(0);
    setTens(0);
    setOnes(0);
  }, [question.id]);

  const total = hundreds * 100 + tens * 10 + ones;

  return (
    <div className="interactive-stack">
      <div className="build-target-banner">
        <strong>Target</strong>
        <span>{target?.target ?? 0}</span>
      </div>
      <div className="build-number-grid">
        {target && target.hundreds > 0 ? (
          <NumberStepper label="Hundreds" value={hundreds} max={9} onChange={setHundreds} disabled={disabled} />
        ) : null}
        <NumberStepper label="Tens" value={tens} max={9} onChange={setTens} disabled={disabled} />
        <NumberStepper label="Ones" value={ones} max={9} onChange={setOnes} disabled={disabled} />
      </div>

      <div className="interactive-footer">
        <strong>You built: {total}</strong>
        <div className="row-actions">
          <button type="button" className="secondary-button" onClick={() => {
            setHundreds(0);
            setTens(0);
            setOnes(0);
          }} disabled={disabled}>
            Woops mistake
          </button>
          <button type="button" className="primary-button" onClick={() => onSubmit(`choice-${total}`)} disabled={disabled}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const NumberLineActivity = ({
  question,
  onSubmit,
  disabled
}: {
  question: QuestionDefinition;
  onSubmit: (choiceId: string) => void;
  disabled: boolean;
}) => (
  <div className="interactive-stack">
    <div className="number-line-card">
      <div className="number-line-track">
        {question.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="number-line-stop"
            onClick={() => onSubmit(choice.id)}
            disabled={disabled}
          >
            <span />
            <em>{choice.label}</em>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const DragToken = ({
  question,
  choice,
  index
}: {
  question: QuestionDefinition;
  choice: AnswerChoice;
  index: number;
}) => (
  <div className="drag-token-body">
    <ChoiceCardBody question={question} choice={choice} index={index} />
  </div>
);

const DragActivity = ({
  question,
  onSubmit,
  disabled
}: {
  question: QuestionDefinition;
  onSubmit: (choiceId: string) => void;
  disabled: boolean;
}) => {
  const drag = question.drag;
  const [placedChoiceId, setPlacedChoiceId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [draggingChoiceId, setDraggingChoiceId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setPlacedChoiceId(null);
    setSelectedZoneId(null);
    setDraggingChoiceId(null);
    setDragPoint(null);
  }, [question.id]);

  useEffect(() => {
    if (!draggingChoiceId) return undefined;

    const handleMove = (event: PointerEvent) => {
      setDragPoint({ x: event.clientX, y: event.clientY });
    };

    const handleUp = (event: PointerEvent) => {
      let droppedOn: DragTarget | undefined;
      for (const target of drag?.targets ?? []) {
        const element = zoneRefs.current[target.id];
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          droppedOn = target;
          break;
        }
      }

      if (droppedOn) {
        if (drag?.mode === "choice-to-target") {
          setPlacedChoiceId(draggingChoiceId);
        } else {
          setSelectedZoneId(droppedOn.id);
        }
      }

      setDraggingChoiceId(null);
      setDragPoint(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, draggingChoiceId]);

  if (!drag) {
    return <ChoiceGridActivity question={question} onSubmit={onSubmit} disabled={disabled} />;
  }

  const draggableChoices =
    drag.mode === "choice-to-target"
      ? question.choices.filter((choice) => choice.id !== placedChoiceId)
      : drag.promptItem
        ? [drag.promptItem]
        : [];

  const placedChoice =
    drag.mode === "choice-to-target"
      ? question.choices.find((choice) => choice.id === placedChoiceId)
      : drag.promptItem;

  return (
    <div className="interactive-stack">
      <div className="drag-layout">
        <div className="drag-bank">
          {draggableChoices.map((choice, index) => (
            <button
              key={choice.id}
              type="button"
              className={`drag-token ${draggingChoiceId === choice.id ? "drag-token-hidden" : ""}`}
              disabled={disabled}
              onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                if (disabled) return;
                event.preventDefault();
                setDraggingChoiceId(choice.id);
                setDragPoint({ x: event.clientX, y: event.clientY });
              }}
            >
              <DragToken question={question} choice={choice} index={index} />
            </button>
          ))}
        </div>

        <div
          className={`drag-targets ${question.presentation.layout === "left-right" ? "drag-targets-left-right" : ""}`}
        >
          {drag.targets.map((target) => {
            const isSelected =
              drag.mode === "choice-to-target"
                ? Boolean(placedChoice)
                : selectedZoneId === target.id;
            return (
              <div
                key={target.id}
                ref={(element) => {
                  zoneRefs.current[target.id] = element;
                }}
                className={`drag-target ${isSelected ? "drag-target-filled" : ""}`}
              >
                <strong>{target.label}</strong>
                {drag.mode === "choice-to-target" && placedChoice ? (
                  <DragToken question={question} choice={placedChoice} index={0} />
                ) : null}
                {drag.mode === "prompt-to-zones" && selectedZoneId === target.id && drag.promptItem ? (
                  <DragToken question={question} choice={drag.promptItem} index={0} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="interactive-footer">
        <div className="row-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setPlacedChoiceId(null);
              setSelectedZoneId(null);
            }}
            disabled={disabled}
          >
            Woops mistake
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onSubmit(
                drag.mode === "choice-to-target"
                  ? placedChoiceId ?? ""
                  : selectedZoneId ?? ""
              )
            }
            disabled={disabled || (drag.mode === "choice-to-target" ? !placedChoiceId : !selectedZoneId)}
          >
            Check answer
          </button>
        </div>
      </div>

      {draggingChoiceId && dragPoint ? (
        <div
          className="drag-preview"
          style={{ left: `${dragPoint.x}px`, top: `${dragPoint.y}px` }}
        >
          <DragToken
            question={question}
            choice={
              question.choices.find((choice) => choice.id === draggingChoiceId) ??
              drag.promptItem ??
              question.choices[0]
            }
            index={0}
          />
        </div>
      ) : null}
    </div>
  );
};

const TaskInteraction = ({
  question,
  onSubmit,
  disabled
}: {
  question: QuestionDefinition;
  onSubmit: (choiceId: string) => void;
  disabled: boolean;
}) => {
  if (question.type === "count-and-tap" && question.countTap) {
    return <CountTapActivity question={question} onSubmit={onSubmit} disabled={disabled} />;
  }

  if (question.type === "fill-ten-frame" && question.tenFrame) {
    return <FillTenFrameActivity question={question} onSubmit={onSubmit} disabled={disabled} />;
  }

  if (question.type === "build-a-number" && question.buildNumber) {
    return <BuildNumberActivity question={question} onSubmit={onSubmit} disabled={disabled} />;
  }

  if (question.type === "number-line-tap" && question.numberLine) {
    return <NumberLineActivity question={question} onSubmit={onSubmit} disabled={disabled} />;
  }

  if (question.drag) {
    return <DragActivity question={question} onSubmit={onSubmit} disabled={disabled} />;
  }

  return <ChoiceGridActivity question={question} onSubmit={onSubmit} disabled={disabled} />;
};

const ReviewCard = ({
  reviewState,
  ttsEnabled,
  onSpeakFeedback,
  onSpeakExplanation,
  onOpenDetails,
  onContinue
}: {
  reviewState: ReviewState;
  ttsEnabled: boolean;
  onSpeakFeedback: () => void;
  onSpeakExplanation: () => void;
  onOpenDetails: () => void;
  onContinue: () => void;
}) => (
  <div className={`review-card ${reviewState.correct ? "review-card-correct" : "review-card-wrong"}`}>
    <div className="review-header review-header-inline">
      <MiniBadge text={reviewState.correct ? "Correct" : "Not yet"} tone={reviewState.correct ? "mint" : "peach"} />
      <h3>{reviewState.feedbackText}</h3>
      <SpeakerButton label="Read feedback" onSpeak={onSpeakFeedback} small disabled={!ttsEnabled} />
    </div>
    <InfoPanel
      title="Correction"
      text={reviewState.explanationText}
      ttsLabel="Read correction"
      onSpeak={onSpeakExplanation}
      ttsEnabled={ttsEnabled}
    />
    {reviewState.detailText ? (
      <div className="row-actions">
        <button type="button" className="secondary-button" onClick={onOpenDetails}>
          Further details
        </button>
      </div>
    ) : null}
    {reviewState.noteText ? <InfoPanel title="Helpful note" text={reviewState.noteText} ttsEnabled={ttsEnabled} /> : null}
    {reviewState.rescueText ? <InfoPanel title="Rescue move" text={reviewState.rescueText} ttsEnabled={ttsEnabled} /> : null}
    {reviewState.nextActionText ? <InfoPanel title="Next step" text={reviewState.nextActionText} ttsEnabled={ttsEnabled} /> : null}
    {reviewState.rewardTitles && reviewState.rewardTitles.length > 0 ? (
      <div className="reward-pill-row">
        {reviewState.rewardTitles.map((title) => (
          <span key={title} className="reward-pill">
            {title}
          </span>
        ))}
      </div>
    ) : null}
    <button type="button" className="primary-button" onClick={onContinue}>
      Continue
    </button>
  </div>
);

const TaskScreen = ({
  task,
  learningScript,
  hintVisible,
  reviewState,
  ttsEnabled,
  onSubmitAnswer,
  onSpeakInstruction,
  onSpeakChoices,
  onSpeakHint,
  onSpeakLesson,
  onSpeakFeedback,
  onSpeakExplanation,
  onOpenReviewDetails,
  onContinue
}: {
  task: SessionTask;
  learningScript: SkillLearningScript;
  hintVisible: boolean;
  reviewState: ReviewState | null;
  ttsEnabled: boolean;
  onSubmitAnswer: (choiceId: string) => void;
  onSpeakInstruction: () => void;
  onSpeakChoices: () => void;
  onSpeakHint: () => void;
  onSpeakLesson: () => void;
  onSpeakFeedback: () => void;
  onSpeakExplanation: () => void;
  onOpenReviewDetails: () => void;
  onContinue: () => void;
}) => {
  const stageTitle =
    task.mode === "placement"
      ? "Placement"
      : task.mode === "example"
        ? "Lesson Point"
        : task.isCheckpoint
          ? "Checkpoint"
          : task.mode === "practice"
            ? "Practice Mode"
            : "Mastery Mode";
  const instruction = getInstructionDisplay(task.question);
  const supportsHints = task.mode === "practice";
  const lessonStepsText = getLessonStepsText(learningScript);
  const workedExampleText = getWorkedExampleText(learningScript);

  return (
    <section className="task-screen card">
      <header className="task-header">
        <div>
          <div className="task-badge-row">
            <MiniBadge text={stageTitle} tone={task.isCheckpoint ? "peach" : "mint"} />
            {task.focusLabel ? <MiniBadge text={task.focusLabel} tone="blue" /> : null}
          </div>
          <h2>{instruction.title}</h2>
          {instruction.cue ? <PromptCueVisual cue={instruction.cue} /> : null}
        </div>
        <SpeakerButton label="Read instruction" onSpeak={onSpeakInstruction} disabled={!ttsEnabled} />
      </header>

      <p className="task-support">{task.question.supportText}</p>

      {reviewState ? (
        <ReviewCard
          reviewState={reviewState}
          ttsEnabled={ttsEnabled}
          onSpeakFeedback={onSpeakFeedback}
          onSpeakExplanation={onSpeakExplanation}
          onOpenDetails={onOpenReviewDetails}
          onContinue={onContinue}
        />
      ) : task.mode === "example" ? (
        <div className="lesson-point-panel">
          <InfoPanel
            title={learningScript.lessonTitle}
            text={`${learningScript.lessonBigIdea}\n\n${lessonStepsText}`}
            ttsLabel="Read lesson point"
            onSpeak={onSpeakLesson}
            ttsEnabled={ttsEnabled}
          />
          <InfoPanel
            title="Worked example"
            text={workedExampleText}
            ttsLabel="Read worked example"
            onSpeak={onSpeakLesson}
            ttsEnabled={ttsEnabled}
          />
          <InfoPanel
            title="What to notice"
            text={learningScript.whatToNotice}
            ttsLabel="Read what to notice"
            onSpeak={onSpeakHint}
            ttsEnabled={ttsEnabled}
          />
          <QuestionSupportVisual question={task.question} />
          {task.question.choices.length > 0 ? (
            <SectionWithAudio title="Answer choices" onSpeak={onSpeakChoices} ttsEnabled={ttsEnabled} />
          ) : null}
          <TaskInteraction question={task.question} onSubmit={onSubmitAnswer} disabled={false} />
        </div>
      ) : (
        <>
          {hintVisible ? (
            <InfoPanel
              title="Guided support"
              text={`${task.question.hint}\n\n${learningScript.guidedSupport.behavior}`}
              ttsLabel="Read hint"
              onSpeak={onSpeakHint}
              ttsEnabled={ttsEnabled}
            />
          ) : null}
          <QuestionSupportVisual question={task.question} />
          {task.question.choices.length > 0 ? (
            <SectionWithAudio title="Answer choices" onSpeak={onSpeakChoices} ttsEnabled={ttsEnabled} />
          ) : null}
          <TaskInteraction question={task.question} onSubmit={onSubmitAnswer} disabled={Boolean(reviewState)} />
        </>
      )}
    </section>
  );
};

const RecentSessionList = ({ profile }: { profile: ChildProfile }) => (
  <div className="recent-session-list">
    {profile.recentSessions.slice(0, 3).map((recent) => (
      <div key={recent.id} className="recent-session-row">
        <strong>{new Date(recent.startedAt).toLocaleDateString()}</strong>
        <span>{recent.firstTryCorrect}/{recent.itemsCompleted} first-try correct</span>
      </div>
    ))}
    {profile.recentSessions.length === 0 ? <small>No finished sessions yet.</small> : null}
  </div>
);

export default function App() {
  const [persistedState, setPersistedState] = useState<PersistedState>(() => loadState());
  const [screen, setScreen] = useState<Screen>("home");
  const [activeChildId, setActiveChildId] = useState<ProfileId | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [placement, setPlacement] = useState<PlacementProgress | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [taskShownAt, setTaskShownAt] = useState(Date.now());
  const [hintVisible, setHintVisible] = useState(false);
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentGateChallenge, setParentGateChallenge] = useState(makeParentGateChallenge());
  const [parentGateInput, setParentGateInput] = useState("");
  const [parentDetails, setParentDetails] = useState<ParentDetailsState | null>(null);
  const [taskAttemptState, setTaskAttemptState] = useState<TaskAttemptState>({
    attemptsUsed: 0
  });
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [reviewDetailOpen, setReviewDetailOpen] = useState(false);
  const answerLockedRef = useRef(false);

  const speech = useSpeech({
    enabled: persistedState.settings.ttsEnabled,
    rate: persistedState.settings.ttsRate,
    selectedVoiceURI: persistedState.settings.selectedVoiceURI
  });
  const fartAudio = useFartAudio();

  useEffect(() => {
    saveState(persistedState);
  }, [persistedState]);

  useEffect(() => {
    if (!speech.supported || !speech.resolvedVoiceURI) return;

    const selected = persistedState.settings.selectedVoiceURI;
    const selectedStillExists = selected
      ? speech.voices.some((voice) => voice.voiceURI === selected)
      : false;

    if (!selected || !selectedStillExists) {
      setPersistedState((current) => ({
        ...current,
        settings: {
          ...current.settings,
          selectedVoiceURI: speech.resolvedVoiceURI
        }
      }));
    }
  }, [persistedState.settings.selectedVoiceURI, speech.resolvedVoiceURI, speech.supported, speech.voices]);

  const activeChild = activeChildId ? persistedState.profiles[activeChildId] : null;
  const currentTask = session ? session.tasks[session.currentIndex] : null;
  const currentPlacementProbe = placement?.probes[placement.probeIndex] ?? null;
  const currentTaskLearningScript = currentTask
    ? getSkillLearningScript(getTaskSkill(currentTask))
    : null;
  const currentPlacementLearningScript = currentPlacementProbe
    ? getSkillLearningScript(getTaskSkill(currentPlacementProbe))
    : null;

  useEffect(() => {
    setTaskShownAt(Date.now());
    setHintVisible(false);
    setTaskAttemptState({
      attemptsUsed: 0
    });
    setReviewState(null);
    setReviewDetailOpen(false);
    answerLockedRef.current = false;
  }, [currentTask?.question.id, currentPlacementProbe?.question.id]);

  const updateProfile = (profile: ChildProfile) => {
    setPersistedState((current) => ({
      ...current,
      profiles: {
        ...current.profiles,
        [profile.id]: profile
      }
    }));
  };

  const updateSettings = (updater: (current: PersistedState["settings"]) => PersistedState["settings"]) => {
    setPersistedState((current) => ({
      ...current,
      settings: updater(current.settings)
    }));
  };

  const playAnswerFeedback = (text: string) => {
    fartAudio.play();
    speech.speak({
      channel: "feedback",
      text,
      delayMs: 110
    });
  };

  const jumpHome = () => {
    speech.stop();
    setScreen("home");
    setPlacement(null);
    setSession(null);
    setReviewState(null);
    setTaskAttemptState({
      attemptsUsed: 0
    });
    setReviewDetailOpen(false);
    setParentDetails(null);
    setFeedback("");
  };

  const openChild = (profileId: ProfileId) => {
    setActiveChildId(profileId);
    setPlacement(null);
    setSession(null);
    setScreen("dashboard");
    setFeedback("");
  };

  const handleNameSubmit = () => {
    const profileId = resolveProfileId(nameInput);
    if (!profileId) {
      setFeedback(`"${normalizeNameInput(nameInput)}" does not match Ély or Ira.`);
      return;
    }

    setNameInput("");
    openChild(profileId);
  };

  const continueFromReview = () => {
    if (!reviewState) return;

    if (reviewState.scope === "placement") {
      if (reviewState.nextProfile) {
        updateProfile(reviewState.nextProfile);
      }
      setPlacement(reviewState.nextPlacement ?? null);
    } else {
      if (reviewState.nextProfile) {
        updateProfile(reviewState.nextProfile);
      }
      setSession(reviewState.nextSession ?? null);
    }

    setReviewState(null);
    setReviewDetailOpen(false);
    answerLockedRef.current = false;
    setFeedback(reviewState.bannerMessage);
    setScreen(reviewState.nextScreen);
  };

  const handlePlacementAnswer = (choiceId: string) => {
    if (!activeChild || !placement || !currentPlacementProbe || reviewState || answerLockedRef.current) {
      return;
    }

    answerLockedRef.current = true;
    const responseTimeMs = Date.now() - taskShownAt;
    const correct = choiceId === currentPlacementProbe.question.correctChoiceId;
    const suspiciousFast = responseTimeMs < currentPlacementProbe.question.minResponseMs;
    const learningScript = getSkillLearningScript(getTaskSkill(currentPlacementProbe));
    const pedagogicalFeedback = buildPedagogicalFeedback({
      question: currentPlacementProbe.question,
      script: learningScript,
      correct,
      suspiciousFast,
      hintUsed: false,
      firstTry: true
    });

    const nextPlacement: PlacementProgress = {
      ...placement,
      probeIndex: placement.probeIndex + 1,
      scoresByStrand: {
        ...placement.scoresByStrand,
        [currentPlacementProbe.strandId]:
          placement.scoresByStrand[currentPlacementProbe.strandId] +
          (correct && !suspiciousFast ? 1 : 0)
      }
    };

    const explanation = {
      text: pedagogicalFeedback.explanation,
      speech: pedagogicalFeedback.audioText ?? pedagogicalFeedback.explanation
    };
    const feedbackLine = pedagogicalFeedback.headline;
    playAnswerFeedback(pedagogicalFeedback.audioText ?? feedbackLine);

    if (nextPlacement.probeIndex >= nextPlacement.probes.length) {
      const placedProfile = applyPlacementResults(activeChild, nextPlacement.scoresByStrand);
      setReviewState({
        scope: "placement",
        correct,
        feedbackText: feedbackLine,
        feedbackSpeech: pedagogicalFeedback.audioText ?? feedbackLine,
        explanationText: explanation.text,
        explanationSpeech: explanation.speech,
        nextActionText: pedagogicalFeedback.nextAction,
        rescueText: pedagogicalFeedback.rescueSuggested ? learningScript.rescue.explanation : undefined,
        nextScreen: "dashboard",
        nextPlacement: null,
        nextProfile: placedProfile,
        bannerMessage: "Placement done. FartMaths now knows where to begin."
      });
      return;
    }

    setReviewState({
      scope: "placement",
      correct,
      feedbackText: feedbackLine,
      feedbackSpeech: pedagogicalFeedback.audioText ?? feedbackLine,
      explanationText: explanation.text,
      explanationSpeech: explanation.speech,
      nextActionText: pedagogicalFeedback.nextAction,
      rescueText: pedagogicalFeedback.rescueSuggested ? learningScript.rescue.explanation : undefined,
      nextScreen: "placement",
      nextPlacement,
      bannerMessage: suspiciousFast
        ? "That answer was too fast to count for placement."
        : correct
          ? "Placement keeps going."
          : "The app will keep starting gently."
    });
  };

  const startPractice = (preferredStrandId?: StrandDefinition["id"]) => {
    if (!activeChild) return;

    setSession(planDailySession(activeChild, DEFAULT_SESSION_LENGTH, preferredStrandId));
    setReviewState(null);
    setScreen("practice");
    setFeedback(
      preferredStrandId
        ? `${STRAND_MAP[preferredStrandId].shortTitle} is ready. First comes one lesson point, then practice.`
        : "Whole curriculum is ready. Each lesson point is followed by practice from that same skill."
    );
  };

  const handleSessionAnswer = (choiceId: string) => {
    if (!activeChild || !session || !currentTask || reviewState || answerLockedRef.current) {
      return;
    }

    answerLockedRef.current = true;
    const responseTimeMs = Date.now() - taskShownAt;
    const correct = choiceId === currentTask.question.correctChoiceId;
    const suspiciousFast = responseTimeMs < currentTask.question.minResponseMs;
    const firstTryCorrect = taskAttemptState.attemptsUsed === 0;
    const canRetry = currentTask.mode === "example" || currentTask.mode === "practice";
    const learningScript = getSkillLearningScript(getTaskSkill(currentTask));

    if (!correct && canRetry && firstTryCorrect) {
      const retryPedagogicalFeedback = buildPedagogicalFeedback({
        question: currentTask.question,
        script: learningScript,
        correct,
        suspiciousFast,
        hintUsed: false,
        firstTry: true
      });
      const retryFeedback = retryPedagogicalFeedback.headline;
      playAnswerFeedback(retryPedagogicalFeedback.audioText ?? retryFeedback);
      setTaskAttemptState({
        attemptsUsed: 1
      });
      setHintVisible(true);
      setFeedback(retryFeedback);
      answerLockedRef.current = false;
      return;
    }

    const hintUsed =
      hintVisible ||
      taskAttemptState.attemptsUsed > 0 ||
      currentTask.mode === "example";

    const result = advanceAfterAnswer(activeChild, session, currentTask, {
      selectedChoiceId: choiceId,
      correct,
      firstTryCorrect,
      hintUsed,
      responseTimeMs,
      suspiciousFast
    });

    let nextProfile = result.profile;
    let nextSession: ActiveSession | null = result.session;
    let nextScreen: Screen = "practice";
    let bannerMessage = result.notes.join(" ");

    if (result.session.currentIndex >= result.session.tasks.length) {
      nextProfile = finalizeSession(nextProfile, result.session);
      nextSession = null;
      nextScreen = "dashboard";
      bannerMessage = `Session complete: ${result.session.firstTryCorrectTotal}/${result.session.completedItems} first-try correct.`;
    } else if (!bannerMessage) {
      bannerMessage = correct ? "Great job." : "Keep going. The next one is ready.";
    }

    const pedagogicalFeedback = buildPedagogicalFeedback({
      question: currentTask.question,
      script: learningScript,
      correct,
      suspiciousFast,
      hintUsed,
      firstTry: firstTryCorrect
    });
    const explanation = {
      text: pedagogicalFeedback.explanation,
      speech: pedagogicalFeedback.audioText ?? pedagogicalFeedback.explanation
    };
    const feedbackLine = pedagogicalFeedback.headline;
    playAnswerFeedback(pedagogicalFeedback.audioText ?? feedbackLine);

    setReviewState({
      scope: "practice",
      correct,
      feedbackText: feedbackLine,
      feedbackSpeech: pedagogicalFeedback.audioText ?? feedbackLine,
      explanationText: explanation.text,
      explanationSpeech: explanation.speech,
      noteText:
        result.notes.join(" ") ||
        pedagogicalFeedback.nextAction ||
        (hintUsed
          ? firstTryCorrect
            ? "This round used support, so it does not count for mastery."
            : "This one was fixed after a mistake, so it does not count as a first-try mastery win."
          : undefined),
      nextActionText: pedagogicalFeedback.nextAction ?? learningScript.nextStepAdvice.childMessage,
      rescueText: pedagogicalFeedback.rescueSuggested ? learningScript.rescue.explanation : undefined,
      detailText: buildReviewDetails({
        question: currentTask.question,
        correct,
        firstTryCorrect,
        suspiciousFast,
        hintUsed
      }),
      rewardTitles: result.earnedRewardIds?.length
        ? result.earnedRewardIds
            .map((rewardId) => REWARDS.find((reward) => reward.id === rewardId)?.title ?? rewardId)
        : undefined,
      nextScreen,
      nextProfile,
      nextSession,
      bannerMessage
    });
  };

  const openParent = () => {
    setParentGateChallenge(makeParentGateChallenge());
    setParentGateInput("");
    setParentGateOpen(true);
  };

  const submitParentGate = () => {
    if (Number(parentGateInput) === parentGateChallenge.answer) {
      setParentGateOpen(false);
      setScreen("parent");
      setFeedback("Parent dashboard unlocked.");
      return;
    }

    setParentGateChallenge(makeParentGateChallenge());
    setParentGateInput("");
    setFeedback("Try the grown-up gate again.");
  };

  const strongSkills = useMemo(() => {
    if (!activeChild) return [];
    return [...STRANDS]
      .map((strand) => getStrandSnapshot(activeChild, strand))
      .sort((left, right) => right.strandProgress.highestUnlockedLevel - left.strandProgress.highestUnlockedLevel)
      .slice(0, 3);
  }, [activeChild]);

  const needsPractice = useMemo(() => {
    if (!activeChild) return [];
    return [...STRANDS]
      .map((strand) => getStrandSnapshot(activeChild, strand))
      .sort((left, right) => {
        const leftStats = getWindowStats(left.currentProgress);
        const rightStats = getWindowStats(right.currentProgress);
        return (
          left.currentSkill.level -
          right.currentSkill.level +
          rightStats.firstTryCorrect -
          leftStats.firstTryCorrect
        );
      })
      .slice(0, 3);
  }, [activeChild]);

  const upcomingRewards = useMemo(() => (activeChild ? getUpcomingRewards(activeChild) : []), [activeChild]);
  const overallCounts = useMemo(
    () => (activeChild ? getOverallMasteryCounts(activeChild) : { mastered: 0, total: 0 }),
    [activeChild]
  );
  const parentDetailProfile = parentDetails ? persistedState.profiles[parentDetails.profileId] : null;
  const parentDetailStrand = parentDetails ? STRAND_MAP[parentDetails.strandId] : null;
  const parentDetailBuckets =
    parentDetailProfile && parentDetailStrand
      ? getStrandSkillBuckets(parentDetailProfile, parentDetailStrand)
      : null;

  return (
    <main className="app-shell">
      <div className="background-blobs" aria-hidden="true">
        <span className="blob blob-one" />
        <span className="blob blob-two" />
        <span className="blob blob-three" />
      </div>

      <header className="top-bar">
        <button type="button" className="ghost-button" onClick={jumpHome}>
          Home
        </button>
        <h1 className="brand-title">
          <img src={toAssetUrl(APP_LOGO_SRC)} alt="" className="brand-logo" width="52" height="52" />
          <span>FartMaths</span>
        </h1>
        <button type="button" className="ghost-button" onClick={openParent}>
          Parent
        </button>
      </header>

      {feedback ? <div className="feedback-banner">{feedback}</div> : null}

      {parentGateOpen ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <h2>Parent Gate</h2>
            <p>Solve this grown-up helper sum:</p>
            <strong className="gate-problem">
              {parentGateChallenge.left} + {parentGateChallenge.right}
            </strong>
            <input
              inputMode="numeric"
              className="name-input"
              value={parentGateInput}
              onChange={(event) => setParentGateInput(event.target.value)}
            />
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={() => setParentGateOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={submitParentGate}>
                Open
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {parentDetails && parentDetailProfile && parentDetailStrand && parentDetailBuckets ? (
        <div className="modal-backdrop">
          <div className="modal card skill-detail-modal">
            <div className="section-heading">
              <div>
                <h2>{parentDetailProfile.displayName}: {parentDetailStrand.shortTitle}</h2>
                <p>Mastered skills and remaining skills for this category.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setParentDetails(null)}>
                Close
              </button>
            </div>

            <div className="skill-modal-grid">
              <div className="parent-summary-card">
                <strong>Mastered</strong>
                {parentDetailBuckets.mastered.length > 0 ? (
                  <div className="skill-pill-list">
                    {parentDetailBuckets.mastered.map((skill) => (
                      <div key={skill.id} className="skill-pill">
                        <span>{skill.title}</span>
                        <small>{skill.summary}</small>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            if (!window.confirm(`Reset ${skill.title} for ${parentDetailProfile.displayName}?`)) return;
                            setPersistedState((current) =>
                              resetSkillProgress(current, parentDetailProfile.id, skill.id)
                            );
                            setParentDetails({
                              profileId: parentDetailProfile.id,
                              strandId: parentDetailStrand.id
                            });
                          }}
                        >
                          Reset skill
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small>No mastered skills in this category yet.</small>
                )}
              </div>

              <div className="parent-summary-card">
                <strong>Remaining</strong>
                {parentDetailBuckets.remaining.length > 0 ? (
                  <div className="skill-pill-list">
                    {parentDetailBuckets.remaining.map((skill) => (
                      <div key={skill.id} className="skill-pill">
                        <span>{skill.title}</span>
                        <small>{MASTERY_LABELS[parentDetailProfile.skillProgress[skill.id].status]}</small>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            if (!window.confirm(`Reset ${skill.title} for ${parentDetailProfile.displayName}?`)) return;
                            setPersistedState((current) =>
                              resetSkillProgress(current, parentDetailProfile.id, skill.id)
                            );
                            setParentDetails({
                              profileId: parentDetailProfile.id,
                              strandId: parentDetailStrand.id
                            });
                          }}
                        >
                          Reset skill
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small>Everything in this category is currently mastered.</small>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reviewDetailOpen && reviewState?.detailText ? (
        <div className="modal-backdrop">
          <div className="modal card review-detail-modal">
            <div className="section-heading">
              <div>
                <h2>Further details</h2>
                <p>Extra teacher notes for this question.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setReviewDetailOpen(false)}>
                Close
              </button>
            </div>
            <div className="review-detail-text">
              {reviewState.detailText.split("\n\n").map((part, index) => (
                <p key={`detail-${index}`}>{part}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {screen === "home" ? (
        <section className="home-screen">
          <div className="hero card">
            <img src={toAssetUrl(APP_LOGO_SRC)} alt="FartMaths logo" className="hero-logo" width="180" height="180" />
            <MiniBadge text="Silly fun. Serious learning." tone="peach" />
            <h2>Pick a ninja to start today&apos;s math giggles.</h2>
            <div className="profile-grid">
              {PROFILE_PRESETS.map((profile) => {
                const saved = persistedState.profiles[profile.id];
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className="profile-button"
                    onClick={() => openChild(profile.id)}
                  >
                    <AvatarArt avatarId={saved.avatarId} label={saved.displayName} large />
                    <strong>{saved.displayName}</strong>
                  </button>
                );
              })}
            </div>

            
          </div>
        </section>
      ) : null}

      {screen === "dashboard" && activeChild ? (
        <section className="dashboard">
          <div className="dashboard-hero card">
            <div className="dashboard-hero-grid">
              <div className="dashboard-main-panel">
                <div className="dashboard-headline">
                  <AvatarArt avatarId={activeChild.avatarId} label={activeChild.displayName} large />
                  <div>
                    <MiniBadge text={`${overallCounts.mastered}/${overallCounts.total} skills mastered`} />
                    <h2>{activeChild.displayName}&apos;s Dashboard</h2>
                    <p>Choose any category right away. Each one keeps its own lesson point, practice, and mastery progress.</p>
                  </div>
                </div>

                <div className="dashboard-actions">
                  <ProgressRing value={getOverallProgress(activeChild)} label="overall mastery" />
                  <div className="stack-actions">
                    <div className="avatar-picker-section">
                      <div className="section-heading">
                        <div>
                          <h3>Choose avatar</h3>
                          <p>Tap one of the four ninja profile pictures below.</p>
                        </div>
                      </div>
                      <div className="avatar-picker">
                        {AVATARS.map((avatar) => (
                          <button
                            key={avatar.id}
                            type="button"
                            className={`avatar-choice ${activeChild.avatarId === avatar.id ? "avatar-choice-active" : ""}`}
                            onClick={() => updateProfile({ ...activeChild, avatarId: avatar.id })}
                          >
                            <AvatarArt avatarId={avatar.id} label={avatar.label} />
                            <strong>{avatar.label}</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="hero-reward-strip">
                      <div className="section-heading">
                        <div>
                          <h3>Next rewards</h3>
                          <p>The next three silly prizes are shown right here.</p>
                        </div>
                      </div>
                      <div className="reward-preview-grid">
                        {upcomingRewards.map((reward) => (
                          <div key={reward.rewardId} className="reward-preview-card">
                            <strong>{reward.title}</strong>
                            <span>{reward.description}</span>
                            <em>{reward.remaining}</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-insights">
                <div className="hero-insight-card">
                  <h3>Strong Skills</h3>
                  <div className="strand-list">
                    {strongSkills.map(({ strand, strandProgress, currentSkill }) => (
                      <div key={strand.id} className="strand-row">
                        <strong>{strand.shortTitle}</strong>
                        <span>Level {strandProgress.highestUnlockedLevel}</span>
                        <small>{currentSkill.title}</small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hero-insight-card">
                  <h3>Needs Practice</h3>
                  <div className="strand-list">
                    {needsPractice.map(({ strand, currentSkill, currentProgress }) => (
                      <div key={strand.id} className="strand-row">
                        <strong>{strand.shortTitle}</strong>
                        <span>{MASTERY_LABELS[currentProgress.status]}</span>
                        <small>{currentSkill.title}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="category-grid">
            <article className="card category-card category-card-whole">
              <div className="category-card-top">
                <div>
                  <MiniBadge text="Adaptive mix" tone="blue" />
                  <h3>Whole Curriculum</h3>
                </div>
                <span className="category-mascot">All 13 categories together</span>
              </div>
              <p>Pulls from each child&apos;s current lesson point or level across the whole curriculum.</p>
              <div className="category-progress-row">
                <strong>{overallCounts.mastered} / {overallCounts.total}</strong>
                <span>{Math.round(getOverallProgress(activeChild) * 100)}%</span>
              </div>
              <div className="category-progress-bar">
                <span style={{ width: `${Math.round(getOverallProgress(activeChild) * 100)}%`, background: "#2fb169" }} />
              </div>
              <small>Uses each category&apos;s current skill and review needs.</small>
              <small>Lesson point first when a new skill appears, then 3 practice questions.</small>
              <button
                type="button"
                className="primary-button"
                onClick={() => startPractice()}
              >
                Open Whole Curriculum
              </button>
            </article>

            {STRANDS.map((strand) => {
              const snapshot = getStrandSnapshot(activeChild, strand);
              const completion = getStrandCompletion(activeChild, strand.id);
              const cardVisualStyle = strand.cardVisualSrc
                ? ({
                    "--category-card-visual": `url("${toAssetUrl(strand.cardVisualSrc)}")`
                  } as CSSProperties)
                : undefined;
              return (
                <article
                  key={strand.id}
                  className={`card category-card ${strand.cardVisualSrc ? "category-card-visual" : ""}`}
                  style={cardVisualStyle}
                >
                  <div className="category-card-top">
                    <div>
                      <MiniBadge text={snapshot.readiness} tone="blue" />
                      <h3>{strand.shortTitle}</h3>
                    </div>
                    <span className="category-mascot">{strand.mascot}</span>
                  </div>
                  <p>{strand.description}</p>
                  <div className="category-progress-row">
                    <strong>{completion.mastered} / {completion.total}</strong>
                    <span>{completion.percentage}%</span>
                  </div>
                  <div className="category-progress-bar">
                    <span style={{ width: `${completion.percentage}%`, background: strand.color }} />
                  </div>
                  <small>
                    Level {snapshot.strandProgress.currentLevel}: {snapshot.currentSkill.title}
                  </small>
                  <small>{MASTERY_LABELS[snapshot.currentProgress.status]}</small>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => startPractice(strand.id)}
                  >
                    Open {strand.shortTitle}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {screen === "placement" && activeChild && currentPlacementProbe ? (
        <section className="practice-screen">
          <div className="card">
            <MiniBadge text={`Placement ${placement!.probeIndex + 1}/${placement!.probes.length}`} />
            <h2>{activeChild.displayName}&apos;s warm-up check</h2>
            <p>We test each strand separately so the app can start at the right level.</p>
          </div>

          <TaskScreen
            key={currentPlacementProbe.question.id}
            task={{
              skillId: currentPlacementProbe.question.skillId,
              mode: "placement",
              question: currentPlacementProbe.question,
              strandId: currentPlacementProbe.strandId,
              level: currentPlacementProbe.level
            }}
            learningScript={currentPlacementLearningScript!}
            hintVisible={false}
            reviewState={reviewState}
            ttsEnabled={persistedState.settings.ttsEnabled}
            onSubmitAnswer={handlePlacementAnswer}
            onSpeakInstruction={() => speech.speak({ channel: "instruction", text: currentPlacementProbe.question.speech })}
            onSpeakChoices={() => speech.speak({ channel: "choices", text: getChoiceSpeech(currentPlacementProbe.question) })}
            onSpeakHint={() => speech.speak({ channel: "hint", text: currentPlacementProbe.question.hintSpeech ?? currentPlacementProbe.question.hint })}
            onSpeakLesson={() =>
              speech.speak({
                channel: "explanation",
                text: currentPlacementLearningScript
                  ? getLearningScriptSpeech(currentPlacementLearningScript)
                  : currentPlacementProbe.question.explanation.speech
              })
            }
            onSpeakFeedback={() => speech.speak({ channel: "feedback", text: reviewState?.feedbackSpeech ?? "" })}
            onSpeakExplanation={() => speech.speak({ channel: "explanation", text: reviewState?.explanationSpeech ?? "" })}
            onOpenReviewDetails={() => setReviewDetailOpen(true)}
            onContinue={continueFromReview}
          />
        </section>
      ) : null}

      {screen === "practice" && currentTask && activeChild && session ? (
        <section className="practice-screen">
          <div className="session-status card">
            <div>
              <MiniBadge text={`${session.completedItems}/${session.targetItemCount} done`} />
              <h2>{activeChild.displayName}&apos;s Practice</h2>
            </div>
            <div className="session-stats">
              <span>{session.firstTryCorrectTotal} first-try wins</span>
              <span>{currentTask.focusLabel ?? "Whole Curriculum"}</span>
            </div>
          </div>

          <TaskScreen
            key={currentTask.question.id}
            task={currentTask}
            learningScript={currentTaskLearningScript!}
            hintVisible={hintVisible}
            reviewState={reviewState}
            ttsEnabled={persistedState.settings.ttsEnabled}
            onSubmitAnswer={handleSessionAnswer}
            onSpeakInstruction={() => speech.speak({ channel: "instruction", text: currentTask.question.speech })}
            onSpeakChoices={() => speech.speak({ channel: "choices", text: getChoiceSpeech(currentTask.question) })}
            onSpeakHint={() => speech.speak({ channel: "hint", text: currentTask.question.hintSpeech ?? currentTask.question.hint })}
            onSpeakLesson={() =>
              speech.speak({
                channel: "explanation",
                text: currentTaskLearningScript
                  ? getLearningScriptSpeech(currentTaskLearningScript)
                  : currentTask.question.explanation.speech
              })
            }
            onSpeakFeedback={() => speech.speak({ channel: "feedback", text: reviewState?.feedbackSpeech ?? "" })}
            onSpeakExplanation={() => speech.speak({ channel: "explanation", text: reviewState?.explanationSpeech ?? "" })}
            onOpenReviewDetails={() => setReviewDetailOpen(true)}
            onContinue={continueFromReview}
          />
        </section>
      ) : null}

      {screen === "parent" ? (
        <section className="parent-screen">
          <div className="card">
            <h2>Parent Dashboard</h2>
            <p>Audio settings, strand progress, category reset tools, and skill detail popups for both children.</p>
            <div className="parent-settings">
              <label className="toggle-row">
                <span>Text-to-speech</span>
                <input
                  type="checkbox"
                  checked={persistedState.settings.ttsEnabled}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      ttsEnabled: event.target.checked
                    }))
                  }
                />
              </label>
              <label className="range-row">
                <span>Audio speed</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.15"
                  step="0.05"
                  value={persistedState.settings.ttsRate}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      ttsRate: Number(event.target.value)
                    }))
                  }
                />
                <strong>{persistedState.settings.ttsRate.toFixed(2)}x</strong>
              </label>
              <label className="select-row">
                <span>Voice</span>
                <select
                  className="voice-select"
                  value={persistedState.settings.selectedVoiceURI ?? ""}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      selectedVoiceURI: event.target.value || undefined
                    }))
                  }
                >
                  <option value="">Best available voice</option>
                  {speech.voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="progress-grid">
            {(Object.keys(persistedState.profiles) as ProfileId[]).map((profileId) => {
              const profile = persistedState.profiles[profileId];
              const weakSkills = STRANDS
                .map((strand) => getStrandSnapshot(profile, strand))
                .sort((left, right) => left.strandProgress.currentLevel - right.strandProgress.currentLevel)
                .slice(0, 3);

              return (
                <div key={profile.id} className="card parent-card">
                  <div className="parent-card-head">
                    <AvatarArt avatarId={profile.avatarId} label={profile.displayName} />
                    <div>
                      <h3>{profile.displayName}</h3>
                      <p>{profile.recentSessions.length} recent sessions</p>
                    </div>
                  </div>

                  <div className="parent-summary-grid">
                    <div className="parent-summary-card">
                      <strong>Weak skills</strong>
                      {weakSkills.map(({ strand, currentSkill }) => (
                        <span key={strand.id}>{strand.shortTitle}: {currentSkill.title}</span>
                      ))}
                    </div>
                    <div className="parent-summary-card">
                      <strong>Recent sessions</strong>
                      <RecentSessionList profile={profile} />
                    </div>
                  </div>

                  <div className="parent-strand-list">
                    {STRANDS.map((strand) => {
                      const snapshot = getStrandSnapshot(profile, strand);
                      const completion = getStrandCompletion(profile, strand.id);
                      return (
                        <div key={strand.id} className="parent-strand-row">
                          <div className="parent-strand-main">
                            <strong>{strand.shortTitle}</strong>
                            <span>{snapshot.readiness}</span>
                            <span>{completion.percentage}%</span>
                            <span>{completion.mastered}/{completion.total}</span>
                            <span>{MASTERY_LABELS[snapshot.currentProgress.status]}</span>
                          </div>
                          <div className="parent-strand-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                setParentDetails({
                                  profileId: profile.id,
                                  strandId: strand.id
                                })
                              }
                            >
                              See skills
                            </button>
                            <button
                              type="button"
                              className="secondary-button danger-button"
                              onClick={() => {
                                if (!window.confirm(`Reset ${strand.shortTitle} for ${profile.displayName}?`)) return;
                                setPersistedState((current) =>
                                  resetStrandProgress(current, profile.id, strand.id)
                                );
                              }}
                            >
                              Reset category
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
