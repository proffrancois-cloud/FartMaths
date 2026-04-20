import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_CATALOG,
  AVATARS,
  PROFILE_PRESETS,
  REWARDS,
  SESSION_LENGTHS,
  STRANDS,
  STRAND_MAP
} from "../data/catalog";
import { EXAMPLE_COPY, MASTERY_LABELS } from "../data/rules";
import {
  advanceAfterAnswer,
  applyPlacementResults,
  buildPlacementProgress,
  finalizeSession,
  getWindowStats,
  planDailySession
} from "../engine/progression";
import { useSpeech } from "../hooks/useSpeech";
import {
  computeReadinessLabel,
  loadState,
  normalizeNameInput,
  resetProfile,
  resolveProfileId,
  saveState
} from "../lib/storage";
import type {
  ActiveSession,
  AnswerChoice,
  ChildProfile,
  ParentGateChallenge,
  PersistedState,
  PlacementProgress,
  ProfileId,
  QuestionDefinition,
  SessionLength,
  SessionTask,
  StrandDefinition
} from "../types";

type Screen =
  | "home"
  | "dashboard"
  | "placement"
  | "practice"
  | "rewards"
  | "progress"
  | "parent";

const makeParentGateChallenge = (): ParentGateChallenge => {
  const left = 7 + Math.floor(Math.random() * 5);
  const right = 4 + Math.floor(Math.random() * 6);
  return {
    left,
    right,
    answer: left + right
  };
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const getOverallProgress = (profile: ChildProfile) => {
  const total = STRANDS.reduce((sum, strand) => sum + strand.levels.length, 0);
  const mastered = Object.values(profile.skillProgress).filter(
    (skill) => skill.status === "mastered" || skill.status === "review-needed"
  ).length;
  return mastered / total;
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
    readiness: computeReadinessLabel(strandProgress.highestUnlockedLevel)
  };
};

