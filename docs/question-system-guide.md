# FartMaths Question And Skill System Guide

This document explains how the current app organizes skills, question types, question generation, learning flow, and mastery progression. It is written as a working map for product/design decisions, not only as code documentation.

## 1. The Big Picture

FartMaths has three layers that work together:

1. Curriculum layer
   - Defines what the child is learning.
   - Lives mainly in `src/data/catalog.ts`.
   - Output: 13 strands x 10 levels = 130 skills.

2. Pedagogical UX layer
   - Defines how each skill should be taught.
   - Lives mainly in `src/data/pedagogicalUxMapping.ts`, `src/engine/questionPlan.ts`, and `src/engine/learningLoop.ts`.
   - Output: lesson model, visual model, exercise style, feedback style, rescue move, mastery rule.

3. Runtime app layer
   - Decides what the child sees next and records progress.
   - Lives mainly in `src/engine/progression.ts` and `src/app/App.tsx`.
   - Output: lesson point, practice item, mastery check, checkpoint, dashboard progress.

The app is therefore not just a list of static questions. It is a question generator plus a progression system.

## 2. Core Data Flow

The normal path is:

```text
catalog strand/skill
  -> skill pedagogical UX mapping
  -> question generation plan
  -> generated question
  -> rendered interaction
  -> answer feedback
  -> progress update
  -> next task
```

In code:

```text
src/data/catalog.ts
  STRAND_SEEDS -> STRANDS -> SkillDefinition

src/data/pedagogicalUxMapping.ts
  skillId -> pedagogical UX mapping

src/engine/questionPlan.ts
  createQuestionGenerationPlan(skill, mode)

src/engine/questions.ts
  generateQuestion(skill, mode)

src/app/App.tsx
  TaskScreen -> QuestionSupportVisual -> TaskInteraction

src/engine/progression.ts
  advanceAfterAnswer(...)
```

## 3. Strands And Skills

The app currently has 13 strands:

1. Number Recognition & Counting
2. Counting Objects / Cardinality
3. Comparing Numbers & Sets
4. Addition & Subtraction
5. Place Value
6. Word Problems
7. Measurement
8. Time
9. Money
10. Data & Graphs
11. Geometry
12. Equal Shares
13. Arrays & Odd/Even

Each strand has exactly 10 levels. That makes 130 skills total.

Each generated `SkillDefinition` has:

```text
id
strandId
level
title / summary
activityType
ccssCodes
gradeBand
constraints
pedagogicalUx
scaffold
prompt
celebrationTitle
```

The important idea: a "skill" is the curriculum target. A "question" is only one generated activity used to teach or check that target.

## 4. What Is A Skill?

A skill is a small learning target, for example:

```text
measurement-level-01
Use words like taller, shorter, longer, heavier
```

A skill answers:

```text
What should the child understand?
What grade band / Common Core target does it belong to?
What number/object limits should apply?
What visual model should we use?
What feedback should we give?
What counts as mastery?
```

Skills are stored in the catalog, but each skill is enhanced with a pedagogical UX mapping.

## 5. The Four Teaching Modes

Questions are generated in one of four modes:

1. `example`
   - The first lesson-point moment for a new skill.
   - The child sees a teaching explanation and a worked example.
   - This is not meant to be a cold test.

2. `practice`
   - Guided practice.
   - Hints can appear.
   - Mistakes can lead to support and retry.

3. `check`
   - Scored mastery evidence.
   - First-try correctness matters.
   - Hints, retries, and too-fast answers do not count as clean mastery.

4. `placement`
   - Used at the beginning to estimate the starting level in each strand.
   - Current placement probes levels 2 and 5 for each strand.

The same skill can generate different questions depending on mode.

## 6. Activity Types

`ActivityType` is the concrete UI interaction. It tells the app what component to render.

Current activity types:

| Activity Type | What The Child Does | Main Data Needed |
| --- | --- | --- |
| `count-and-tap` | Tap objects to count them | `countTap` |
| `drag-to-match` | Drag a choice to a target | `drag`, `choices` |
| `choose-the-answer` | Tap one answer card | `choices` |
| `compare-two-groups` | Compare left/right/same | `groups`, `choices` |
| `number-line-tap` | Tap a number line stop | `numberLine`, choices/targets |
| `fill-ten-frame` | Build/fill a ten-frame | `tenFrame` |
| `build-a-number` | Build hundreds/tens/ones | `buildNumber` |
| `shape-sort` | Sort or pick shapes | shape choices or drag model |
| `graph-reading` | Read a bar/picture/line plot | `graph` |
| `clock-choice` | Pick matching analog/digital clock | `clockChoices` |
| `odd-even-pairing` | Pair objects to decide odd/even | `groups` or `drag` |
| `array-counting` | Read/count an array | `arrayData` |
| `coin-counting` | Count coin value | `coins`, `choices` |
| `story-scene` | Solve a visual story problem | `story` or `groups` |

