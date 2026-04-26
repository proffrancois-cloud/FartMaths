import { STRANDS, REWARDS } from "./catalog";
import {
  UX_PED_EXERCISE_TYPES,
  UX_PED_FEEDBACK_TYPES,
  UX_PED_LEARNING_PHASES,
  UX_PED_LESSON_MODELS,
  UX_PED_PROFILES,
  UX_PED_RESCUE_MOVES,
  UX_PED_VISUAL_MODELS
} from "./pedagogicalUx";
import { SKILL_PEDAGOGICAL_UX_BY_ID } from "./pedagogicalUxMapping";
import { getPedagogicalUxCoverageReport } from "./pedagogicalUxAudit";
import {
  createQuestionGenerationPlan,
  validateGeneratedQuestion,
  type QuestionGenerationPlan
} from "../engine/questionPlan";
import { generateQuestion } from "../engine/questions";
import { getSkillLearningScript, buildPedagogicalFeedback } from "../engine/learningLoop";
import {
  auditPedagogicalUxLearningLoop,
  summarizePedagogicalUxLearningLoopAudit
} from "../engine/learningLoopAudit";
import { advanceAfterAnswer } from "../engine/progression";
import { createDefaultState, computeReadinessLabelForSkill } from "../lib/storage";
import type {
  ActiveSession,
  ActivityType,
  ChildProfile,
  QuestionDefinition,
  SessionTask,
  SkillDefinition,
  SkillPedagogicalUxMapping,
  StrandId,
  TeachingMode
} from "../types";

export type UxPedQaSeverity = "blocker" | "major" | "minor" | "advisory";

export type UxPedQaArea =
  | "taxonomy"
  | "skill-mapping"
  | "question-generation"
  | "learning-loop"
  | "feedback"
  | "rescue"
  | "mastery"
  | "copy"
  | "common-core-boundary"
  | "parent-trust"
  | "accessibility"
  | "fallback"
  | "regression"
  | "build-or-types";

export interface UxPedQaIssue {
  severity: UxPedQaSeverity;
  area: UxPedQaArea;
  skillId?: string;
  strandId?: string;
  level?: number;
  profileId?: string;
  message: string;
  expected?: string;
  actual?: string;
  recommendedFix: string;
}

export interface UxPedQaSummary {
  taxonomy: {
    profilesAudited: number;
    invalidTaxonomyValues: number;
    duplicateProfileIds: number;
    missingRequiredFields: number;
  };
  skillMapping: {
    skillsAudited: number;
    skillsWithValidProfile: number;
    missingProfiles: number;
    invalidProfileReferences: number;
    strandLevelFallbackOnly: number;
    sourceLabelDifferenceCount: number;
  };
  generatedQuestions: {
    skillsSampled: number;
    modesSampled: TeachingMode[];
    totalSamples: number;
    invalidGeneratedQuestions: number;
    activityProfileMismatches: number;
    missingRequiredVisualData: number;
    invalidCorrectChoiceIds: number;
  };
  learningLoop: {
    skillsAudited: number;
    resolvedLearningScripts: number;
    missingLessonScripts: number;
    missingFeedback: number;
    missingRescue: number;
    missingMasteryDescriptor: number;
    missingNextStepAdvice: number;
  };
  feedbackRescueMastery: {
    feedbackIssueCount: number;
    rescueIssueCount: number;
    masterySafetyIssueCount: number;
  };
  copy: {
    childFacingIssueCount: number;
    accessibilityIssueCount: number;
  };
  parentTrust: {
    issueCount: number;
  };
  commonCoreBoundary: {
    issueCount: number;
  };
}

export interface UxPedQaReport {
  generatedAt: string;
  totalSkills: number;
  totalProfiles: number;
  totalQuestionSamples: number;
  totalIssues: number;
  blockerCount: number;
  majorCount: number;
  minorCount: number;
  advisoryCount: number;
  issues: UxPedQaIssue[];
  summary: UxPedQaSummary;
  lockVerdict:
    | "LOCKED"
    | "LOCKED_WITH_MINOR_NOTES"
    | "NOT_LOCKED_BLOCKERS_REMAIN"
    | "NOT_LOCKED_MAJOR_ISSUES_REMAIN";
}

interface GeneratedQuestionAuditSample {
  skill: SkillDefinition;
  mode: TeachingMode;
  plan: QuestionGenerationPlan;
  question: QuestionDefinition;
  issues: UxPedQaIssue[];
}

