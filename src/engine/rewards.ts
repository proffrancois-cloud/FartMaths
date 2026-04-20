import { REWARDS, STRANDS } from "../data/catalog";
import { getWindowStats, isReadyForCheckpoint } from "./progression";
import type { ChildProfile, RewardDefinition } from "../types";

export interface RewardPreview {
  rewardId: string;
  title: string;
  description: string;
  remaining: string;
  distance: number;
}

const masteredInStrand = (profile: ChildProfile, strandId: string) =>
  STRANDS.find((strand) => strand.id === strandId)?.levels.filter((skill) => {
    const status = profile.skillProgress[skill.id].status;
    return status === "mastered" || status === "review-needed";
  }).length ?? 0;

export const getUpcomingRewards = (profile: ChildProfile): RewardPreview[] => {
  const unlocked = new Set(profile.unlockedRewards.map((reward) => reward.rewardId));
  const previews: RewardPreview[] = [];

  if (!unlocked.has("first-puff")) {
    previews.push({
      rewardId: "first-puff",
      title: "First Puff",
      description: REWARDS.find((reward) => reward.id === "first-puff")!.description,
      remaining: "Finish 1 session.",
      distance: 1
    });
  }

  if (!unlocked.has("streak-3")) {
    previews.push({
      rewardId: "streak-3",
      title: "Three-Day Toot",
      description: REWARDS.find((reward) => reward.id === "streak-3")!.description,
      remaining: `${Math.max(0, 3 - profile.currentStreak)} more day(s) in a row.`,
      distance: Math.max(0, 3 - profile.currentStreak)
    });
  }

  if (!unlocked.has("streak-7")) {
    previews.push({
      rewardId: "streak-7",
      title: "Mega Stink Week",
      description: REWARDS.find((reward) => reward.id === "streak-7")!.description,
      remaining: `${Math.max(0, 7 - profile.currentStreak)} more day(s) in a row.`,
      distance: Math.max(0, 7 - profile.currentStreak)
    });
  }

  if (!unlocked.has("mastery-1")) {
    const bestCandidate = STRANDS.map((strand) => {
      const currentLevel = profile.strandProgress[strand.id].currentLevel;
      const currentSkill = strand.levels[currentLevel - 1];
      const progress = profile.skillProgress[currentSkill.id];
      const stats = getWindowStats(progress);
      return {
        strand,
        distance: Math.max(1, 20 - stats.firstTryCorrect),
        remaining: `${Math.max(1, 20 - stats.firstTryCorrect)} more first-try correct answers in ${strand.shortTitle}.`
      };
    }).sort((left, right) => left.distance - right.distance)[0];

    previews.push({
      rewardId: "mastery-1",
      title: "Golden Toilet Seat",
      description: REWARDS.find((reward) => reward.id === "mastery-1")!.description,
      remaining: bestCandidate.remaining,
      distance: bestCandidate.distance
    });
  }

  if (!unlocked.has("checkpoint-pro")) {
    const bestCandidate = STRANDS.map((strand) => {
      const currentLevel = profile.strandProgress[strand.id].currentLevel;
      const currentSkill = strand.levels[currentLevel - 1];
      const progress = profile.skillProgress[currentSkill.id];
      return {
        strand,
        ready: isReadyForCheckpoint(progress),
        distance: isReadyForCheckpoint(progress) ? 1 : Math.max(1, 20 - progress.scoredAttempts),
        remaining: isReadyForCheckpoint(progress)
          ? `Pass the checkpoint in ${strand.shortTitle}.`
          : `Collect ${Math.max(1, 20 - progress.scoredAttempts)} more scored items in ${strand.shortTitle}.`
      };
    }).sort((left, right) => left.distance - right.distance)[0];

    previews.push({
      rewardId: "checkpoint-pro",
      title: "Checkpoint Champ",
      description: REWARDS.find((reward) => reward.id === "checkpoint-pro")!.description,
      remaining: bestCandidate.remaining,
      distance: bestCandidate.distance
    });
  }

  if (!unlocked.has("potty-professor")) {
    const bestStrand = STRANDS.map((strand) => ({
      strand,
      remainingLevels: Math.max(0, 9 - profile.strandProgress[strand.id].highestUnlockedLevel)
    })).sort((left, right) => left.remainingLevels - right.remainingLevels)[0];

    previews.push({
      rewardId: "potty-professor",
      title: "Potty Professor",
      description: REWARDS.find((reward) => reward.id === "potty-professor")!.description,
      remaining:
        bestStrand.remainingLevels <= 0
          ? `One more strong checkpoint in ${bestStrand.strand.shortTitle}.`
          : `Finish ${bestStrand.remainingLevels} more level(s) in ${bestStrand.strand.shortTitle}.`,
      distance: Math.max(1, bestStrand.remainingLevels)
    });
  }

  return previews
    .filter((preview) => !unlocked.has(preview.rewardId))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3);
};

export const getRewardDefinition = (rewardId: string): RewardDefinition | undefined =>
  REWARDS.find((reward) => reward.id === rewardId);

export const getStrandCompletion = (profile: ChildProfile, strandId: string) => {
  const total = STRANDS.find((strand) => strand.id === strandId)?.levels.length ?? 0;
  const mastered = masteredInStrand(profile, strandId);
  return {
    mastered,
    total,
    percentage: total === 0 ? 0 : Math.round((mastered / total) * 100)
  };
};