This list is in `src/types.ts`.

## 7. UX Pedagogical Concepts

There are several names that sound similar but mean different things.

### `UxPedExerciseType`

This is the teaching intention, not the exact UI component.

Examples:

```text
tap-to-count
choose-visual-answer
left-right-same
drag-to-category
build-model
match-pair
number-line-sequence
story-scene
read-model
explain-strategy
```

### `UxPedVisualModel`

This is the visual representation used to teach the math.

Examples:

```text
objects-arranged
objects-scattered
ten-frame
part-part-whole
base-ten-blocks
number-line
clock-face
schedule-timeline
coin-set
bar-picture-graph
shape-model
equal-share-model
array-grid
measurement-lineup
story-scene-model
```

### `UxPedLessonModel`

This describes how the lesson is introduced.

Examples:

```text
show-and-name
worked-example
step-by-step-model
manipulative-demo
notice-pattern
mistake-contrast
strategy-choice
```

### `UxPedFeedbackType`

This decides the style of feedback.

Examples:

```text
confirm-and-name
show-correction
counting-error-feedback
compare-again
model-step-again
strategy-reminder
mistake-contrast-feedback
reduce-and-retry-feedback
transfer-praise
next-step-feedback
```

### `UxPedRescueMove`

This is what the app should do when the child struggles.

Examples:

```text
reduce-set-size
align-compare-groups
short-hand-first
split-place-value
show-unit-iteration
pair-and-leftover
act-out-story
worked-example-reset
```

## 8. How A UX Profile Becomes A Question

The important resolver lives in `src/engine/questionPlan.ts`.

The app starts with:

```text
skill + mode
```

Then it looks up:

```text
skill.pedagogicalUx
```

Then it creates:

```text
QuestionGenerationPlan
```

That plan includes:

```text
skill
mode
uxProfile
primaryUxActivity
activityType
lessonModel
visualModel
feedbackType
rescueMove
constraints
anatomy
generationIntent
```

The plan decides the final `ActivityType`.

Example:

```text
primaryUxActivity = left-right-same
visualModel = measurement-lineup
=> activityType = compare-two-groups
```

Another example:

```text
primaryUxActivity = choose-visual-answer
visualModel = clock-face
=> activityType = clock-choice
```

This is why it can be confusing: the skill may say "Measurement", the UX profile may say "measurement-lineup", and the concrete UI may be `compare-two-groups`.

## 9. QuestionDefinition Anatomy

Every generated question becomes a `QuestionDefinition`.

Key fields:

```text
id
skillId
strandId
level
mode
type
prompt
speech
supportText
hint
minResponseMs
choices
correctChoiceId
presentation
explanation
visual data
```

Visual data is optional depending on question type:

```text
groups
tenFrame
numberLine
buildNumber
graph
clockChoices
coins
countTap
drag
arrayData
story
```

The renderer in `App.tsx` checks the question and chooses the right UI:

```text
count-and-tap      -> CountTapActivity
fill-ten-frame     -> FillTenFrameActivity
build-a-number     -> BuildNumberActivity
number-line-tap    -> NumberLineActivity
question.drag      -> DragActivity
default            -> ChoiceGridActivity
```

## 10. Question Generation

The main generator is `src/engine/questions.ts`.

There are two styles inside that file:

1. Older strand-specific generators
   - Example: `measurementQuestion`, `timeQuestion`, `moneyQuestion`
   - These are direct functions for each strand.

2. Newer plan-based generators
   - Example: `generateCompareFromPlan`, `generateClockFromPlan`, `generateStoryFromPlan`
   - These use the `QuestionGenerationPlan`.

The current public generator path is:

```text
generateQuestion(skill, mode)
  -> createQuestionGenerationPlan(skill, mode)
  -> generateQuestionFromPlan(plan)
  -> validateGeneratedQuestion(question, plan)
  -> repairOrFallbackQuestion(...) if needed
```

The validation step checks:

```text
activity type matches plan
required fields exist
correctChoiceId matches a choice
choice values are unique
visual support exists
prompt has an action verb
prompt is not too wordy
explanation names the math reason
constraints are respected
```

## 11. Skill Development Logic

Each skill has progress:

```text
not-started
learning
almost-there
mastered
review-needed
```

The intended learning path is:

```text
1. New skill appears
2. Example / lesson point is shown
3. Three guided practice items happen
4. Check items start collecting mastery evidence
5. If the child is ready, a checkpoint appears
6. Passing checkpoint levels up the strand
7. Mastered skills can return later as review-needed
```

Important constants in `src/data/rules.ts`:

```text
GUIDED_SUCCESS_TARGET = 3
SCORED_WINDOW = 20
REQUIRED_FIRST_TRY_IN_WINDOW = 19
MAX_SUSPICIOUS_IN_WINDOW = 2
CHECKPOINT_LENGTH = 5
CHECKPOINT_PASS_SCORE = 4
```