const QUESTION_QA_MODES = ["example", "practice", "check"] as const satisfies readonly TeachingMode[];

const allSkills = () => STRANDS.flatMap((strand) => strand.levels);

const issue = (
  severity: UxPedQaSeverity,
  area: UxPedQaArea,
  message: string,
  recommendedFix: string,
  context: Partial<UxPedQaIssue> = {}
): UxPedQaIssue => ({
  severity,
  area,
  message,
  recommendedFix,
  ...context
});

const includes = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (values as readonly string[]).includes(value);

const isPresent = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const profileEntries = () => {
  const starterProfiles = Object.entries(UX_PED_PROFILES).map(([profileId, profile]) => ({
    profileId,
    source: "starter-profile" as const,
    primaryExerciseType: profile.primaryExerciseType,
    secondaryExerciseType: profile.secondaryExerciseType,
    lessonModel: profile.lessonModel,
    visualModel: profile.visualModel,
    feedbackType: profile.feedbackType,
    rescueMove: profile.rescueMove,
    learningGoal: profile.learningGoalTemplate,
    lessonFocus: profile.lessonFocus,
    senseiHelp: profile.senseiHelp,
    commonMistakes: profile.commonMistakes,
    masteryCheck: profile.independentPracticeExpectation
  }));

  const skillProfiles = Object.entries(SKILL_PEDAGOGICAL_UX_BY_ID)
    .filter((entry): entry is [string, SkillPedagogicalUxMapping] => Boolean(entry[1]))
    .map(([skillId, profile]) => ({
      profileId: profile.profileId,
      skillId,
      source: "skill-mapping" as const,
      primaryExerciseType: profile.primaryExerciseType,
      secondaryExerciseType: profile.secondaryExerciseType,
      lessonModel: profile.lessonModel,
      visualModel: profile.visualModel,
      feedbackType: profile.feedbackType,
      rescueMove: profile.rescueMove,
      learningGoal: profile.learningGoal,
      lessonFocus: profile.lessonFocus,
      senseiHelp: profile.implementationNote ?? profile.lessonFocus,
      commonMistakes: profile.commonMistakes,
      masteryCheck: profile.masteryCheck
    }));

  return [...starterProfiles, ...skillProfiles];
};

const getDuplicateValues = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
};

const textContainsUnsafeTone = (text: string) =>
  /\b(dick|fuck|ass|pussy)\b/i.test(text);

const hasCorrectChoice = (question: QuestionDefinition) => {
  if (question.choices.some((choice) => choice.id === question.correctChoiceId)) {
    return true;
  }
  if (question.countTap) {
    return question.correctChoiceId === `count-${question.countTap.total}`;
  }
  if (question.tenFrame) {
    return question.correctChoiceId === `fill-${question.tenFrame.target}`;
  }
  if (question.buildNumber) {
    return question.correctChoiceId === `choice-${question.buildNumber.target}`;
  }
  if (question.drag?.targets.some((target) => target.id === question.correctChoiceId)) {
    return true;
  }
  return false;
};