const AvatarArt = ({
  avatarId,
  label,
  large = false
}: {
  avatarId: string;
  label: string;
  large?: boolean;
}) => {
  const size = large ? 108 : 68;
  const faceStyle = { transformOrigin: "50% 50%" };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`avatar avatar-${avatarId}`}
      aria-label={label}
      role="img"
    >
      <defs>
        <linearGradient id={`bg-${avatarId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff3c1" />
          <stop offset="100%" stopColor="#d7ffdf" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill={`url(#bg-${avatarId})`} />
      {avatarId === "happy-poop" && (
        <>
          <path
            d="M36 78c3-18 15-25 21-32-6-2-8-6-8-10 0-9 8-16 17-16s17 7 17 16c0 4-2 8-7 10 7 6 17 13 20 32H36Z"
            fill="#8a5b2f"
          />
          <circle cx="50" cy="58" r="4.5" fill="#202224" />
          <circle cx="70" cy="58" r="4.5" fill="#202224" />
          <path d="M47 72c5 6 21 6 26 0" stroke="#202224" strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="36" r="10" fill="#ffd86c" />
        </>
      )}
      {avatarId === "fart-cloud" && (
        <>
          <circle cx="42" cy="60" r="18" fill="#8ef2b7" />
          <circle cx="60" cy="54" r="21" fill="#7de5ad" />
          <circle cx="81" cy="61" r="16" fill="#93f5c0" />
          <circle cx="54" cy="74" r="14" fill="#72d69a" />
          <circle cx="51" cy="58" r="4.5" fill="#214a39" />
          <circle cx="70" cy="58" r="4.5" fill="#214a39" />
          <path d="M50 72c5 5 16 6 22 0" stroke="#214a39" strokeWidth="4" strokeLinecap="round" />
          <path d="M26 78c-8 3-10 8-7 12 4 4 9 3 13-1" fill="none" stroke="#214a39" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {avatarId === "toilet-roll-hero" && (
        <>
          <rect x="34" y="32" width="52" height="58" rx="18" fill="#e8fbff" stroke="#89b6c9" strokeWidth="5" />
          <ellipse cx="60" cy="49" rx="18" ry="10" fill="#b1d6e3" />
          <circle cx="50" cy="63" r="4.5" fill="#28323d" />
          <circle cx="70" cy="63" r="4.5" fill="#28323d" />
          <path d="M48 76c6 7 18 7 24 0" stroke="#28323d" strokeWidth="4" strokeLinecap="round" />
          <path d="M86 50c11 2 15 8 12 17-3 8-11 10-17 8" fill="none" stroke="#89b6c9" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      {avatarId === "butt-monster" && (
        <>
          <circle cx="44" cy="62" r="22" fill="#ffa97f" />
          <circle cx="76" cy="62" r="22" fill="#ff9b70" />
          <circle cx="49" cy="54" r="4.5" fill="#2f2020" />
          <circle cx="71" cy="54" r="4.5" fill="#2f2020" />
          <path d="M49 76c5 4 17 4 22 0" stroke="#2f2020" strokeWidth="4" strokeLinecap="round" />
          <path d="M59 41c7-8 18-10 25-5" fill="none" stroke="#2f2020" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {avatarId === "smiling-toilet" && (
        <>
          <rect x="34" y="42" width="52" height="40" rx="12" fill="#a7e0ff" stroke="#427d9b" strokeWidth="5" />
          <rect x="40" y="24" width="40" height="22" rx="10" fill="#dff6ff" stroke="#427d9b" strokeWidth="5" />
          <circle cx="50" cy="58" r="4.5" fill="#213846" />
          <circle cx="70" cy="58" r="4.5" fill="#213846" />
          <path d="M49 71c5 5 17 5 22 0" stroke="#213846" strokeWidth="4" strokeLinecap="round" />
          <rect x="50" y="82" width="20" height="16" rx="4" fill="#427d9b" />
        </>
      )}
      <text x="60" y="112" textAnchor="middle" fontSize="12" fill="#1f2530" style={faceStyle}>
        {label}
      </text>
    </svg>
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

const SpeakerButton = ({
  onSpeak,
  small = false
}: {
  onSpeak: () => void;
  small?: boolean;
}) => (
  <button
    type="button"
    className={`speaker-button ${small ? "speaker-button-small" : ""}`}
    onClick={onSpeak}
    aria-label="Read aloud"
  >
    🔊
  </button>
);

const MiniBadge = ({ text, tone = "mint" }: { text: string; tone?: "mint" | "peach" | "blue" }) => (
  <span className={`mini-badge mini-badge-${tone}`}>{text}</span>
);

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

const QuestionVisual = ({ question }: { question: QuestionDefinition }) => {
  if (question.type === "graph-reading" && question.graph) {
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

  if (question.type === "clock-choice" && question.clockChoices) {
    return null;
  }

  if (question.type === "fill-ten-frame" && question.tenFrame) {
    return (
      <div className="ten-frame">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className={`ten-slot ${index < question.tenFrame!.filled ? "filled" : ""}`}>
            {index < question.tenFrame!.filled ? "🚽" : ""}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "build-a-number" && question.buildNumber) {
    return (
      <div className="build-number-card">
        <div><strong>Hundreds:</strong> {question.buildNumber.hundreds}</div>
        <div><strong>Tens:</strong> {question.buildNumber.tens}</div>
        <div><strong>Ones:</strong> {question.buildNumber.ones}</div>
      </div>
    );
  }

  if (question.type === "array-counting" && question.arrayData) {
    return (
      <div className="array-grid" style={{ gridTemplateColumns: `repeat(${question.arrayData.columns}, 1fr)` }}>
        {Array.from({ length: question.arrayData.target }, (_, index) => (
          <span key={index} className="array-token">🧻</span>
        ))}
      </div>
    );
  }

  if (question.type === "number-line-tap" && question.numberLine) {
    return (
      <div className="number-line-card">
        <div className="number-line-track">
          {Array.from(
            { length: Math.min(8, question.numberLine.end - question.numberLine.start + 1) },
            (_, index) => {
              const value = question.numberLine!.start + index;
              return (
                <div key={value} className={`number-line-stop ${value === question.numberLine!.target ? "target" : ""}`}>
                  <span />
                  <em>{value}</em>
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  }

  if (question.type === "story-scene" && question.story) {
    return (
      <div className="story-card">
        <strong>{question.story.scene}</strong>
        <span>{question.story.equation}</span>
      </div>
    );
  }

  if (question.groups) {
    return (
      <div className="group-visuals">
        {question.groups.map((group) => (
          <div key={group.id} className="group-card">
            <strong>{group.label}</strong>
            <div className="token-cloud">
              {Array.from({ length: Math.min(group.count, 24) }, (_, index) => (
                <span key={index} style={{ color: group.color }}>
                  {group.token}
                </span>
              ))}
            </div>
            <em>{group.count}</em>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="activity-card">
      <strong>{question.targetLabel ?? "Pick the best answer"}</strong>
      <p>{ACTIVITY_CATALOG.find((game) => game.type === question.type)?.example}</p>
    </div>
  );
};

const TaskScreen = ({
  task,
  onAnswer,
  onUseHint,
  hintVisible,
  onCompleteExample,
  revealExample,
  onRevealExample,
  onSpeak
}: {
  task: SessionTask;
  onAnswer: (choiceId: string) => void;
  onUseHint: () => void;
  hintVisible: boolean;
  onCompleteExample: () => void;
  revealExample: boolean;
  onRevealExample: () => void;
  onSpeak: () => void;
}) => {
  const stageTitle =
    task.mode === "placement"
      ? "Placement"
      : task.mode === "example"
      ? "Example Mode"
      : task.isCheckpoint
        ? "Checkpoint"
        : task.mode === "practice"
          ? "Practice Mode"
          : "Mastery Mode";

  return (
    <section className="task-screen card">
      <header className="task-header">
        <div>
          <MiniBadge text={stageTitle} tone={task.isCheckpoint ? "peach" : "mint"} />
          <h2>{task.question.prompt}</h2>
        </div>
        <SpeakerButton onSpeak={onSpeak} />
      </header>

      <p className="task-support">{task.question.supportText}</p>

      <QuestionVisual question={task.question} />

      {task.mode === "example" ? (
        <div className="example-controls">
          {!revealExample ? (
            <button type="button" className="primary-button" onClick={onRevealExample}>
              Show me a silly example
            </button>
          ) : (
            <>
              <div className="hint-banner">
                <strong>{EXAMPLE_COPY.intro}</strong>
                <span>{task.question.hint}</span>
              </div>
              <button type="button" className="primary-button" onClick={onCompleteExample}>
                I saw it. Let&apos;s try.
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {task.mode === "practice" && (
            <div className="hint-row">
              <button type="button" className="secondary-button" onClick={onUseHint}>
                Need a hint?
              </button>
              {hintVisible && <div className="hint-banner">{task.question.hint}</div>}
            </div>
          )}

          <div className="choice-grid">
            {task.question.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="choice-button"
                onClick={() => onAnswer(choice.id)}
              >
                {task.question.type === "clock-choice" ? (
                  <>
                    <AnalogClock
                      hour={Number(String(choice.value).split(":")[0])}
                      minute={Number(String(choice.value).split(":")[1])}
                    />
                    <span>{choice.label}</span>
                  </>
                ) : (
                  <span>{choice.label}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default function App() {
  const [persistedState, setPersistedState] = useState<PersistedState>(() => loadState());
  const [screen, setScreen] = useState<Screen>("home");
  const [activeChildId, setActiveChildId] = useState<ProfileId | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [placement, setPlacement] = useState<PlacementProgress | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [taskShownAt, setTaskShownAt] = useState(Date.now());
  const [hintVisible, setHintVisible] = useState(false);
  const [revealExample, setRevealExample] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentGateChallenge, setParentGateChallenge] = useState(makeParentGateChallenge());
  const [parentGateInput, setParentGateInput] = useState("");
  const speech = useSpeech(
    persistedState.settings.ttsEnabled,
    persistedState.settings.ttsRate
  );

  useEffect(() => {
    saveState(persistedState);
  }, [persistedState]);

  const activeChild = activeChildId ? persistedState.profiles[activeChildId] : null;
  const currentTask = session ? session.tasks[session.currentIndex] : null;
  const currentPlacementProbe = placement?.probes[placement.probeIndex] ?? null;

  useEffect(() => {
    setTaskShownAt(Date.now());
    setHintVisible(false);
    setRevealExample(false);
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

  const jumpHome = () => {
    setScreen("home");
    setPlacement(null);
    setSession(null);
    setShowAvatarPicker(false);
    setFeedback("");
  };

  const openChild = (profileId: ProfileId) => {
    setActiveChildId(profileId);
    setShowAvatarPicker(false);
    const profile = persistedState.profiles[profileId];
    if (!profile.placementDone) {
      setPlacement(buildPlacementProgress());
      setScreen("placement");
      setFeedback("Warm-up time. We are checking each strand a little bit.");
    } else {
      setScreen("dashboard");
      setFeedback("");
    }
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

  const handlePlacementAnswer = (choiceId: string) => {
    if (!activeChild || !placement || !currentPlacementProbe) return;
    const responseTimeMs = Date.now() - taskShownAt;
    const correct = choiceId === currentPlacementProbe.question.correctChoiceId;
    const suspiciousFast = responseTimeMs < currentPlacementProbe.question.minResponseMs;

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

    if (correct) {
      setFeedback(
        suspiciousFast
          ? "That was a turbo tap. Nice job, but it will not count for placement."
          : "Nice thinking."
      );
      speech.speak("Nice thinking.");
    } else {
      setFeedback("That one was tricky. The app will start gently.");
      speech.speak("That one was tricky. The app will start gently.");
    }

    if (nextPlacement.probeIndex >= nextPlacement.probes.length) {
      const placedProfile = applyPlacementResults(activeChild, nextPlacement.scoresByStrand);
      updateProfile(placedProfile);
      setPlacement(null);
      setScreen("dashboard");
      setFeedback("Placement done. FartMaths now knows where to begin.");
      return;
    }

    setPlacement(nextPlacement);
  };

  const startPractice = (minutes: SessionLength) => {
    if (!activeChild) return;
    const updatedProfile = {
      ...activeChild,
      preferredSessionLength: minutes
    };
    updateProfile(updatedProfile);
    setSession(planDailySession(updatedProfile, minutes));
    setScreen("practice");
    setFeedback("Tiny rounds, big giggles. Tap the speaker any time.");
  };

  const completeExampleTask = () => {
    if (!activeChild || !session || !currentTask) return;
    const result = advanceAfterAnswer(activeChild, session, currentTask, {
      selectedChoiceId: currentTask.question.correctChoiceId,
      correct: true,
      firstTryCorrect: true,
      hintUsed: false,
      responseTimeMs: 2000,
      suspiciousFast: false
    });
    updateProfile(result.profile);
    setSession(result.session);
    setFeedback(EXAMPLE_COPY.guided);
  };

  const handleSessionAnswer = (choiceId: string) => {
    if (!activeChild || !session || !currentTask) return;
    const responseTimeMs = Date.now() - taskShownAt;
    const correct = choiceId === currentTask.question.correctChoiceId;
    const suspiciousFast = responseTimeMs < currentTask.question.minResponseMs;

    const result = advanceAfterAnswer(activeChild, session, currentTask, {
      selectedChoiceId: choiceId,
      correct,
      firstTryCorrect: correct,
      hintUsed: hintVisible,
      responseTimeMs,
      suspiciousFast
    });

    let nextProfile = result.profile;
    let nextSession = result.session;
    const messageParts = [...result.notes];

    if (correct) {
      speech.speak(suspiciousFast ? "Fast tap. Still nice." : "Great job.");
      if (suspiciousFast) {
        messageParts.unshift("Turbo tap. Correct, but not counted for mastery.");
      } else {
        messageParts.unshift("Great job!");
      }
    } else {
      speech.speak("Nice try. Let's keep learning.");
      messageParts.unshift("Nice try. Let's keep learning.");
    }

    if (nextSession.currentIndex >= nextSession.tasks.length) {
      nextProfile = finalizeSession(nextProfile, nextSession);
      updateProfile(nextProfile);
      setSession(null);
      setScreen("dashboard");
      setFeedback(
        `Session complete: ${nextSession.firstTryCorrectTotal}/${nextSession.completedItems} first-try correct.`
      );
      return;
    }

    updateProfile(nextProfile);
    setSession(nextSession);
    setFeedback(messageParts.join(" "));
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

  const currentQuestion = currentTask?.question ?? currentPlacementProbe?.question ?? null;

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
          left.currentSkill.level - right.currentSkill.level +
          rightStats.firstTryCorrect -
          leftStats.firstTryCorrect
        );
      })
      .slice(0, 3);
  }, [activeChild]);

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
        <h1>FartMaths</h1>
        <button type="button" className="ghost-button" onClick={openParent}>
          Parent
        </button>
      </header>

      {feedback ? <div className="feedback-banner">{feedback}</div> : null}

      {parentGateOpen && (
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
      )}

      {screen === "home" && (
        <section className="home-screen">
          <div className="hero card">
            <MiniBadge text="Silly fun. Serious learning." tone="peach" />
            <h2>Pick a kiddo to start today&apos;s math giggles.</h2>
            <p>
              Two big profiles, no passwords, and offline-ready play on one iPad.
            </p>
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
                    <span>{saved.currentStreak}-day streak</span>
                  </button>
                );
              })}
            </div>

            <div className="shortcut-box">
              <label htmlFor="name-shortcut">Or type a name shortcut</label>
              <div className="shortcut-row">
                <input
                  id="name-shortcut"
                  className="name-input"
                  placeholder="Ély or Ira"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleNameSubmit();
                  }}
                />
                <button type="button" className="primary-button" onClick={handleNameSubmit}>
                  Go
                </button>
              </div>
              <small>Accent-insensitive: Ely, Ély, IRA, ira all work.</small>
            </div>
          </div>
        </section>
      )}

      {screen === "dashboard" && activeChild && (
        <section className="dashboard">
          <div className="dashboard-hero card">
            <div className="dashboard-headline">
              <AvatarArt avatarId={activeChild.avatarId} label={activeChild.displayName} large />
              <div>
                <MiniBadge text={`${activeChild.currentStreak}-day streak`} />
                <h2>{activeChild.displayName}&apos;s Dashboard</h2>
                <p>{STRANDS.length} strands grow separately, so strength in one area can race ahead.</p>
              </div>
            </div>

            <div className="dashboard-actions">
              <ProgressRing value={getOverallProgress(activeChild)} label="overall mastery" />
              <div className="stack-actions">
                <button
                  type="button"
                  className="primary-button jumbo"
                  onClick={() => startPractice(activeChild.preferredSessionLength)}
                >
                  Play Today
                </button>
                <div className="length-row">
                  {SESSION_LENGTHS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className={`chip-button ${minutes === activeChild.preferredSessionLength ? "chip-button-active" : ""}`}
                      onClick={() =>
                        updateProfile({
                          ...activeChild,
                          preferredSessionLength: minutes
                        })
                      }
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary-button" onClick={() => setScreen("rewards")}>
                    My Rewards
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setScreen("progress")}>
                    My Progress
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setShowAvatarPicker((value) => !value)}>
                    Change Avatar
                  </button>
                </div>
              </div>
            </div>

            {showAvatarPicker && (
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
            )}
          </div>

          <div className="dashboard-columns">
            <div className="card">
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

            <div className="card">
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
        </section>
      )}

      {screen === "placement" && activeChild && currentPlacementProbe && (
        <section className="practice-screen">
          <div className="card">
            <MiniBadge text={`Placement ${placement!.probeIndex + 1}/${placement!.probes.length}`} />
            <h2>{activeChild.displayName}&apos;s warm-up check</h2>
            <p>We test each strand separately so the app can start at the right level.</p>
          </div>

          <TaskScreen
            task={{
              skillId: currentPlacementProbe.question.skillId,
              mode: "placement",
              question: currentPlacementProbe.question,
              strandId: currentPlacementProbe.strandId,
              level: currentPlacementProbe.level
            }}
            onAnswer={handlePlacementAnswer}
            onUseHint={() => undefined}
            hintVisible={false}
            onCompleteExample={() => undefined}
            revealExample={false}
            onRevealExample={() => undefined}
            onSpeak={() => speech.speak(currentPlacementProbe.question.speech)}
          />
        </section>
      )}

      {screen === "practice" && currentTask && activeChild && (
        <section className="practice-screen">
          <div className="session-status card">
            <div>
              <MiniBadge text={`${session!.completedItems}/${session!.targetItemCount} done`} />
              <h2>{activeChild.displayName}&apos;s Daily Practice</h2>
            </div>
            <div className="session-stats">
              <span>{session!.durationMinutes} min plan</span>
              <span>{session!.firstTryCorrectTotal} first-try wins</span>
            </div>
          </div>

          <TaskScreen
            task={currentTask}
            onAnswer={handleSessionAnswer}
            onUseHint={() => setHintVisible(true)}
            hintVisible={hintVisible}
            onCompleteExample={completeExampleTask}
            revealExample={revealExample}
            onRevealExample={() => setRevealExample(true)}
            onSpeak={() => speech.speak(currentTask.question.speech)}
          />
        </section>
      )}

      {screen === "rewards" && activeChild && (
        <section className="card">
          <h2>{activeChild.displayName}&apos;s Rewards</h2>
          <p>Funny rewards live here, while the math stays clear and calm.</p>
          <div className="reward-grid">
            {REWARDS.map((reward) => {
              const unlocked = activeChild.unlockedRewards.some((entry) => entry.rewardId === reward.id);
              return (
                <div
                  key={reward.id}
                  className={`reward-card ${unlocked ? "reward-card-unlocked" : ""}`}
                  style={{ "--reward-color": reward.color } as CSSProperties}
                >
                  <strong>{reward.title}</strong>
                  <p>{reward.description}</p>
                  <span>{unlocked ? "Unlocked" : "Locked"}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {screen === "progress" && activeChild && (
        <section className="progress-screen">
          <div className="card">
            <h2>{activeChild.displayName}&apos;s Progress</h2>
            <p>Each strand moves on its own ladder, not in big grade buckets.</p>
          </div>
          <div className="progress-grid">
            {STRANDS.map((strand) => {
              const snapshot = getStrandSnapshot(activeChild, strand);
              return (
                <div key={strand.id} className="card progress-card">
                  <div className="progress-card-top">
                    <strong>{strand.title}</strong>
                    <MiniBadge text={snapshot.readiness} tone="blue" />
                  </div>
                  <p>{strand.description}</p>
                  <div className="level-dots">
                    {strand.levels.map((skill) => {
                      const status = activeChild.skillProgress[skill.id].status;
                      return (
                        <span
                          key={skill.id}
                          className={`level-dot level-dot-${status}`}
                          title={`Level ${skill.level}: ${MASTERY_LABELS[status]}`}
                        />
                      );
                    })}
                  </div>
                  <small>
                    Current: Level {snapshot.strandProgress.currentLevel} - {snapshot.currentSkill.title}
                  </small>
                  <small>Accuracy: {formatPercent(snapshot.accuracy)}</small>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {screen === "parent" && (
        <section className="parent-screen">
          <div className="card">
            <h2>Parent Dashboard</h2>
            <p>Settings, readiness, streaks, and recent sessions for both children.</p>
            <div className="parent-settings">
              <label className="toggle-row">
                <span>Text-to-speech</span>
                <input
                  type="checkbox"
                  checked={persistedState.settings.ttsEnabled}
                  onChange={(event) =>
                    setPersistedState((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        ttsEnabled: event.target.checked
                      }
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
                    setPersistedState((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        ttsRate: Number(event.target.value)
                      }
                    }))
                  }
                />
                <strong>{persistedState.settings.ttsRate.toFixed(2)}x</strong>
              </label>
            </div>
          </div>

          <div className="progress-grid">
            {(Object.keys(persistedState.profiles) as ProfileId[]).map((profileId) => {
              const profile = persistedState.profiles[profileId];
              return (
                <div key={profile.id} className="card parent-card">
                  <div className="parent-card-head">
                    <AvatarArt avatarId={profile.avatarId} label={profile.displayName} />
                    <div>
                      <h3>{profile.displayName}</h3>
                      <p>{profile.currentStreak}-day streak</p>
                      <p>{profile.recentSessions.length} recent sessions</p>
                    </div>
                  </div>
                  <div className="row-actions">
                    {SESSION_LENGTHS.map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        className={`chip-button ${minutes === profile.preferredSessionLength ? "chip-button-active" : ""}`}
                        onClick={() =>
                          updateProfile({
                            ...profile,
                            preferredSessionLength: minutes
                          })
                        }
                      >
                        {minutes} min
                      </button>
                    ))}
                  </div>

                  <div className="parent-strand-list">
                    {STRANDS.map((strand) => {
                      const snapshot = getStrandSnapshot(profile, strand);
                      return (
                        <div key={strand.id} className="parent-strand-row">
                          <strong>{strand.shortTitle}</strong>
                          <span>{snapshot.readiness}</span>
                          <span>Level {snapshot.strandProgress.currentLevel}</span>
                          <span>{MASTERY_LABELS[snapshot.currentProgress.status]}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="secondary-button danger-button"
                    onClick={() => {
                      if (!window.confirm(`Reset all progress for ${profile.displayName}?`)) return;
                      setPersistedState((current) => resetProfile(current, profile.id));
                    }}
                  >
                    Reset Profile
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
