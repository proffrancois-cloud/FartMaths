import { STRAND_ORDER, STRAND_MAP, REWARDS } from "../data/catalog";
import {
  CHECKPOINT_LENGTH,
  CHECKPOINT_PASS_SCORE,
  FAST_WRONG_RESCUE_LIMIT,
  FAST_WRONG_RESCUE_WINDOW,
  GUIDED_SUCCESS_TARGET,
  MAX_SUSPICIOUS_IN_WINDOW,
  NEW_LEVEL_RESCUE_FIRST_TRY_MIN,
  NEW_LEVEL_RESCUE_SAMPLE,
  PLACEMENT_LEVELS,
  REQUIRED_FIRST_TRY_IN_WINDOW,
  RESCUE_MIX,
  REVIEW_MIX,
  SCORED_WINDOW,
  SESSION_ITEM_TARGETS
} from "../data/rules";
import { generateQuestion, getSkill } from "./questions";
import { getSkillLearningScript } from "./learningLoop";
import { computeReadinessLabel, dateKey } from "../lib/storage";
import type {
  ActiveSession,
  ChildProfile,
  PlacementProgress,
  PlacementProbe,
  ProfileId,
  QuestionDefinition,
  SessionLength,
  SessionTask,
  SessionSummary,
  SkillProgress,
  StrandId
} from "../types";

export interface AnswerOutcome {
  selectedChoiceId: string;
  correct: boolean;
  firstTryCorrect: boolean;
  hintUsed: boolean;
  responseTimeMs: number;
  suspiciousFast: boolean;
}

export interface AdvanceResult {
  profile: ChildProfile;
  session: ActiveSession;
  earnedRewardIds: string[];
  notes: string[];
  leveledUpSkillId?: string;
}

const deepClone = <T,>(value: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);

const now = () => new Date().toISOString();

export const getWindowStats = (skillProgress: SkillProgress) => {
  const window = skillProgress.recentScoredResults.slice(-SCORED_WINDOW);
  const firstTryCorrect = window.filter((item) => item.firstTryCorrect).length;
  const suspicious = window.filter((item) => item.suspiciousFast).length;
  const fastWrong = skillProgress.recentScoredResults
    .slice(-FAST_WRONG_RESCUE_WINDOW)
    .filter((item) => item.suspiciousFast && !item.firstTryCorrect).length;

  return {
    total: window.length,
    firstTryCorrect,
    suspicious,
    fastWrong
  };
};

export const isReadyForCheckpoint = (skillProgress: SkillProgress) => {
  const stats = getWindowStats(skillProgress);
  return (
    skillProgress.scoredAttempts >= SCORED_WINDOW &&
    stats.total >= SCORED_WINDOW &&
    stats.firstTryCorrect >= REQUIRED_FIRST_TRY_IN_WINDOW &&
    stats.suspicious <= MAX_SUSPICIOUS_IN_WINDOW
  );
};

const hasPassedCheckpoint = (skillProgress: SkillProgress) =>
  skillProgress.checkpointHistory.some((item) => item.passed);

const updateSkillStatus = (skillProgress: SkillProgress) => {
  if (hasPassedCheckpoint(skillProgress)) {
    skillProgress.status = skillProgress.reviewDue ? "review-needed" : "mastered";
    return;
  }

  const stats = getWindowStats(skillProgress);
  if (!skillProgress.exampleSeen && skillProgress.attempts === 0) {
    skillProgress.status = "not-started";
  } else if (
    skillProgress.scoredAttempts >= 12 &&
    stats.firstTryCorrect >= 10 &&
    stats.suspicious <= 2
  ) {
    skillProgress.status = "almost-there";
  } else {
    skillProgress.status = "learning";
  }
};

const startLevelFromPlacementScore = (score: number) => {
  if (score <= 0) return { level: 1, confidence: 0.35 };
  if (score === 1) return { level: 3, confidence: 0.62 };
  return { level: 5, confidence: 0.82 };
};