const activityVisualIssue = (
  question: QuestionDefinition,
  plan: QuestionGenerationPlan
): UxPedQaIssue | undefined => {
  const context = {
    skillId: plan.skill.id,
    strandId: plan.skill.strandId,
    level: plan.skill.level,
    profileId: plan.uxProfileId
  };
  const blocker = (message: string, expected: string, actual?: string) =>
    issue("blocker", "question-generation", message, "Fix the generator output for this activity type.", {
      ...context,
      expected,
      actual
    });

  switch (question.type) {
    case "count-and-tap":
      if (!question.countTap || question.countTap.total < 1) {
        return blocker("Count-and-tap question is missing countTap data.", "countTap with positive total");
      }
      break;
    case "drag-to-match":
      if (!question.drag?.targets.length) {
        return blocker("Drag question is missing clear drag targets.", "drag targets");
      }
      break;
    case "choose-the-answer":
      if (question.choices.length < 2) {
        return blocker("Choice question has too few choices.", "at least two choices", String(question.choices.length));
      }
      break;
    case "compare-two-groups":
      if ((question.groups?.length ?? 0) < 2) {
        return blocker("Compare question is missing two comparable groups.", "two visual groups");
      }
      break;
    case "number-line-tap":
      if (!question.numberLine) {
        return blocker("Number-line question is missing numberLine data.", "numberLine data");
      }
      break;
    case "fill-ten-frame":
      if (!question.tenFrame) {
        return blocker("Ten-frame question is missing tenFrame data.", "tenFrame data");
      }
      break;
    case "build-a-number":
      if (!question.buildNumber) {
        return blocker("Build-a-number question is missing buildNumber data.", "buildNumber data");
      }
      break;
    case "shape-sort":
      if (!question.drag && !question.choices.some((choice) => choice.renderKind === "shape" || choice.shape)) {
        return blocker("Shape question is missing shape data.", "shape choices or drag model");
      }
      break;
    case "graph-reading":
      if (!question.graph?.bars.length) {
        return blocker("Graph question is missing graph bars.", "graph bars");
      }
      break;
    case "clock-choice":
      if (!question.clockChoices || question.clockChoices.length < 2) {
        return blocker("Clock question is missing clock choices.", "at least two clock choices");
      }
      break;
    case "odd-even-pairing":
      if (!question.drag && !question.groups?.length) {
        return blocker("Odd/even question is missing pairing data.", "drag or visual group data");
      }
      break;
    case "array-counting":
      if (!question.arrayData || question.arrayData.target !== question.arrayData.rows * question.arrayData.columns) {
        return blocker("Array question has invalid array data.", "rows x columns equals target");
      }
      break;
    case "coin-counting": {
      const total = question.coins?.reduce((sum, coin) => sum + coin.value, 0) ?? 0;
      if (!question.coins?.length || total <= 0) {
        return blocker("Coin question is missing coin data.", "coin visuals with positive value");
      }
      break;
    }
    case "story-scene":
      if (!question.story && !question.groups?.length) {
        return blocker("Story-scene question is missing story or model data.", "story or visual groups");
      }
      break;
  }

  return undefined;
};

const collectGeneratedQuestionSamples = (
  modes: readonly TeachingMode[] = QUESTION_QA_MODES
): GeneratedQuestionAuditSample[] =>
  allSkills().flatMap((skill) =>
    modes.map((mode) => {
      const plan = createQuestionGenerationPlan(skill, mode);
      const question = generateQuestion(skill, mode);
      const validationIssues = validateGeneratedQuestion(question, plan).map((validationIssue) =>
        issue(
          validationIssue.severity === "error" ? "blocker" : "minor",
          validationIssue.code === "unsafe-fallback-used" ? "fallback" : "question-generation",
          validationIssue.message,
          validationIssue.severity === "error"
            ? "Fix the generator/profile mismatch before lock."
            : "Review and document or tighten the generated question.",
          {
            skillId: skill.id,
            strandId: skill.strandId,
            level: skill.level,
            profileId: plan.uxProfileId
          }
        )
      );
      const visualIssue = activityVisualIssue(question, plan);
      const correctChoiceIssue = !hasCorrectChoice(question)
        ? issue("blocker", "question-generation", "correctChoiceId is not valid for this activity.", "Fix the generated correctChoiceId.", {
            skillId: skill.id,
            strandId: skill.strandId,
            level: skill.level,
            profileId: plan.uxProfileId,
            expected: "correctChoiceId matches a choice or countTap total",
            actual: question.correctChoiceId
          })
        : undefined;

      return {
        skill,
        mode,
        plan,
        question,
        issues: [
          ...validationIssues,
          ...(visualIssue ? [visualIssue] : []),
          ...(correctChoiceIssue ? [correctChoiceIssue] : [])
        ]
      };
    })
  );

