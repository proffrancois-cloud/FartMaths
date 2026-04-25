import { STRANDS } from "./catalog";
import type { SkillDefinition } from "../types";

export const REQUIRED_K2_CCSS_CODES = [
  "K.CC.A.1",
  "K.CC.A.2",
  "K.CC.A.3",
  "K.CC.B.4",
  "K.CC.B.4a",
  "K.CC.B.4b",
  "K.CC.B.4c",
  "K.CC.B.5",
  "K.CC.C.6",
  "K.CC.C.7",
  "K.OA.A.1",
  "K.OA.A.2",
  "K.OA.A.3",
  "K.OA.A.4",
  "K.OA.A.5",
  "K.NBT.A.1",
  "K.MD.A.1",
  "K.MD.A.2",
  "K.MD.B.3",
  "K.G.A.1",
  "K.G.A.2",
  "K.G.A.3",
  "K.G.B.4",
  "K.G.B.5",
  "K.G.B.6",
  "1.OA.A.1",
  "1.OA.A.2",
  "1.OA.B.3",
  "1.OA.B.4",
  "1.OA.C.5",
  "1.OA.C.6",
  "1.OA.D.7",
  "1.OA.D.8",
  "1.NBT.A.1",
  "1.NBT.B.2",
  "1.NBT.B.2a",
  "1.NBT.B.2b",
  "1.NBT.B.2c",
  "1.NBT.B.3",
  "1.NBT.C.4",
  "1.NBT.C.5",
  "1.NBT.C.6",
  "1.MD.A.1",
  "1.MD.A.2",
  "1.MD.B.3",
  "1.MD.C.4",
  "1.G.A.1",
  "1.G.A.2",
  "1.G.A.3",
  "2.OA.A.1",
  "2.OA.B.2",
  "2.OA.C.3",
  "2.OA.C.4",
  "2.NBT.A.1",
  "2.NBT.A.1a",
  "2.NBT.A.1b",
  "2.NBT.A.2",
  "2.NBT.A.3",
  "2.NBT.A.4",
  "2.NBT.B.5",
  "2.NBT.B.6",
  "2.NBT.B.7",
  "2.NBT.B.8",
  "2.NBT.B.9",
  "2.MD.A.1",
  "2.MD.A.2",
  "2.MD.A.3",
  "2.MD.A.4",
  "2.MD.B.5",
  "2.MD.B.6",
  "2.MD.C.7",
  "2.MD.C.8",
  "2.MD.D.9",
  "2.MD.D.10",
  "2.G.A.1",
  "2.G.A.2",
  "2.G.A.3"
] as const;

export type RequiredK2CcssCode = (typeof REQUIRED_K2_CCSS_CODES)[number];

export interface CommonCoreCoverageReport {
  totalRequiredStandards: number;
  coveredStandards: string[];
  missingStandards: string[];
  extensionOnlyStandards: string[];
  duplicateCoveredStandards: Record<string, string[]>;
  skillsWithoutCcss: string[];
  skillsMarkedExtensionButCoreCode: string[];
  skillsMarkedCoreButOnlyExtensionCode: string[];
  extensionSkills: string[];
}

const requiredCodeSet = new Set<string>(REQUIRED_K2_CCSS_CODES);

const allSkills = () => STRANDS.flatMap((strand) => strand.levels);

const isRequiredK2Code = (code: string) => requiredCodeSet.has(code);

export const getCoveredCcssCodes = () =>
  new Set(allSkills().flatMap((skill) => skill.ccssCodes));

export const getCoreCoveredCcssCodes = () =>
  new Set(
    allSkills()
      .filter((skill) => !skill.isExtension)
      .flatMap((skill) => skill.ccssCodes.filter(isRequiredK2Code))
  );

export const getMissingCcssCodes = () => {
  const covered = getCoreCoveredCcssCodes();
  return REQUIRED_K2_CCSS_CODES.filter((code) => !covered.has(code));
};

export const getExtensionSkills = (): SkillDefinition[] =>
  allSkills().filter((skill) => skill.isExtension);

export const getSkillsForCcss = (code: string): SkillDefinition[] =>
  allSkills().filter((skill) => skill.ccssCodes.includes(code));

export const getCommonCoreCoverageReport = (): CommonCoreCoverageReport => {
  const skills = allSkills();
  const coveredStandards = [...getCoreCoveredCcssCodes()].sort();
  const duplicateCoveredStandards = Object.fromEntries(
    REQUIRED_K2_CCSS_CODES.map((code) => [
      code,
      getSkillsForCcss(code)
        .filter((skill) => !skill.isExtension)
        .map((skill) => skill.id)
    ]).filter(([, skillIds]) => skillIds.length > 1)
  );
  const extensionOnlyStandards = REQUIRED_K2_CCSS_CODES.filter((code) => {
    const matchingSkills = getSkillsForCcss(code);
    return matchingSkills.length > 0 && matchingSkills.every((skill) => skill.isExtension);
  });

  return {
    totalRequiredStandards: REQUIRED_K2_CCSS_CODES.length,
    coveredStandards,
    missingStandards: getMissingCcssCodes(),
    extensionOnlyStandards,
    duplicateCoveredStandards,
    skillsWithoutCcss: skills
      .filter((skill) => skill.ccssCodes.length === 0)
      .map((skill) => skill.id),
    skillsMarkedExtensionButCoreCode: skills
      .filter((skill) => skill.isExtension && skill.ccssCodes.some(isRequiredK2Code))
      .map((skill) => skill.id),
    skillsMarkedCoreButOnlyExtensionCode: skills
      .filter((skill) => !skill.isExtension && skill.ccssCodes.every((code) => code === "Extension"))
      .map((skill) => skill.id),
    extensionSkills: getExtensionSkills().map((skill) => skill.id)
  };
};

export const assertCommonCoreCoverage = () => {
  const report = getCommonCoreCoverageReport();
  const failures = [
    report.missingStandards.length
      ? `Missing required standards: ${report.missingStandards.join(", ")}`
      : "",
    report.extensionOnlyStandards.length
      ? `Standards covered only by extension skills: ${report.extensionOnlyStandards.join(", ")}`
      : "",
    report.skillsWithoutCcss.length
      ? `Skills without CCSS metadata: ${report.skillsWithoutCcss.join(", ")}`
      : "",
    report.skillsMarkedExtensionButCoreCode.length
      ? `Extension skills carrying core K-2 codes: ${report.skillsMarkedExtensionButCoreCode.join(", ")}`
      : "",
    report.skillsMarkedCoreButOnlyExtensionCode.length
      ? `Core skills carrying only Extension metadata: ${report.skillsMarkedCoreButOnlyExtensionCode.join(", ")}`
      : ""
  ].filter(Boolean);

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  return report;
};