const markAsPlacedMastery = (skillProgress: SkillProgress) => {
  skillProgress.exampleSeen = true;
  skillProgress.guidedSuccesses = GUIDED_SUCCESS_TARGET;
  skillProgress.attempts = Math.max(skillProgress.attempts, SCORED_WINDOW);
  skillProgress.firstTryCorrectCount = Math.max(
    skillProgress.firstTryCorrectCount,
    REQUIRED_FIRST_TRY_IN_WINDOW
  );
  skillProgress.scoredAttempts = Math.max(skillProgress.scoredAttempts, SCORED_WINDOW);
  skillProgress.status = "mastered";
  skillProgress.reviewDue = false;
  skillProgress.lastPracticedAt = now();
  skillProgress.recentScoredResults = Array.from({ length: SCORED_WINDOW }, (_, index) => ({
    questionId: `placement-${index}`,
    answeredAt: now(),
    firstTryCorrect: true,
    suspiciousFast: false,
    responseTimeMs: 1800
  }));
  if (!hasPassedCheckpoint(skillProgress)) {
    skillProgress.checkpointHistory.push({
      attemptedAt: now(),
      score: CHECKPOINT_LENGTH,
      passed: true
    });
  }
};

export const buildPlacementProgress = (): PlacementProgress => {
  const probes: PlacementProbe[] = STRAND_ORDER.flatMap((strandId) =>
    PLACEMENT_LEVELS.map((level) => ({
      strandId,
      level,
      question: generateQuestion(getSkill(strandId, level), "placement")
    }))
  );

  return {
    probeIndex: 0,
    probes,
    scoresByStrand: Object.fromEntries(
      STRAND_ORDER.map((strandId) => [strandId, 0])
    ) as Record<StrandId, number>
  };
};

export const applyPlacementResults = (
  profile: ChildProfile,
  scoresByStrand: Record<StrandId, number>
) => {
  const nextProfile = deepClone(profile);
  nextProfile.placementStarted = true;
  nextProfile.placementDone = true;
  nextProfile.lastActiveAt = now();

  STRAND_ORDER.forEach((strandId) => {
    const score = scoresByStrand[strandId] ?? 0;
    const { level, confidence } = startLevelFromPlacementScore(score);
    const strand = STRAND_MAP[strandId];
    const strandProgress = nextProfile.strandProgress[strandId];
    strandProgress.currentLevel = level;
    strandProgress.highestUnlockedLevel = level;
    strandProgress.placementDone = true;
    strandProgress.placementConfidence = confidence;
    strandProgress.readiness = computeReadinessLabel(level, strandId);

    strand.levels.forEach((skill) => {
      const skillProgress = nextProfile.skillProgress[skill.id];
      if (skill.level < level) {
        markAsPlacedMastery(skillProgress);
      } else if (skill.level === level) {
        skillProgress.status = "learning";
        skillProgress.exampleSeen = false;
        skillProgress.guidedSuccesses = 0;
      } else {
        skillProgress.status = "not-started";
      }
    });
  });

  return nextProfile;
};

const scoreUrgency = (profile: ChildProfile, strandId: StrandId) => {
  const strandProgress = profile.strandProgress[strandId];
  const currentSkill = getSkill(strandId, strandProgress.currentLevel);
  const currentProgress = profile.skillProgress[currentSkill.id];
  const stats = getWindowStats(currentProgress);

  let urgency = 10 - strandProgress.currentLevel;
  if (currentProgress.status === "review-needed") urgency += 5;
  if (currentProgress.status === "not-started") urgency += 3;
  if (currentProgress.status === "learning") urgency += 2;
  urgency += Math.max(0, 4 - currentProgress.guidedSuccesses);
  urgency += Math.max(0, 5 - stats.firstTryCorrect);

  return urgency;
};

const needsNewLevelRescue = (profile: ChildProfile, strandId: StrandId) => {
  const strandProgress = profile.strandProgress[strandId];
  const currentSkill = getSkill(strandId, strandProgress.currentLevel);
  const currentProgress = profile.skillProgress[currentSkill.id];
  return (
    currentProgress.scoredAttempts > 0 &&
    currentProgress.scoredAttempts <= NEW_LEVEL_RESCUE_SAMPLE &&
    currentProgress.firstTryCorrectCount < NEW_LEVEL_RESCUE_FIRST_TRY_MIN
  );
};