export const auditTaxonomy = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];
  const profiles = profileEntries();
  const duplicateProfileIds = getDuplicateValues(profiles.map((profile) => profile.profileId));
  const requiredLearningPhases = [
    "lesson",
    "worked-example",
    "guided-practice",
    "independent-practice",
    "feedback",
    "rescue",
    "mastery-check",
    "review",
    "next-step"
  ];

  duplicateProfileIds.forEach((profileId) => {
    issues.push(issue("blocker", "taxonomy", "Duplicate UX-Ped profile ID.", "Make profile IDs unique.", { profileId }));
  });

  requiredLearningPhases.forEach((phase) => {
    if (!UX_PED_LEARNING_PHASES.includes(phase as (typeof UX_PED_LEARNING_PHASES)[number])) {
      issues.push(
        issue("blocker", "taxonomy", `Missing learning phase ${phase}.`, "Restore the required Pass 4/5 learning phase.", {
          expected: requiredLearningPhases.join(", "),
          actual: UX_PED_LEARNING_PHASES.join(", ")
        })
      );
    }
  });

  profiles.forEach((profile) => {
    const context = {
      skillId: "skillId" in profile ? profile.skillId : undefined,
      profileId: profile.profileId
    };
    const requiredFields: Array<[string, unknown]> = [
      ["profileId", profile.profileId],
      ["learningGoal", profile.learningGoal],
      ["lessonFocus", profile.lessonFocus],
      ["senseiHelp", profile.senseiHelp],
      ["masteryCheck", profile.masteryCheck]
    ];

    requiredFields.forEach(([field, value]) => {
      if (!isPresent(value)) {
        issues.push(
          issue("blocker", "taxonomy", `Profile is missing ${field}.`, "Restore the required UX-Ped profile field.", context)
        );
      }
    });

    if (!profile.commonMistakes.length) {
      issues.push(issue("blocker", "taxonomy", "Profile has no common mistakes.", "Add at least one skill-specific common mistake.", context));
    }
    if (!includes(UX_PED_EXERCISE_TYPES, profile.primaryExerciseType)) {
      issues.push(issue("blocker", "taxonomy", "Invalid primary exercise type.", "Use a supported UX-Ped exercise type.", context));
    }
    if (profile.secondaryExerciseType && !includes(UX_PED_EXERCISE_TYPES, profile.secondaryExerciseType)) {
      issues.push(issue("blocker", "taxonomy", "Invalid secondary exercise type.", "Use a supported UX-Ped exercise type.", context));
    }
    if (!includes(UX_PED_LESSON_MODELS, profile.lessonModel)) {
      issues.push(issue("blocker", "taxonomy", "Invalid lesson model.", "Use a supported lesson model.", context));
    }
    if (!includes(UX_PED_VISUAL_MODELS, profile.visualModel)) {
      issues.push(issue("blocker", "taxonomy", "Invalid visual model.", "Use a supported visual model.", context));
    }
    if (!includes(UX_PED_FEEDBACK_TYPES, profile.feedbackType)) {
      issues.push(issue("blocker", "taxonomy", "Invalid feedback type.", "Use a supported feedback type.", context));
    }
    if (!includes(UX_PED_RESCUE_MOVES, profile.rescueMove)) {
      issues.push(issue("blocker", "taxonomy", "Invalid rescue move.", "Use a supported rescue move.", context));
    }
  });

  return issues;
};

export const auditSkillMappings = (): UxPedQaIssue[] => {
  const coverage = getPedagogicalUxCoverageReport();
  const issues: UxPedQaIssue[] = [];

  coverage.rows.forEach((row) => {
    if (row.status === "missing") {
      issues.push(issue("blocker", "skill-mapping", "Skill has no UX-Ped profile.", "Add a skill-level UX-Ped mapping.", row));
    }
    if (row.status === "invalid") {
      issues.push(
        issue("blocker", "skill-mapping", row.issues.join(" "), "Fix the invalid profile reference or taxonomy value.", row)
      );
    }
  });

  coverage.duplicateProfileIds.forEach((profileId) => {
    issues.push(issue("blocker", "skill-mapping", "Duplicate profile ID in skill mappings.", "Make each skill mapping profile ID unique.", { profileId }));
  });

  coverage.orphanedMappingIds.forEach((skillId) => {
    issues.push(issue("blocker", "skill-mapping", "Mapping exists for a missing skill.", "Remove or retarget the orphaned mapping.", { skillId }));
  });

  allSkills().forEach((skill) => {
    const profile = skill.pedagogicalUx;
    if (!profile) return;
    const combinedProfileText = `${profile.learningGoal} ${profile.sourceSkillLabel ?? ""}`.toLowerCase();
    const meaningfulTokens = skill.summary
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !["with", "from", "that", "this", "using", "level"].includes(token));
    if (meaningfulTokens.length > 0 && !meaningfulTokens.some((token) => combinedProfileText.includes(token))) {
      issues.push(
        issue(
          "major",
          "skill-mapping",
          "Skill summary and profile learning goal appear misaligned.",
          "Review the skill-level mapping and adjust the learning goal or profile.",
          {
            skillId: skill.id,
            strandId: skill.strandId,
            level: skill.level,
            profileId: profile.profileId,
            expected: skill.summary,
            actual: profile.learningGoal
          }
        )
      );
    }
  });

  return issues;
};

export const auditGeneratedQuestions = (): UxPedQaIssue[] =>
  collectGeneratedQuestionSamples().flatMap((sample) => sample.issues);

