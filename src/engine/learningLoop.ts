import type {
  FeedbackDescriptor,
  GuidedSupportDescriptor,
  MasteryCheckDescriptor,
  NextStepAdviceDescriptor,
  PedagogicalFeedback,
  QuestionDefinition,
  RescueDescriptor,
  SkillDefinition,
  SkillLearningScript,
  SkillPedagogicalUxMapping,
  UxPedFeedbackType,
  UxPedLessonModel,
  UxPedRescueMove,
  UxPedVisualModel,
  WorkedExample
} from "../types";

const titleFromLessonModel: Record<UxPedLessonModel, string> = {
  "show-and-name": "Look, name, then choose.",
  "worked-example": "Watch one, then try.",
  "step-by-step-model": "Follow the steps.",
  "manipulative-demo": "Build it to see it.",
  "notice-pattern": "Notice the pattern.",
  "mistake-contrast": "Spot what works.",
  "strategy-choice": "Choose a helpful strategy."
};

const visualNotice: Record<UxPedVisualModel, string> = {
  "objects-arranged": "Touch or count each object one time.",
  "objects-scattered": "Keep track so no object is skipped or counted twice.",
  "ten-frame": "A full ten-frame has 10 spaces.",
  "part-part-whole": "Parts join to make a whole.",
  "base-ten-blocks": "Count hundreds first, then tens, then ones.",
  "number-line": "Start at the first number and move in order.",
  "clock-face": "Look at the short hand first, then the long hand.",
  "schedule-timeline": "Read the events in order.",
  "coin-set": "Name the coins, then count their values.",
  "bar-picture-graph": "Find the label first, then read the value.",
  "shape-model": "Use sides, corners, and flat or solid attributes.",
  "equal-share-model": "Fair shares are the same size.",
  "array-grid": "Rows and columns make an organized total.",
  "measurement-lineup": "Line things up before comparing or measuring.",
  "story-scene-model": "Watch what changes in the story."
};

const guidedSupportByVisual: Record<UxPedVisualModel, GuidedSupportDescriptor> = {
  "objects-arranged": {
    supportType: "count-highlight",
    behavior: "Highlight each counted object and keep the set easy to scan.",
    removeWhen: "After clean counts without skipped or double-counted objects."
  },
  "objects-scattered": {
    supportType: "tracked-count",
    behavior: "Use fewer objects first, then highlight counted objects.",
    removeWhen: "After the child tracks scattered sets carefully."
  },
  "ten-frame": {
    supportType: "ten-frame-complement",
    behavior: "Show filled spaces and empty spaces that make 10.",
    removeWhen: "After the child names the missing amount without counting every slot."
  },
  "part-part-whole": {
    supportType: "part-labels",
    behavior: "Label each part and the whole before choosing.",
    removeWhen: "After the child identifies the unknown part or whole independently."
  },
  "base-ten-blocks": {
    supportType: "place-value-labels",
    behavior: "Label hundreds, tens, and ones while building or reading.",
    removeWhen: "After place-value language is used correctly."
  },
  "number-line": {
    supportType: "ordered-stops",
    behavior: "Show the start, direction, and landing point on the number line.",
    removeWhen: "After the child follows the ordered stops independently."
  },
  "clock-face": {
    supportType: "hand-highlight",
    behavior: "Point to the short hand first, then check the long hand.",
    removeWhen: "After the child reads the allowed minute increment reliably."
  },
  "schedule-timeline": {
    supportType: "sequence-highlight",
    behavior: "Highlight the event order before asking the question.",
    removeWhen: "After before/after or schedule questions are answered without support."
  },
  "coin-set": {
    supportType: "coin-value-labels",
    behavior: "Group like coins and show value labels while counting.",
    removeWhen: "After coin names and values are used correctly."
  },
  "bar-picture-graph": {
    supportType: "graph-highlight",
    behavior: "Highlight the relevant category, bar, or picture row.",
    removeWhen: "After the child reads labels and values in order."
  },
  "shape-model": {
    supportType: "attribute-focus",
    behavior: "Point to sides, corners, and flat or solid features.",
    removeWhen: "After the child chooses by defining attributes."
  },
  "equal-share-model": {
    supportType: "share-overlay",
    behavior: "Overlay equal-part guides and contrast unfair shares.",
    removeWhen: "After same-size pieces are identified without the overlay."
  },
  "array-grid": {
    supportType: "row-column-highlight",
    behavior: "Highlight rows and columns and name repeated addition.",
    removeWhen: "After the child reads rows/columns without labels."
  },
  "measurement-lineup": {
    supportType: "aligned-units",
    behavior: "Line objects or units up with no gaps or overlaps.",
    removeWhen: "After the child compares or measures from the same start point."
  },
  "story-scene-model": {
    supportType: "act-out-change",
    behavior: "Show start, change, and result in the story action.",
    removeWhen: "After the child names what changed before solving."
  }
};