const weightedSkillId = (profile: ChildProfile, strandId: StrandId) => {
  const strandProgress = profile.strandProgress[strandId];
  const currentSkill = getSkill(strandId, strandProgress.currentLevel);
  const currentProgress = profile.skillProgress[currentSkill.id];

  if (!currentProgress.exampleSeen) {
    return { skillId: currentSkill.id, mode: "example" as const };
  }

  if (currentProgress.guidedSuccesses < GUIDED_SUCCESS_TARGET) {
    return { skillId: currentSkill.id, mode: "practice" as const };
  }

  const previousSkill =
    strandProgress.currentLevel > 1
      ? getSkill(strandId, strandProgress.currentLevel - 1)
      : undefined;
  const olderWeakSkills = STRAND_MAP[strandId].levels
    .filter((skill) => skill.level < strandProgress.currentLevel - 1)
    .filter((skill) => profile.skillProgress[skill.id].reviewDue);

  const roll = Math.random();
  if (needsNewLevelRescue(profile, strandId)) {
    if (previousSkill && roll < RESCUE_MIX.previous) {
      return { skillId: previousSkill.id, mode: "check" as const };
    }
    if (roll < RESCUE_MIX.previous + RESCUE_MIX.current) {
      return { skillId: currentSkill.id, mode: "check" as const };
    }
    return { skillId: currentSkill.id, mode: "practice" as const };
  }

  if (roll < REVIEW_MIX.current) {
    return { skillId: currentSkill.id, mode: "check" as const };
  }
  if (previousSkill && roll < REVIEW_MIX.current + REVIEW_MIX.previous) {
    return { skillId: previousSkill.id, mode: "check" as const };
  }
  if (olderWeakSkills.length > 0) {
    const older = olderWeakSkills[randIndex(olderWeakSkills.length)];
    return { skillId: older.id, mode: "check" as const };
  }

  return { skillId: currentSkill.id, mode: "check" as const };
};

const randIndex = (length: number) => Math.floor(Math.random() * length);

const makeTask = (profile: ChildProfile, strandId: StrandId): SessionTask => {
  const pick = weightedSkillId(profile, strandId);
  const skill = STRAND_MAP[strandId].levels.find((item) => item.id === pick.skillId)!;
  return {
    skillId: skill.id,
    mode: pick.mode,
    strandId,
    level: skill.level,
    question: generateQuestion(skill, pick.mode)
  };
};

const makeTaskForSkill = (
  skillId: string,
  strandId: StrandId,
  mode: SessionTask["mode"],
  focusLabel?: string
): SessionTask => {
  const skill = STRAND_MAP[strandId].levels.find((item) => item.id === skillId)!;
  return {
    skillId: skill.id,
    mode,
    strandId,
    level: skill.level,
    focusLabel,
    question: generateQuestion(skill, mode)
  };
};

const getCheckpointCandidate = (profile: ChildProfile, allowedStrands = STRAND_ORDER) => {
  const sorted = [...allowedStrands].sort(
    (left, right) => scoreUrgency(profile, right) - scoreUrgency(profile, left)
  );

  for (const strandId of sorted) {
    const strandProgress = profile.strandProgress[strandId];
    const skill = getSkill(strandId, strandProgress.currentLevel);
    const progress = profile.skillProgress[skill.id];
    if (isReadyForCheckpoint(progress) && !hasPassedCheckpoint(progress)) {
      return { strandId, skillId: skill.id, level: skill.level };
    }
  }

  return undefined;
};

export const planDailySession = (
  profile: ChildProfile,
  durationMinutes: SessionLength,
  preferredStrandId?: StrandId
): ActiveSession => {
  const ranked = [...STRAND_ORDER].sort(
    (left, right) => scoreUrgency(profile, right) - scoreUrgency(profile, left)
  );
  const focusStrands = preferredStrandId ? [preferredStrandId] : ranked;
  const desiredItemCount = SESSION_ITEM_TARGETS[durationMinutes];
  const checkpointCandidate = getCheckpointCandidate(profile, focusStrands);
  const tasks: SessionTask[] = [];
  const lessonQueuedSkills = new Set<string>();
  const sessionLabel = preferredStrandId
    ? STRAND_MAP[preferredStrandId].shortTitle
    : "Whole Curriculum";

  if (checkpointCandidate) {
    for (let index = 0; index < CHECKPOINT_LENGTH; index += 1) {
      const skill = getSkill(checkpointCandidate.strandId, checkpointCandidate.level);
      tasks.push({
        skillId: skill.id,
        strandId: checkpointCandidate.strandId,
        level: checkpointCandidate.level,
        mode: "check",
        isCheckpoint: true,
        focusLabel: sessionLabel,
        question: generateQuestion(skill, "check")
      });
    }
  }

  while (tasks.length < desiredItemCount) {
    const strandId = focusStrands[tasks.length % focusStrands.length] ?? STRAND_ORDER[0];
    const nextTask = makeTask(profile, strandId);

    if (nextTask.mode === "example" && !lessonQueuedSkills.has(nextTask.skillId)) {
      lessonQueuedSkills.add(nextTask.skillId);
      tasks.push(makeTaskForSkill(nextTask.skillId, strandId, "example", sessionLabel));
      for (let index = 0; index < 3; index += 1) {
        tasks.push(makeTaskForSkill(nextTask.skillId, strandId, "practice", sessionLabel));
      }
      continue;
    }

    tasks.push({
      ...nextTask,
      mode: nextTask.mode === "example" ? "practice" : nextTask.mode,
      focusLabel: sessionLabel
    });
  }

  return {
    id: `session-${Date.now()}`,
    childId: profile.id,
    durationMinutes,
    startedAt: now(),
    targetItemCount: tasks.length,
    currentIndex: 0,
    completedItems: 0,
    firstTryCorrectTotal: 0,
    suspiciousFastCount: 0,
    masteredSkills: [],
    focusStrands,
    tasks,
    checkpointSkillId: checkpointCandidate?.skillId,
    checkpointProgress: {},
    supportModeTurnsLeft: 0,
    notes: []
  };
};