export const auditLearningLoopConsistency = (): UxPedQaIssue[] => {
  const rows = auditPedagogicalUxLearningLoop();
  const issues: UxPedQaIssue[] = [];

  rows.forEach((row) => {
    row.warnings.forEach((warning) => {
      issues.push(
        issue("blocker", "learning-loop", warning, "Resolve the missing learning-loop descriptor.", {
          skillId: row.skillId,
          strandId: row.strandId,
          level: row.level,
          profileId: row.profileId
        })
      );
    });
  });

  allSkills().forEach((skill) => {
    const script = getSkillLearningScript(skill);
    const notCountedIf = script.masteryCheck.notCountedIf.join(" ").toLowerCase();
    ["hint", "rescue", "mistake", "fast"].forEach((requiredRule) => {
      if (!notCountedIf.includes(requiredRule)) {
        issues.push(
          issue("blocker", "learning-loop", `Mastery descriptor is missing ${requiredRule} exclusion.`, "Restore mastery safety exclusions.", {
            skillId: skill.id,
            strandId: skill.strandId,
            level: skill.level,
            profileId: skill.pedagogicalUxProfileId
          })
        );
      }
    });
  });

  return issues;
};

export const auditFeedbackAndRescue = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];

  allSkills().forEach((skill) => {
    const script = getSkillLearningScript(skill);
    const question = generateQuestion(skill, "check");
    const feedbackSamples = [
      buildPedagogicalFeedback({ question, script, correct: true, suspiciousFast: false, hintUsed: false, firstTry: true }),
      buildPedagogicalFeedback({ question, script, correct: true, suspiciousFast: false, hintUsed: true, firstTry: true }),
      buildPedagogicalFeedback({ question, script, correct: false, suspiciousFast: false, hintUsed: false, firstTry: true }),
      buildPedagogicalFeedback({ question, script, correct: true, suspiciousFast: true, hintUsed: false, firstTry: true })
    ];

    feedbackSamples.forEach((feedbackSample) => {
      const combined = `${feedbackSample.headline} ${feedbackSample.explanation} ${feedbackSample.nextAction ?? ""}`;
      if (textContainsUnsafeTone(combined)) {
        issues.push(
          issue("blocker", "feedback", "Feedback contains unsafe or shaming language.", "Rewrite the feedback as warm teaching guidance.", {
            skillId: skill.id,
            strandId: skill.strandId,
            level: skill.level,
            profileId: skill.pedagogicalUxProfileId,
            actual: combined
          })
        );
      }
      if (!feedbackSample.explanation.includes(question.explanation.text)) {
        issues.push(
          issue("blocker", "feedback", "Feedback explanation is detached from the generated math explanation.", "Include the generated math explanation in feedback.", {
            skillId: skill.id,
            strandId: skill.strandId,
            level: skill.level,
            profileId: skill.pedagogicalUxProfileId
          })
        );
      }
    });

    if (!script.rescue.explanation || /try harder|guess/i.test(script.rescue.explanation)) {
      issues.push(
        issue("major", "rescue", "Rescue is generic instead of simplifying the task.", "Tie the rescue to a concrete simplification.", {
          skillId: skill.id,
          strandId: skill.strandId,
          level: skill.level,
          profileId: skill.pedagogicalUxProfileId
        })
      );
    }
  });

  return issues;
};

const makeAuditSession = (profile: ChildProfile, task: SessionTask): ActiveSession => ({
  id: "qa-session",
  childId: profile.id,
  durationMinutes: profile.preferredSessionLength,
  startedAt: "2026-04-25T00:00:00.000Z",
  targetItemCount: 1,
  currentIndex: 0,
  completedItems: 0,
  firstTryCorrectTotal: 0,
  suspiciousFastCount: 0,
  masteredSkills: [],
  focusStrands: [task.strandId],
  tasks: [task],
  checkpointSkillId: task.isCheckpoint ? task.skillId : undefined,
  checkpointProgress: {},
  supportModeTurnsLeft: 0,
  notes: []
});

const makeAuditTask = (skill: SkillDefinition, isCheckpoint = false): SessionTask => ({
  skillId: skill.id,
  strandId: skill.strandId,
  level: skill.level,
  mode: "check",
  isCheckpoint,
  question: generateQuestion(skill, "check")
});