This means the app is strict: mastery is not just "got one right". It needs many clean first-try answers and a checkpoint.

## 12. Session Planning

Session planning lives in `src/engine/progression.ts`.

When a session starts:

1. The app ranks strands by urgency.
2. If the user opened one category, it focuses that strand.
3. If a checkpoint is ready, it queues checkpoint questions first.
4. If a new skill has not shown an example, it queues:

```text
1 example
3 practice items
```

5. Otherwise it mixes:

```text
current skill checks
previous skill review
older weak skill review
```

The mix constants are:

```text
REVIEW_MIX.current = 0.7
REVIEW_MIX.previous = 0.2
REVIEW_MIX.olderWeak = 0.1
```

If the child struggles early in a new level, rescue mix can pull in easier previous material.

## 13. Answer And Feedback Flow

When the child answers:

1. `App.tsx` checks if the selected choice matches `correctChoiceId`.
2. It measures response time.
3. If the answer was too fast, it is marked suspicious.
4. `buildPedagogicalFeedback(...)` creates the feedback.
5. `advanceAfterAnswer(...)` updates progress.
6. The review card shows feedback and waits for the child to click `Next`.

Current desired behavior after the latest UI change:

```text
wrong answer:
  TTS says only the short funny wrong-answer line.
  The longer correction can be visible, but not spoken automatically.

correct answer:
  TTS says correct headline + math explanation.
  Explanation appears on transparent background.
  Child clicks Next to continue.
```

## 14. Why Some Questions Feel Misaligned

The biggest current risk is not missing code. The biggest current risk is semantic mismatch.

Example of the problem:

```text
Skill says: Use measurement vocabulary.
Question generated says: Which side has more?
```

Technically this is a valid `compare-two-groups` question. But pedagogically it may be weak because "more" is quantity comparison, not necessarily measurement vocabulary like longer/shorter/taller/heavier.

Another possible problem:

```text
Skill says: Recognize numerals 0-5.
Question generated says: Choose the triangle.
```

This can happen when the skill's UX profile or visual model points the generator toward a shape model that is technically valid but does not match the skill target.

So we need to distinguish:

```text
valid question shape
vs.
correct question for this exact skill
```

The app currently validates the first better than the second.

## 15. Current Audit Tools

There are audit helpers:

```text
src/engine/questionAudit.ts
src/engine/learningLoopAudit.ts
src/data/uxPedQa.ts
```

They can check:

```text
question generation shape
required visual data
fallback usage
learning-loop descriptors
copy length
mastery safety
taxonomy consistency
```

What they do not fully solve yet:

```text
Does this generated question truly teach this exact skill?
Is the child-facing wording natural for a 4-7 year old?
Is the visual model the best one for the skill?
Does the theme image support or distract from the math?
```

Those need a stronger human-reviewed QA layer.

## 16. My Recommended Priority Now

Priority 1: lock the skill-to-question alignment.

Before adding more visuals, more lesson images, or more UI polish, we should make sure every skill generates questions that actually match its learning goal.

Recommended work:

1. Build a "question matrix" for all 130 skills.
   - For each skill, list:
     - strand
     - level
     - learning goal
     - visual model
     - activity type
     - example prompt
     - practice prompt
     - check prompt
     - risk notes

2. Audit the first 3 levels of every strand by hand.
   - These are the most important because young children will see them first.
   - Fix confusing mappings first.

3. Make each strand's first 3 levels feel perfect.
   - Clear prompt.
   - Correct visual.
   - Correct voice.
   - One obvious action.
   - No mismatch between skill and activity.

4. Then audit levels 4-10.
   - These can be slightly more abstract, but still need exact alignment.

5. Add a developer QA page or export.
   - A parent/developer mode that shows generated samples for every skill.
   - This would let us inspect and approve quickly without playing the whole app.

## 17. What I Would Do Next

I would not start by adding more card art or changing the dashboard again.

I would do this:

```text
Next pass: Question Alignment QA
```

Scope:

```text
Generate sample questions for all 130 skills in example/practice/check modes.
Create a readable audit table.
Flag mismatches.
Fix the worst mappings and generators.
Test the first session flow for a new child.
```

Success criteria:

```text
Every first-level skill produces a question matching the skill title.
Every visible prompt uses the correct math language.
Every question has one clear action.
Every wrong answer has short TTS.
Every correct answer waits for Next.
Every strand starts with a satisfying child experience.
```

## 18. Practical Rule For Future Work

When adding or changing a skill, always check these four things:

```text
1. Skill target
   What exact math idea are we teaching?

2. Visual model
   What should the child look at?

3. Interaction
   What should the child do?

4. Feedback
   What should the app say when right/wrong?
```

If any of those four are misaligned, the question may look functional but still teach the wrong thing.