const maybeLevelUp = (
  profile: ChildProfile,
  strandId: StrandId,
  skillId: string
) => {
  const strandProgress = profile.strandProgress[strandId];
  const currentSkill = getSkill(strandId, strandProgress.currentLevel);
  if (currentSkill.id !== skillId) {
    return undefined;
  }

  const currentProgress = profile.skillProgress[skillId];
  currentProgress.status = "mastered";
  currentProgress.reviewDue = true;

  if (strandProgress.currentLevel < STRAND_MAP[strandId].levels.length) {
    strandProgress.currentLevel += 1;
    strandProgress.highestUnlockedLevel = Math.max(
      strandProgress.highestUnlockedLevel,
      strandProgress.currentLevel
    );
    strandProgress.readiness = computeReadinessLabel(strandProgress.currentLevel, strandId);
    const nextSkill = getSkill(strandId, strandProgress.currentLevel);
    const nextProgress = profile.skillProgress[nextSkill.id];
    nextProgress.status = "learning";
    nextProgress.reviewDue = false;
  }

  return skillId;
};

const unlockReward = (profile: ChildProfile, rewardId: string) => {
  if (profile.unlockedRewards.some((reward) => reward.rewardId === rewardId)) {
    return false;
  }
  if (!REWARDS.some((reward) => reward.id === rewardId)) {
    return false;
  }
  profile.unlockedRewards.push({
    rewardId,
    unlockedAt: now()
  });
  return true;
};