export const auditMasterySafety = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];
  const profile = createDefaultState().profiles.ely;
  const skill = allSkills()[0];
  const task = makeAuditTask(skill);
  const unsafeScoredOutcomes = [
    { label: "hinted", correct: true, firstTryCorrect: true, hintUsed: true, suspiciousFast: false },
    { label: "second-try", correct: true, firstTryCorrect: false, hintUsed: false, suspiciousFast: false },
    { label: "suspicious-fast", correct: true, firstTryCorrect: true, hintUsed: false, suspiciousFast: true }
  ];

  unsafeScoredOutcomes.forEach((outcome) => {
    const result = advanceAfterAnswer(profile, makeAuditSession(profile, task), task, {
      ...outcome,
      selectedChoiceId: task.question.correctChoiceId,
      responseTimeMs: outcome.suspiciousFast ? 50 : 2500
    });
    const progress = result.profile.skillProgress[skill.id];
    if (progress.firstTryCorrectCount > 0 || result.session.firstTryCorrectTotal > 0) {
      issues.push(
        issue("blocker", "mastery", `Mastery counted a ${outcome.label} scored response.`, "Keep mastery eligibility limited to independent first-try non-fast success.", {
          skillId: skill.id,
          strandId: skill.strandId,
          level: skill.level
        })
      );
    }
  });

  const checkpointTask = makeAuditTask(skill, true);
  unsafeScoredOutcomes.forEach((outcome) => {
    const result = advanceAfterAnswer(profile, makeAuditSession(profile, checkpointTask), checkpointTask, {
      ...outcome,
      selectedChoiceId: checkpointTask.question.correctChoiceId,
      responseTimeMs: outcome.suspiciousFast ? 50 : 2500
    });
    const checkpointCorrect = result.session.checkpointProgress[skill.id]?.correct ?? 0;
    if (checkpointCorrect > 0) {
      issues.push(
        issue("blocker", "mastery", `Checkpoint counted a ${outcome.label} response.`, "Apply the same mastery eligibility rule to checkpoint scoring.", {
          skillId: skill.id,
          strandId: skill.strandId,
          level: skill.level
        })
      );
    }
  });

  return issues;
};

export const auditChildFacingCopy = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];

  collectGeneratedQuestionSamples().forEach(({ skill, plan, question }) => {
    const copyFields = [
      question.prompt,
      question.speech,
      question.supportText,
      question.hint,
      question.hintSpeech ?? "",
      question.explanation.text,
      question.explanation.speech
    ];
    if (copyFields.some(textContainsUnsafeTone)) {
      issues.push(
        issue("blocker", "copy", "Child-facing copy contains unsafe or shaming language.", "Rewrite as short, warm teaching copy.", {
          skillId: skill.id,
          strandId: skill.strandId,
          level: skill.level,
          profileId: plan.uxProfileId
        })
      );
    }
    const maxWords = skill.strandId === "word-problems" ? 32 : skill.gradeBand === "K" ? 14 : skill.gradeBand === "G1" ? 18 : 24;
    if (wordCount(question.prompt) > maxWords) {
      issues.push(
        issue("minor", "copy", "Prompt may be too wordy for the grade band.", "Shorten the child-facing prompt while keeping audio support.", {
          skillId: skill.id,
          strandId: skill.strandId,
          level: skill.level,
          profileId: plan.uxProfileId,
          expected: `${maxWords} words or fewer`,
          actual: `${wordCount(question.prompt)} words`
        })
      );
    }
  });

  return issues;
};

export const auditAccessibilityAndInputSafety = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];

  collectGeneratedQuestionSamples().forEach(({ skill, plan, question }) => {
    const context = {
      skillId: skill.id,
      strandId: skill.strandId,
      level: skill.level,
      profileId: plan.uxProfileId
    };
    if (!question.speech || !question.explanation.speech) {
      issues.push(issue("blocker", "accessibility", "Question is missing speech support.", "Add speech for prompt and explanation.", context));
    }
    if ((question.type === "drag-to-match" || question.type === "shape-sort" || question.type === "odd-even-pairing") && !question.drag?.targets.length) {
      issues.push(issue("blocker", "accessibility", "Drag interaction has no clear target.", "Provide clear drop targets.", context));
    }
    if (question.presentation.instructionVisibility === "audio-only" && !question.presentation.promptCue && !question.groups?.length && !question.countTap) {
      issues.push(
        issue("blocker", "accessibility", "Audio-only prompt lacks a supporting visual cue.", "Add a prompt cue or visible model.", context)
      );
    }
  });

  return issues;
};

