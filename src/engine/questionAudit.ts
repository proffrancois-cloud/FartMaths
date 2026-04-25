import { STRANDS } from "../data/catalog";
import type { ActivityType, StrandId, TeachingMode } from "../types";
import { createQuestionGenerationPlan, validateGeneratedQuestion, type QuestionValidationIssue } from "./questionPlan";
import { generateQuestion } from "./questions";

export interface QuestionGenerationAuditRow {
  skillId: string;
  strandId: StrandId;
  level: number;
  skill: string;
  uxProfileId: string;
  activityType: ActivityType;
  mode: TeachingMode;
  status: "pass" | "warning" | "error";
  issues: QuestionValidationIssue[];
}

export interface QuestionGenerationAuditSummary {
  totalSkillsChecked: number;
  totalSamplesChecked: number;
  profilesSupported: number;
  fallbacksUsed: number;
  warnings: number;
  errors: number;
  unsupportedProfiles: Array<{
    uxProfileId: string;
    skillIds: string[];
    reason: string;
    temporaryFallback: string;
  }>;
}

export const QUESTION_AUDIT_MODES = ["example", "practice", "check", "placement"] as const satisfies readonly TeachingMode[];

export const auditQuestionGeneration = (
  modes: readonly TeachingMode[] = QUESTION_AUDIT_MODES
): QuestionGenerationAuditRow[] =>
  STRANDS.flatMap((strand) =>
    strand.levels.flatMap((skill) =>
      modes.map((mode) => {
        const plan = createQuestionGenerationPlan(skill, mode);
        const question = generateQuestion(skill, mode);
        const issues = validateGeneratedQuestion(question, plan);
        const hasError = issues.some((item) => item.severity === "error");
        const hasWarning = issues.some((item) => item.severity === "warning");

        return {
          skillId: skill.id,
          strandId: skill.strandId,
          level: skill.level,
          skill: skill.summary,
          uxProfileId: plan.uxProfileId,
          activityType: question.type,
          mode,
          status: hasError ? "error" : hasWarning ? "warning" : "pass",
          issues
        };
      })
    )
  );

export const summarizeQuestionGenerationAudit = (
  rows = auditQuestionGeneration()
): QuestionGenerationAuditSummary => {
  const skillIds = new Set(rows.map((row) => row.skillId));
  const profileIds = new Set(rows.map((row) => row.uxProfileId));
  const unsupported = new Map<string, QuestionGenerationAuditSummary["unsupportedProfiles"][number]>();

  rows.forEach((row) => {
    row.issues
      .filter((issue) => issue.code === "unsupported-profile" || issue.code === "unsafe-fallback-used")
      .forEach((issue) => {
        const current = unsupported.get(row.uxProfileId) ?? {
          uxProfileId: row.uxProfileId,
          skillIds: [],
          reason: issue.message,
          temporaryFallback: "safe visual multiple-choice fallback"
        };
        if (!current.skillIds.includes(row.skillId)) {
          current.skillIds.push(row.skillId);
        }
        unsupported.set(row.uxProfileId, current);
      });
  });

  return {
    totalSkillsChecked: skillIds.size,
    totalSamplesChecked: rows.length,
    profilesSupported: profileIds.size - unsupported.size,
    fallbacksUsed: [...unsupported.values()].reduce((count, item) => count + item.skillIds.length, 0),
    warnings: rows.reduce((count, row) => count + row.issues.filter((issue) => issue.severity === "warning").length, 0),
    errors: rows.reduce((count, row) => count + row.issues.filter((issue) => issue.severity === "error").length, 0),
    unsupportedProfiles: [...unsupported.values()]
  };
};