export const advanceAfterAnswer = (
  profile: ChildProfile,
  session: ActiveSession,
  task: SessionTask,
  outcome: AnswerOutcome
): AdvanceResult => {
  const nextProfile = deepClone(profile);
  const nextSession = deepClone(session);
  const skillProgress = nextProfile.skillProgress[task.skillId];
  const strandProgress = nextProfile.strandProgress[task.strandId];
  const skill = getSkill(task.strandId, task.level);
  const learningScript = getSkillLearningScript(skill);
  const notes: string[] = [];
  const earnedRewardIds: string[] = [];
  const masteryEligibleCorrect =
    outcome.correct &&
    outcome.firstTryCorrect &&
    !outcome.hintUsed &&
    !outcome.suspiciousFast;

  skillProgress.attempts += 1;
  skillProgress.lastPracticedAt = now();
  nextProfile.lastActiveAt = now();

  nextSession.currentIndex += 1;
  nextSession.completedItems += 1;
  if (masteryEligibleCorrect) nextSession.firstTryCorrectTotal += 1;
  if (outcome.suspiciousFast) nextSession.suspiciousFastCount += 1;

  if (task.mode === "example") {
    skillProgress.exampleSeen = true;
    skillProgress.status = "learning";
  } else if (task.mode === "practice") {
    if (outcome.hintUsed) skillProgress.hintsUsed += 1;
    if (outcome.correct) {
      skillProgress.guidedSuccesses = Math.min(
        GUIDED_SUCCESS_TARGET,
        skillProgress.guidedSuccesses + 1
      );
    } else {
      skillProgress.guidedSuccesses = Math.max(0, skillProgress.guidedSuccesses - 1);
    }
  } else {
    skillProgress.scoredAttempts += 1;
    if (outcome.hintUsed) skillProgress.hintsUsed += 1;
    if (outcome.suspiciousFast) skillProgress.suspiciousFastAnswers += 1;
    if (masteryEligibleCorrect) {
      skillProgress.firstTryCorrectCount += 1;
    }

    skillProgress.recentScoredResults.push({
      questionId: task.question.id,
      answeredAt: now(),
      firstTryCorrect: masteryEligibleCorrect,
      suspiciousFast: outcome.suspiciousFast,
      responseTimeMs: outcome.responseTimeMs
    });

    skillProgress.recentScoredResults = skillProgress.recentScoredResults.slice(
      -SCORED_WINDOW
    );
  }

  updateSkillStatus(skillProgress);

  const stats = getWindowStats(skillProgress);
  if (stats.fastWrong >= FAST_WRONG_RESCUE_LIMIT) {
    nextSession.supportModeTurnsLeft = 3;
    notes.push(`Careful-look rescue: ${learningScript.rescue.explanation}`);
  } else if (!outcome.correct && task.mode !== "example") {
    nextSession.supportModeTurnsLeft = Math.max(nextSession.supportModeTurnsLeft, 2);
    notes.push(`Rescue: ${learningScript.rescue.explanation}`);
  } else if (nextSession.supportModeTurnsLeft > 0) {
    nextSession.supportModeTurnsLeft -= 1;
  }

  let leveledUpSkillId: string | undefined;

  if (task.isCheckpoint) {
    const current = nextSession.checkpointProgress[task.skillId] ?? {
      completed: 0,
      correct: 0
    };
    current.completed += 1;
    if (masteryEligibleCorrect) {
      current.correct += 1;
    }
    nextSession.checkpointProgress[task.skillId] = current;

    if (current.completed >= CHECKPOINT_LENGTH) {
      const passed = current.correct >= CHECKPOINT_PASS_SCORE;
      skillProgress.checkpointHistory.push({
        attemptedAt: now(),
        score: current.correct,
        passed
      });

      if (passed) {
        leveledUpSkillId = maybeLevelUp(nextProfile, task.strandId, task.skillId);
        if (leveledUpSkillId) {
          nextSession.masteredSkills.push(task.skillId);
          notes.push("Checkpoint passed. New level unlocked.");
          if (unlockReward(nextProfile, "checkpoint-pro")) earnedRewardIds.push("checkpoint-pro");
          if (unlockReward(nextProfile, "mastery-1")) earnedRewardIds.push("mastery-1");
        }
      } else {
        skillProgress.guidedSuccesses = 1;
        skillProgress.status = "learning";
        notes.push("Checkpoint missed. More guided practice will help.");
      }
    }
  } else if (isReadyForCheckpoint(skillProgress) && !hasPassedCheckpoint(skillProgress)) {
    notes.push("Checkpoint ready soon.");
  }

  strandProgress.readiness = computeReadinessLabel(strandProgress.highestUnlockedLevel, task.strandId);
  if (
    (strandProgress.readiness === "Grade-2 Ready" || strandProgress.readiness === "Beyond") &&
    unlockReward(nextProfile, "potty-professor")
  ) {
    earnedRewardIds.push("potty-professor");
  }

  return {
    profile: nextProfile,
    session: nextSession,
    earnedRewardIds,
    notes,
    leveledUpSkillId
  };
};

export const finalizeSession = (
  profile: ChildProfile,
  session: ActiveSession
): ChildProfile => {
  const nextProfile = deepClone(profile);
  const today = dateKey();
  const previous =
    nextProfile.recentSessions.length > 0
      ? dateKey(nextProfile.recentSessions[0].startedAt)
      : undefined;
  const yesterday = dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (previous === today) {
    // no-op
  } else if (previous === yesterday) {
    nextProfile.currentStreak += 1;
  } else {
    nextProfile.currentStreak = 1;
  }

  nextProfile.lastActiveAt = now();

  const summary: SessionSummary = {
    id: session.id,
    childId: nextProfile.id,
    startedAt: session.startedAt,
    durationMinutes: session.durationMinutes,
    itemsCompleted: session.completedItems,
    firstTryCorrect: session.firstTryCorrectTotal,
    masteredSkills: session.masteredSkills,
    notes: session.notes
  };

  nextProfile.recentSessions = [summary, ...nextProfile.recentSessions].slice(0, 20);

  if (nextProfile.recentSessions.length >= 1) {
    unlockReward(nextProfile, "first-puff");
  }
  if (nextProfile.currentStreak >= 3) {
    unlockReward(nextProfile, "streak-3");
  }
  if (nextProfile.currentStreak >= 7) {
    unlockReward(nextProfile, "streak-7");
  }
  if (session.suspiciousFastCount === 0) {
    unlockReward(nextProfile, "careful-clicker");
  }
  if (session.masteredSkills.some((skillId) => nextProfile.skillProgress[skillId].reviewDue)) {
    unlockReward(nextProfile, "review-ranger");
  }

  return nextProfile;
};