const feedbackByType: Record<UxPedFeedbackType, FeedbackDescriptor> = {
  "confirm-and-name": {
    correctPattern: "Yes. Name the answer and the matching model.",
    incorrectPattern: "Name the correct answer and show the matching model."
  },
  "show-correction": {
    correctPattern: "Confirm the answer and show why it fits.",
    incorrectPattern: "Show the correct model and point to the part that decides."
  },
  "counting-error-feedback": {
    correctPattern: "Name the total and remind that each object was counted once.",
    incorrectPattern: "Point out skipped or double-counted objects and restate the total."
  },
  "compare-again": {
    correctPattern: "State both totals and the comparison word.",
    incorrectPattern: "Count both sides again and name which side has more, less, or same."
  },
  "model-step-again": {
    correctPattern: "Name the successful step and the answer.",
    incorrectPattern: "Repeat the key model step before naming the answer."
  },
  "strategy-reminder": {
    correctPattern: "Name the strategy that worked.",
    incorrectPattern: "Remind the child which strategy fits this model."
  },
  "mistake-contrast-feedback": {
    correctPattern: "Contrast the correct model with a common wrong model.",
    incorrectPattern: "Show why the wrong choice does not match the defining idea."
  },
  "reduce-and-retry-feedback": {
    correctPattern: "Confirm the answer and keep the next item similar.",
    incorrectPattern: "Reduce the set or choices, then try the same idea again."
  },
  "transfer-praise": {
    correctPattern: "Celebrate using the idea in a new representation.",
    incorrectPattern: "Return to the model and connect it to the new representation."
  },
  "next-step-feedback": {
    correctPattern: "Name the next slightly harder step.",
    incorrectPattern: "Name the support step to practice next."
  }
};

const rescueByMove: Record<UxPedRescueMove, Omit<RescueDescriptor, "rescueMove">> = {
  "highlight-counted-objects": {
    trigger: "Skipped or double-counted objects.",
    explanation: "Mark each counted object and count more slowly."
  },
  "reduce-set-size": {
    trigger: "The quantity is too large right now.",
    explanation: "Try the same idea with fewer objects, then build back up."
  },
  "switch-scattered-to-arranged": {
    trigger: "Scattered objects are hard to track.",
    explanation: "Use an arranged set first, then return to scattered objects."
  },
  "align-compare-groups": {
    trigger: "The comparison is based on looks instead of count.",
    explanation: "Line up both groups and count each side."
  },
  "show-one-more-one-less": {
    trigger: "The change is off by one.",
    explanation: "Show one object being added or removed."
  },
  "short-hand-first": {
    trigger: "The clock hands are being mixed up.",
    explanation: "Highlight the short hand first, then check the long hand."
  },
  "split-place-value": {
    trigger: "Tens, ones, or hundreds are mixed together.",
    explanation: "Split the model into hundreds, tens, and ones."
  },
  "show-unit-iteration": {
    trigger: "Measurement units have gaps, overlaps, or wrong starts.",
    explanation: "Place equal units end to end from the same start point."
  },
  "highlight-relevant-graph-item": {
    trigger: "The wrong graph label, bar, or point is being read.",
    explanation: "Highlight the category or bar the question asks about."
  },
  "pair-and-leftover": {
    trigger: "Odd/even is not tied to pairs yet.",
    explanation: "Make pairs and show whether one object is left over."
  },
  "equal-share-overlay": {
    trigger: "Pieces are counted without checking equal size.",
    explanation: "Overlay equal-size guide lines and compare fair versus unfair shares."
  },
  "act-out-story": {
    trigger: "The story action is unclear.",
    explanation: "Act out what starts, what changes, and what is left or total."
  },
  "reduce-choice-load": {
    trigger: "Too many choices or a very fast guess.",
    explanation: "Use fewer choices and ask for one careful look before answering."
  },
  "build-with-guides": {
    trigger: "The model needs target positions or structure.",
    explanation: "Show ghost slots or guide outlines while the child builds."
  },
  "worked-example-reset": {
    trigger: "The same misconception repeats.",
    explanation: "Return to a worked example, then try a close match."
  }
};

const toShortSentence = (text: string) =>
  text.replace(/\.$/, "").split(";")[0].trim();

const getProfile = (skill: SkillDefinition): SkillPedagogicalUxMapping => {
  if (skill.pedagogicalUx) {
    return skill.pedagogicalUx;
  }

  if (skill.pedagogicalUxProfile) {
    return {
      profileId: skill.pedagogicalUxProfile.id,
      primaryExerciseType: skill.pedagogicalUxProfile.primaryExerciseType,
      secondaryExerciseType: skill.pedagogicalUxProfile.secondaryExerciseType,
      lessonModel: skill.pedagogicalUxProfile.lessonModel,
      visualModel: skill.pedagogicalUxProfile.visualModel,
      learningGoal: skill.pedagogicalUxProfile.learningGoalTemplate,
      lessonFocus: skill.pedagogicalUxProfile.lessonFocus,
      commonMistakes: skill.pedagogicalUxProfile.commonMistakes,
      feedbackType: skill.pedagogicalUxProfile.feedbackType,
      rescueMove: skill.pedagogicalUxProfile.rescueMove,
      masteryCheck: skill.pedagogicalUxProfile.independentPracticeExpectation,
      implementationNote: skill.pedagogicalUxProfile.implementationNotes
    };
  }

  return {
    profileId: `${skill.id}-learning-loop-fallback`,
    primaryExerciseType: "choose-visual-answer",
    lessonModel: "worked-example",
    visualModel: "objects-arranged",
    learningGoal: skill.summary,
    lessonFocus: skill.scaffold.pictorial,
    commonMistakes: ["Needs a resolved UX-Ped profile"],
    feedbackType: "show-correction",
    rescueMove: "reduce-choice-load",
    masteryCheck: "Answer independently without hint."
  };
};

