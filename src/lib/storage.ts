import { PROFILE_PRESETS, STRANDS } from "../data/catalog";
import {
  APP_STATE_VERSION,
  DEFAULT_SESSION_LENGTH,
  DEFAULT_SETTINGS
} from "../data/rules";
import type {
  AppSettings,
  ChildProfile,
  PersistedState,
  ProfileId,
  ReadinessLabel,
  SkillDefinition,
  SkillProgress,
  StrandId,
  StrandProgress
} from "../types";

const STORAGE_KEY = "fartmaths-state-v1";

const LEGACY_AVATAR_MAP = {
  "fart-cloud": "ninja-stinky",
  "happy-poop": "ninja-poo",
  "butt-monster": "ninja-diaper",
  "smiling-toilet": "ninja-diaper",
  "farting-emoji": "ninja-stinky",
  "pooping-emoji": "ninja-poo",
  "toilet-roll-hero": "ninja-diaper"
} as const;

const safeWindow = () => (typeof window === "undefined" ? undefined : window);

export const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const normalizeNameInput = (value: string) =>
  stripDiacritics(value.trim().toLowerCase());

const defaultSkillProgress = (skillId: string): SkillProgress => ({
  skillId,
  status: "not-started",
  exampleSeen: false,
  guidedSuccesses: 0,
  attempts: 0,
  firstTryCorrectCount: 0,
  scoredAttempts: 0,
  hintsUsed: 0,
  suspiciousFastAnswers: 0,
  reviewDue: false,
  recentScoredResults: [],
  checkpointHistory: []
});

const defaultStrandProgress = (strandId: StrandId): StrandProgress => ({
  strandId,
  currentLevel: 1,
  highestUnlockedLevel: 1,
  placementDone: false,
  placementConfidence: 0,
  readiness: "Not Yet"
});

const createProfile = (profileId: ProfileId): ChildProfile => {
  const preset = PROFILE_PRESETS.find((item) => item.id === profileId);
  if (!preset) {
    throw new Error(`Unknown profile preset ${profileId}`);
  }

  const strandProgress = Object.fromEntries(
    STRANDS.map((strand) => [strand.id, defaultStrandProgress(strand.id)])
  ) as Record<StrandId, StrandProgress>;

  const skillProgress = Object.fromEntries(
    STRANDS.flatMap((strand) =>
      strand.levels.map((skill) => [skill.id, defaultSkillProgress(skill.id)])
    )
  ) as Record<string, SkillProgress>;

  return {
    id: profileId,
    displayName: preset.displayName,
    aliases: [...preset.aliases],
    avatarId: preset.defaultAvatarId,
    preferredSessionLength: DEFAULT_SESSION_LENGTH,
    placementStarted: false,
    placementDone: false,
    currentStreak: 0,
    strandProgress,
    skillProgress,
    recentSessions: [],
    unlockedRewards: []
  };
};

export const createDefaultState = (): PersistedState => ({
  version: APP_STATE_VERSION,
  settings: {
    ...DEFAULT_SETTINGS
  } satisfies AppSettings,
  profiles: {
    ely: createProfile("ely"),
    ira: createProfile("ira")
  }
});

const mergeState = (input?: PersistedState | null): PersistedState => {
  const base = createDefaultState();
  if (!input || input.version !== APP_STATE_VERSION) {
    return base;
  }

  const mergedProfiles = Object.fromEntries(
    (Object.keys(base.profiles) as ProfileId[]).map((profileId) => {
      const source = input.profiles[profileId] ?? base.profiles[profileId];
      return [
        profileId,
        {
          ...base.profiles[profileId],
          ...source,
          avatarId:
            LEGACY_AVATAR_MAP[source.avatarId as keyof typeof LEGACY_AVATAR_MAP] ??
            source.avatarId ??
            base.profiles[profileId].avatarId,
          strandProgress: {
            ...base.profiles[profileId].strandProgress,
            ...source.strandProgress
          },
          skillProgress: {
            ...base.profiles[profileId].skillProgress,
            ...source.skillProgress
          }
        }
      ];
    })
  ) as PersistedState["profiles"];

  return {
    version: APP_STATE_VERSION,
    settings: {
      ...base.settings,
      ...input.settings
    },
    profiles: mergedProfiles
  };
};

