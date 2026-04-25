import type {
  SkillDefinition,
  SkillPedagogicalUxMapping,
  StrandId,
  UxPedExerciseType,
  UxPedFeedbackType,
  UxPedLessonModel,
  UxPedRescueMove,
  UxPedVisualModel
} from "../types";
import { STRANDS } from "./catalog";
import {
  UX_PED_EXERCISE_TYPES,
  UX_PED_FEEDBACK_TYPES,
  UX_PED_LESSON_MODELS,
  UX_PED_RESCUE_MOVES,
  UX_PED_VISUAL_MODELS
} from "./pedagogicalUx";
import { SKILL_PEDAGOGICAL_UX_BY_ID } from "./pedagogicalUxMapping";

export type PedagogicalUxAuditStatus = "mapped" | "missing" | "invalid";

export interface PedagogicalUxAuditRow {
  skillId: string;
  strandId: StrandId;
  level: number;
  profileId?: string;
  sourceSkillLabel?: string;
  currentSkillLabel: string;
  labelDiffersFromMatrix: boolean;
  status: PedagogicalUxAuditStatus;
  issues: string[];
}

export interface PedagogicalUxCoverageReport {
  expectedSkillCount: number;
  totalSkillCount: number;
  mappedCount: number;
  missingCount: number;
  invalidCount: number;
  duplicateProfileIds: string[];
  orphanedMappingIds: string[];
  labelMismatchCount: number;
  rows: PedagogicalUxAuditRow[];
}

const includes = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (values as readonly string[]).includes(value);

const normalizeLabel = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const getSkills = (): SkillDefinition[] => STRANDS.flatMap((strand) => strand.levels);

const validateUxMapping = (
  skill: SkillDefinition,
  pedagogicalUx?: SkillPedagogicalUxMapping
) => {
  const issues: string[] = [];

  if (!pedagogicalUx) {
    issues.push("missing mapping object");
    return issues;
  }

  if (!pedagogicalUx.profileId) {
    issues.push("missing profileId");
  }

  if (skill.pedagogicalUxProfileId !== pedagogicalUx.profileId) {
    issues.push("skill pedagogicalUxProfileId does not match mapping profileId");
  }

  if (!includes<UxPedExerciseType>(UX_PED_EXERCISE_TYPES, pedagogicalUx.primaryExerciseType)) {
    issues.push(`invalid primaryExerciseType: ${pedagogicalUx.primaryExerciseType}`);
  }

  if (
    pedagogicalUx.secondaryExerciseType &&
    !includes<UxPedExerciseType>(UX_PED_EXERCISE_TYPES, pedagogicalUx.secondaryExerciseType)
  ) {
    issues.push(`invalid secondaryExerciseType: ${pedagogicalUx.secondaryExerciseType}`);
  }

  if (!includes<UxPedLessonModel>(UX_PED_LESSON_MODELS, pedagogicalUx.lessonModel)) {
    issues.push(`invalid lessonModel: ${pedagogicalUx.lessonModel}`);
  }

  if (!includes<UxPedVisualModel>(UX_PED_VISUAL_MODELS, pedagogicalUx.visualModel)) {
    issues.push(`invalid visualModel: ${pedagogicalUx.visualModel}`);
  }

  if (!includes<UxPedFeedbackType>(UX_PED_FEEDBACK_TYPES, pedagogicalUx.feedbackType)) {
    issues.push(`invalid feedbackType: ${pedagogicalUx.feedbackType}`);
  }

  if (!includes<UxPedRescueMove>(UX_PED_RESCUE_MOVES, pedagogicalUx.rescueMove)) {
    issues.push(`invalid rescueMove: ${pedagogicalUx.rescueMove}`);
  }

  if (!pedagogicalUx.learningGoal) {
    issues.push("missing learningGoal");
  }

  if (!pedagogicalUx.masteryCheck) {
    issues.push("missing masteryCheck");
  }

  if (!pedagogicalUx.commonMistakes.length) {
    issues.push("missing commonMistakes");
  }

  return issues;
};

const getDuplicateProfileIds = (skills: SkillDefinition[]) => {
  const profileIds = new Map<string, number>();

  skills.forEach((skill) => {
    const profileId = skill.pedagogicalUxProfileId;
    if (!profileId) {
      return;
    }
    profileIds.set(profileId, (profileIds.get(profileId) ?? 0) + 1);
  });

  return [...profileIds.entries()]
    .filter(([, count]) => count > 1)
    .map(([profileId]) => profileId);
};

export const getPedagogicalUxCoverageReport = (
  expectedSkillCount = 130
): PedagogicalUxCoverageReport => {
  const skills = getSkills();
  const skillIds = new Set(skills.map((skill) => skill.id));
  const orphanedMappingIds = Object.keys(SKILL_PEDAGOGICAL_UX_BY_ID).filter(
    (skillId) => !skillIds.has(skillId)
  );
  const duplicateProfileIds = getDuplicateProfileIds(skills);

  const rows = skills.map((skill): PedagogicalUxAuditRow => {
    const issues = validateUxMapping(skill, skill.pedagogicalUx);
    const sourceSkillLabel = skill.pedagogicalUx?.sourceSkillLabel;
    const labelDiffersFromMatrix =
      !!sourceSkillLabel && normalizeLabel(sourceSkillLabel) !== normalizeLabel(skill.summary);
    const status: PedagogicalUxAuditStatus =
      issues.length === 0 ? "mapped" : skill.pedagogicalUx ? "invalid" : "missing";

    return {
      skillId: skill.id,
      strandId: skill.strandId,
      level: skill.level,
      profileId: skill.pedagogicalUxProfileId,
      sourceSkillLabel,
      currentSkillLabel: skill.summary,
      labelDiffersFromMatrix,
      status,
      issues
    };
  });

  return {
    expectedSkillCount,
    totalSkillCount: skills.length,
    mappedCount: rows.filter((row) => row.status !== "missing").length,
    missingCount: rows.filter((row) => row.status === "missing").length,
    invalidCount: rows.filter((row) => row.status === "invalid").length,
    duplicateProfileIds,
    orphanedMappingIds,
    labelMismatchCount: rows.filter((row) => row.labelDiffersFromMatrix).length,
    rows
  };
};

export const assertPedagogicalUxCoverage = (expectedSkillCount = 130) => {
  const report = getPedagogicalUxCoverageReport(expectedSkillCount);

  if (
    report.totalSkillCount !== expectedSkillCount ||
    report.mappedCount !== expectedSkillCount ||
    report.missingCount !== 0 ||
    report.invalidCount !== 0 ||
    report.duplicateProfileIds.length > 0 ||
    report.orphanedMappingIds.length > 0
  ) {
    throw new Error(
      [
        "Pedagogical UX coverage failed.",
        `Expected ${expectedSkillCount}; saw ${report.totalSkillCount}.`,
        `Mapped ${report.mappedCount}; missing ${report.missingCount}; invalid ${report.invalidCount}.`,
        `Duplicate profile IDs: ${report.duplicateProfileIds.join(", ") || "none"}.`,
        `Orphaned mapping IDs: ${report.orphanedMappingIds.join(", ") || "none"}.`
      ].join(" ")
    );
  }

  return report;
};