const buildWorkedExample = (
  skill: SkillDefinition,
  profile: SkillPedagogicalUxMapping
): WorkedExample => ({
  prompt: `Watch one example: ${toShortSentence(profile.sourceSkillLabel ?? skill.summary)}.`,
  modelDescription: visualNotice[profile.visualModel],
  solutionSteps: [
    profile.lessonFocus,
    guidedSupportByVisual[profile.visualModel].behavior,
    profile.masteryCheck
  ].map(toShortSentence).slice(0, skill.gradeBand === "G2" ? 3 : 2),
  answerStatement: `The model shows: ${toShortSentence(profile.learningGoal)}.`
});

export const getSkillLearningScript = (skill: SkillDefinition): SkillLearningScript => {
  const profile = getProfile(skill);
  const guidedSupport = guidedSupportByVisual[profile.visualModel];
  const rescuePreset = rescueByMove[profile.rescueMove];

  return {
    skillId: skill.id,
    lessonTitle: titleFromLessonModel[profile.lessonModel],
    lessonBigIdea: profile.learningGoal,
    lessonSteps: [
      {
        text: toShortSentence(profile.lessonFocus),
        visualCue: profile.visualModel
      },
      {
        text: toShortSentence(visualNotice[profile.visualModel]),
        visualCue: profile.visualModel
      },
      {
        text: profile.commonMistakes[0]
          ? `Watch for this: ${toShortSentence(profile.commonMistakes[0]).toLowerCase()}.`
          : "Take one careful look before you answer."
      }
    ].slice(0, skill.gradeBand === "G2" ? 3 : 2),
    workedExample: buildWorkedExample(skill, profile),
    whatToNotice: visualNotice[profile.visualModel],
    guidedSupport,
    feedback: feedbackByType[profile.feedbackType],
    rescue: {
      rescueMove: profile.rescueMove,
      trigger: rescuePreset.trigger,
      explanation: rescuePreset.explanation
    },
    masteryCheck: {
      mode: skill.isExtension ? "review" : skill.gradeBand === "G2" ? "mixed-variation" : "no-hint",
      requirement: profile.masteryCheck,
      notCountedIf: [
        "hint was used",
        "rescue was used",
        "answer was corrected after a mistake",
        "answer was suspiciously fast"
      ]
    },
    nextStepAdvice: {
      childMessage: `Next time: ${toShortSentence(guidedSupport.behavior).toLowerCase()}.`,
      parentMessage: `${skill.title} is supported with ${profile.lessonModel} and ${profile.visualModel}. Next support: ${rescuePreset.explanation}`,
      recommendedNextSkill: undefined
    }
  };
};

export const buildPedagogicalFeedback = ({
  question,
  script,
  correct,
  suspiciousFast,
  hintUsed,
  firstTry
}: {
  question: QuestionDefinition;
  script: SkillLearningScript;
  correct: boolean;
  suspiciousFast: boolean;
  hintUsed: boolean;
  firstTry: boolean;
}): PedagogicalFeedback => {
  const mathReason = question.explanation.text;

  if (suspiciousFast) {
    return {
      status: "careful-look",
      headline: "Let's slow down and look together.",
      explanation: `That answer was very fast, so it does not count for mastery. ${mathReason}`,
      mathReason,
      nextAction: script.rescue.explanation,
      rescueSuggested: true,
      audioText: `Let's slow down and look together. ${script.rescue.explanation}`
    };
  }

  if (correct) {
    const headline = firstTry && !hintUsed ? "Yes. That model works." : "Nice fix. That model works.";
    return {
      status: "correct",
      headline,
      explanation: `${script.feedback.correctPattern} ${mathReason}`,
      mathReason,
      nextAction: hintUsed ? script.masteryCheck.notCountedIf[0] : script.nextStepAdvice.childMessage,
      audioText: `${headline} ${mathReason}`
    };
  }

  return {
    status: "incorrect",
    headline: "Not yet. Let's use the model.",
    explanation: `The correct answer is ${question.explanation.correctAnswerLabel}. ${script.feedback.incorrectPattern} ${mathReason}`,
    mathReason,
    nextAction: script.rescue.explanation,
    rescueSuggested: true,
    audioText: `Not yet. ${script.rescue.explanation}`
  };
};

export const getLearningScriptSpeech = (script: SkillLearningScript) =>
  [
    script.lessonTitle,
    script.lessonBigIdea,
    ...script.lessonSteps.map((step) => step.audioText ?? step.text),
    script.workedExample.answerStatement
  ].join(" ");