export const loadState = (): PersistedState => {
  const browser = safeWindow();
  if (!browser) {
    return createDefaultState();
  }

  try {
    const raw = browser.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return mergeState(JSON.parse(raw) as PersistedState);
  } catch {
    return createDefaultState();
  }
};

export const saveState = (state: PersistedState) => {
  const browser = safeWindow();
  if (!browser) return;
  browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resolveProfileId = (value: string): ProfileId | null => {
  const normalized = normalizeNameInput(value);
  if (!normalized) return null;
  if (normalized === "ely") return "ely";
  if (normalized === "ira") return "ira";

  return PROFILE_PRESETS.find((profile) =>
    profile.aliases.some((alias) => normalizeNameInput(alias) === normalized)
  )?.id ?? null;
};

export const resetProfile = (
  state: PersistedState,
  profileId: ProfileId
): PersistedState => {
  const currentProfile = state.profiles[profileId];
  const freshProfile = createProfile(profileId);

  freshProfile.avatarId = currentProfile.avatarId;
  freshProfile.preferredSessionLength = currentProfile.preferredSessionLength;

  return {
    ...state,
    profiles: {
      ...state.profiles,
      [profileId]: freshProfile
    }
  };
};

export const resetStrandProgress = (
  state: PersistedState,
  profileId: ProfileId,
  strandId: StrandId
): PersistedState => {
  const currentProfile = state.profiles[profileId];
  const strand = STRANDS.find((item) => item.id === strandId);
  if (!strand) {
    return state;
  }

  return {
    ...state,
    profiles: {
      ...state.profiles,
      [profileId]: {
        ...currentProfile,
        strandProgress: {
          ...currentProfile.strandProgress,
          [strandId]: defaultStrandProgress(strandId)
        },
        skillProgress: {
          ...currentProfile.skillProgress,
          ...Object.fromEntries(
            strand.levels.map((skill) => [skill.id, defaultSkillProgress(skill.id)])
          )
        }
      }
    }
  };
};

export const resetSkillProgress = (
  state: PersistedState,
  profileId: ProfileId,
  skillId: string
): PersistedState => {
  const currentProfile = state.profiles[profileId];
  const strand = STRANDS.find((item) => item.levels.some((skill) => skill.id === skillId));
  const skill = strand?.levels.find((item) => item.id === skillId);

  if (!strand || !skill) {
    return state;
  }

  const strandProgress = currentProfile.strandProgress[strand.id];

  return {
    ...state,
    profiles: {
      ...state.profiles,
      [profileId]: {
        ...currentProfile,
        strandProgress: {
          ...currentProfile.strandProgress,
          [strand.id]: {
            ...strandProgress,
            currentLevel: Math.min(strandProgress.currentLevel, skill.level)
          }
        },
        skillProgress: {
          ...currentProfile.skillProgress,
          [skillId]: defaultSkillProgress(skillId)
        }
      }
    }
  };
};

export const dateKey = (dateLike: string | Date = new Date()) => {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return date.toISOString().slice(0, 10);
};

export const computeReadinessLabelForSkill = (skill: SkillDefinition): ReadinessLabel => {
  if (skill.isExtension || skill.gradeBand === "Extension") {
    if (skill.level <= 2) return "Not Yet";
    if (skill.level <= 5) return "Growing";
    if (skill.level <= 7) return "Strong";
    return "Beyond";
  }
  if (skill.gradeBand === "G2" || skill.gradeBand === "G1-G2" || skill.gradeBand === "K-G2") {
    return "Grade-2 Ready";
  }
  if (skill.gradeBand === "G1" || skill.gradeBand === "K-G1") return "Strong";
  return skill.level <= 2 ? "Not Yet" : "Growing";
};

export const computeReadinessLabel = (
  highestLevel: number,
  strandId?: StrandId
): ReadinessLabel => {
  if (strandId) {
    const strand = STRANDS.find((item) => item.id === strandId);
    const skill = strand?.levels.find((item) => item.level === highestLevel);
    if (skill) return computeReadinessLabelForSkill(skill);
  }

  if (highestLevel <= 2) return "Not Yet";
  if (highestLevel <= 5) return "Growing";
  if (highestLevel <= 7) return "Strong";
  return "Grade-2 Ready";
};