export const auditParentTrustLanguage = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];
  const overclaimPattern = /all grade 2 math|guaranteed|certified|fully mastered all|complete common core/i;

  [...STRANDS.map((strand) => `${strand.title} ${strand.description}`), ...REWARDS.map((reward) => `${reward.title} ${reward.description}`)].forEach((text) => {
    if (overclaimPattern.test(text)) {
      issues.push(issue("major", "parent-trust", "Parent-facing copy overclaims readiness.", "Use accurate progress language without broad guarantees.", { actual: text }));
    }
  });

  allSkills().forEach((skill) => {
    const readiness = computeReadinessLabelForSkill(skill);
    if (skill.isExtension && readiness !== "Beyond" && skill.level > 7) {
      issues.push(
        issue("blocker", "parent-trust", "Extension skill does not resolve to Beyond readiness at high levels.", "Keep extension readiness separate from core grade readiness.", {
          skillId: skill.id,
          strandId: skill.strandId,
          level: skill.level,
          actual: readiness
        })
      );
    }
  });

  return issues;
};

export const auditCommonCoreBoundariesIfAvailable = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];

  allSkills().forEach((skill) => {
    const plan = createQuestionGenerationPlan(skill, "check");
    const context = {
      skillId: skill.id,
      strandId: skill.strandId,
      level: skill.level,
      profileId: skill.pedagogicalUxProfileId
    };
    if (skill.isExtension && skill.isCoreK2) {
      issues.push(issue("blocker", "common-core-boundary", "Extension skill is marked as core K-2.", "Separate extension and core readiness metadata.", context));
    }
    if (!skill.isExtension && skill.ccssCodes.length > 0 && skill.ccssCodes.every((code) => code === "Extension")) {
      issues.push(issue("blocker", "common-core-boundary", "Core skill only has extension alignment.", "Correct the skill alignment metadata.", context));
    }
    if (skill.ccssCodes.includes("K.CC.B.5") && (plan.constraints.maxScatteredObjects ?? 0) > 10) {
      issues.push(issue("blocker", "common-core-boundary", "Kindergarten scattered count boundary exceeds 10.", "Limit scattered K.CC.B.5 counting to 10.", context));
    }
    if (skill.strandId === "arrays-odd-even" && !skill.isExtension) {
      if ((skill.constraints?.maxArrayRows ?? 5) > 5 || (skill.constraints?.maxArrayColumns ?? 5) > 5) {
        issues.push(issue("blocker", "common-core-boundary", "Grade 2 array boundary exceeds 5 by 5.", "Keep core arrays within Grade 2 limits.", context));
      }
      if (skill.constraints?.avoidFormalMultiplication === false) {
        issues.push(issue("blocker", "common-core-boundary", "Core array skill allows formal multiplication.", "Keep Grade 2 array work as repeated addition/row-column reasoning.", context));
      }
    }
    if (
      skill.strandId === "equal-shares" &&
      !skill.isExtension &&
      skill.constraints?.allowFractionNotation &&
      /compare/i.test(skill.summary)
    ) {
      issues.push(issue("major", "common-core-boundary", "Core equal-share comparison centers symbolic fraction notation.", "Keep symbols supportive or mark the skill as extension.", context));
    }
  });

  return issues;
};

export const auditRegressionInvariants = (): UxPedQaIssue[] => {
  const issues: UxPedQaIssue[] = [];
  const defaultState = createDefaultState();

  if (!defaultState.profiles.ely || !defaultState.profiles.ira) {
    issues.push(issue("blocker", "regression", "Default state does not include both child profiles.", "Restore Ély and Ira profile presets."));
  }
  if (STRANDS.length !== 13) {
    issues.push(issue("blocker", "regression", "Unexpected strand count.", "Confirm curriculum scope before lock.", { expected: "13", actual: String(STRANDS.length) }));
  }
  if (allSkills().length !== 130) {
    issues.push(issue("blocker", "regression", "Unexpected current skill count.", "Confirm 13 x 10 current skill scope before lock.", { expected: "130", actual: String(allSkills().length) }));
  }

  return issues;
};

