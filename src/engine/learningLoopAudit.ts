import { STRANDS } from "../data/catalog";
import type { SkillLearningScript, StrandId } from "../types";
import { getSkillLearningScript } from "./learningLoop";

export interface PedagogicalUxPass4AuditRow {
  skillId: string;
  strandId: StrandId;
  level: number;
  profileId: string;
  lessonModel: string;
  visualModel: string;
  primaryActivityType: string;
  feedbackType: string;
  rescueMove: string;
  masteryCheckMode: SkillLearningScript["masteryCheck"]["mode"];
  hasLessonScript: boolean;
  hasWorkedExample: boolean;
  hasFeedback: boolean;
  hasRescue: boolean;
  hasNextStepAdvice: boolean;
  warnings: string[];
}

export interface PedagogicalUxPass4AuditSummary {
  totalCurrentSkillsAudited: number;
  skillsWithResolvedLearningScripts: number;
  skillsWithMissingLessonScript: number;
  skillsWithMissingFeedback: number;
  skillsWithMissingRescue: number;
  skillsWithMissingMasteryDescriptor: number;
  skillsWithMissingNextStepAdvice: number;
  unsupportedProfiles: string[];
  warnings: number;
}

const isPresent = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

export const auditPedagogicalUxLearningLoop = (): PedagogicalUxPass4AuditRow[] =>
  STRANDS.flatMap((strand) =>
    strand.levels.map((skill) => {
      const profile = skill.pedagogicalUx;
      const script = getSkillLearningScript(skill);
      const warnings: string[] = [];
      const hasLessonScript =
        isPresent(script.lessonTitle) &&
        isPresent(script.lessonBigIdea) &&
        script.lessonSteps.length > 0;
      const hasWorkedExample =
        isPresent(script.workedExample.prompt) &&
        script.workedExample.solutionSteps.length > 0 &&
        isPresent(script.workedExample.answerStatement);
      const hasFeedback =
        isPresent(script.feedback.correctPattern) &&
        isPresent(script.feedback.incorrectPattern);
      const hasRescue =
        isPresent(script.rescue.trigger) &&
        isPresent(script.rescue.explanation);
      const hasNextStepAdvice = isPresent(script.nextStepAdvice.childMessage);

      if (!profile) warnings.push("Missing skill-level pedagogical UX mapping.");
      if (!hasLessonScript) warnings.push("Missing lesson script.");
      if (!hasWorkedExample) warnings.push("Missing worked example.");
      if (!hasFeedback) warnings.push("Missing feedback descriptor.");
      if (!hasRescue) warnings.push("Missing rescue descriptor.");
      if (!isPresent(script.masteryCheck.requirement)) warnings.push("Missing mastery descriptor.");
      if (!hasNextStepAdvice) warnings.push("Missing next-step advice.");

      return {
        skillId: skill.id,
        strandId: skill.strandId,
        level: skill.level,
        profileId: profile?.profileId ?? script.skillId,
        lessonModel: profile?.lessonModel ?? "fallback",
        visualModel: profile?.visualModel ?? "fallback",
        primaryActivityType: profile?.primaryExerciseType ?? "fallback",
        feedbackType: profile?.feedbackType ?? "fallback",
        rescueMove: profile?.rescueMove ?? script.rescue.rescueMove,
        masteryCheckMode: script.masteryCheck.mode,
        hasLessonScript,
        hasWorkedExample,
        hasFeedback,
        hasRescue,
        hasNextStepAdvice,
        warnings
      };
    })
  );

export const summarizePedagogicalUxLearningLoopAudit = (
  rows = auditPedagogicalUxLearningLoop()
): PedagogicalUxPass4AuditSummary => ({
  totalCurrentSkillsAudited: rows.length,
  skillsWithResolvedLearningScripts: rows.filter(
    (row) =>
      row.hasLessonScript &&
      row.hasWorkedExample &&
      row.hasFeedback &&
      row.hasRescue &&
      row.hasNextStepAdvice &&
      row.warnings.length === 0
  ).length,
  skillsWithMissingLessonScript: rows.filter((row) => !row.hasLessonScript).length,
  skillsWithMissingFeedback: rows.filter((row) => !row.hasFeedback).length,
  skillsWithMissingRescue: rows.filter((row) => !row.hasRescue).length,
  skillsWithMissingMasteryDescriptor: rows.filter((row) => row.warnings.includes("Missing mastery descriptor.")).length,
  skillsWithMissingNextStepAdvice: rows.filter((row) => !row.hasNextStepAdvice).length,
  unsupportedProfiles: rows
    .filter((row) => row.profileId.endsWith("fallback") || row.lessonModel === "fallback")
    .map((row) => row.profileId),
  warnings: rows.reduce((total, row) => total + row.warnings.length, 0)
});