const buildSummary = (issues: UxPedQaIssue[]): UxPedQaSummary => {
  const coverage = getPedagogicalUxCoverageReport();
  const questionSamples = collectGeneratedQuestionSamples();
  const learningRows = auditPedagogicalUxLearningLoop();
  const learningSummary = summarizePedagogicalUxLearningLoopAudit(learningRows);

  return {
    taxonomy: {
      profilesAudited: profileEntries().length,
      invalidTaxonomyValues: issues.filter((item) => item.area === "taxonomy" && /Invalid/.test(item.message)).length,
      duplicateProfileIds: getDuplicateValues(profileEntries().map((profile) => profile.profileId)).length,
      missingRequiredFields: issues.filter((item) => item.area === "taxonomy" && /missing/i.test(item.message)).length
    },
    skillMapping: {
      skillsAudited: coverage.totalSkillCount,
      skillsWithValidProfile: coverage.mappedCount - coverage.invalidCount,
      missingProfiles: coverage.missingCount,
      invalidProfileReferences: coverage.invalidCount,
      strandLevelFallbackOnly: allSkills().filter((skill) => !skill.pedagogicalUx && !!skill.pedagogicalUxProfile).length,
      sourceLabelDifferenceCount: coverage.labelMismatchCount
    },
    generatedQuestions: {
      skillsSampled: new Set(questionSamples.map((sample) => sample.skill.id)).size,
      modesSampled: [...QUESTION_QA_MODES],
      totalSamples: questionSamples.length,
      invalidGeneratedQuestions: questionSamples.filter((sample) => sample.issues.some((item) => item.severity === "blocker")).length,
      activityProfileMismatches: questionSamples.flatMap((sample) => sample.issues).filter((item) => /Expected .* got/.test(item.message)).length,
      missingRequiredVisualData: questionSamples.flatMap((sample) => sample.issues).filter((item) => /missing .*data|missing .*target|missing .*bars/i.test(item.message)).length,
      invalidCorrectChoiceIds: questionSamples.flatMap((sample) => sample.issues).filter((item) => /correctChoiceId/.test(item.message)).length
    },
    learningLoop: {
      skillsAudited: learningSummary.totalCurrentSkillsAudited,
      resolvedLearningScripts: learningSummary.skillsWithResolvedLearningScripts,
      missingLessonScripts: learningSummary.skillsWithMissingLessonScript,
      missingFeedback: learningSummary.skillsWithMissingFeedback,
      missingRescue: learningSummary.skillsWithMissingRescue,
      missingMasteryDescriptor: learningSummary.skillsWithMissingMasteryDescriptor,
      missingNextStepAdvice: learningSummary.skillsWithMissingNextStepAdvice
    },
    feedbackRescueMastery: {
      feedbackIssueCount: issues.filter((item) => item.area === "feedback").length,
      rescueIssueCount: issues.filter((item) => item.area === "rescue").length,
      masterySafetyIssueCount: issues.filter((item) => item.area === "mastery").length
    },
    copy: {
      childFacingIssueCount: issues.filter((item) => item.area === "copy").length,
      accessibilityIssueCount: issues.filter((item) => item.area === "accessibility").length
    },
    parentTrust: {
      issueCount: issues.filter((item) => item.area === "parent-trust").length
    },
    commonCoreBoundary: {
      issueCount: issues.filter((item) => item.area === "common-core-boundary").length
    }
  };
};

const getLockVerdict = (
  blockerCount: number,
  majorCount: number,
  minorCount: number,
  advisoryCount: number
): UxPedQaReport["lockVerdict"] => {
  if (blockerCount > 0) return "NOT_LOCKED_BLOCKERS_REMAIN";
  if (majorCount > 0) return "NOT_LOCKED_MAJOR_ISSUES_REMAIN";
  if (minorCount > 0 || advisoryCount > 0) return "LOCKED_WITH_MINOR_NOTES";
  return "LOCKED";
};

export const runUxPedQa = (): UxPedQaReport => {
  const issues = [
    ...auditTaxonomy(),
    ...auditSkillMappings(),
    ...auditGeneratedQuestions(),
    ...auditLearningLoopConsistency(),
    ...auditFeedbackAndRescue(),
    ...auditMasterySafety(),
    ...auditChildFacingCopy(),
    ...auditAccessibilityAndInputSafety(),
    ...auditParentTrustLanguage(),
    ...auditCommonCoreBoundariesIfAvailable(),
    ...auditRegressionInvariants()
  ];
  const blockerCount = issues.filter((item) => item.severity === "blocker").length;
  const majorCount = issues.filter((item) => item.severity === "major").length;
  const minorCount = issues.filter((item) => item.severity === "minor").length;
  const advisoryCount = issues.filter((item) => item.severity === "advisory").length;
  const summary = buildSummary(issues);

  return {
    generatedAt: new Date().toISOString(),
    totalSkills: allSkills().length,
    totalProfiles: profileEntries().length,
    totalQuestionSamples: summary.generatedQuestions.totalSamples,
    totalIssues: issues.length,
    blockerCount,
    majorCount,
    minorCount,
    advisoryCount,
    issues,
    summary,
    lockVerdict: getLockVerdict(blockerCount, majorCount, minorCount, advisoryCount)
  };
};
