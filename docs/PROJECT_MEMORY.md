# Nihongo App Project Memory

## Product Direction

Nihongo App is a Japanese-learning app for Arabic-speaking learners. The core product should stay focused on guided learning, accurate content, daily practice, pronunciation, review, and lightweight community support.

The app should feel playful, soft, and motivating, but not visually noisy. The learning flow should be clearer than the feature list.

## Standing Working Agreement

- Implement requested changes directly unless the user explicitly asks for planning only.
- Preserve existing working features and avoid unrelated rewrites.
- Prefer small, verifiable changes over large rewrites.
- Keep the learner journey central: continue, learn, practice, review.

## Current Architecture Notes

- `src/App.jsx` is currently the main orchestration point for routing, auth, profile, community, lessons, progress, settings, AI, and gamification. It should be gradually split into feature modules.
- `src/types/learning.ts`, `src/content/lessonModule.ts`, and `src/content/contentStore.ts` define a stronger normalized learning model, but not every feature reads from it yet.
- Exercise logic is split across vocabulary, grammar, lesson, quiz, and exam components. Long term, these should share one exercise engine.
- Progress exists in multiple layers: app-level lesson progress, local learning progress, SRS, mistakes, and cloud account sync. These need one canonical model.

## Learning System Target

Each lesson should eventually be treated as five clear sections:

1. Warmup
2. Vocabulary
3. Grammar
4. Practice
5. Mastery Check

The lesson node progress ring should reflect these five sections. Completion should not equal mastery. Mastery should combine section completion, answer accuracy, spaced review, and mistake resolution.

## Immediate Technical Priorities

1. Stabilize progress persistence and cloud merge behavior.
2. Route all exercises through shared answer validation, feedback, audio, hearts, SRS, and mistake tracking.
3. Make lesson sections derive from actual content instead of fixed counters.
4. Reduce duplicated navigation and duplicated progress displays.
5. Remove or archive stale screens after confirming no imports.
6. Keep Admin Dashboard internal and evolve it into a structured content editor with validation.

## Known Risks

- Exact string matching can mark correct Japanese answers wrong when punctuation or spacing differs.
- Some exercise flows do not currently feed mistakes and SRS consistently.
- A fixed `sectionCount = 5` exists while derived lesson sections may include more than five display sections.
- Community and AI features can distract from the learning path if surfaced too aggressively.
- Audio playback needs consistent mobile-safe behavior across every exercise component.

## Recent Fixes

- `recordLessonStat` now preserves existing lesson fields such as completed sections.
- `mergeProgressState` now merges lesson sections instead of replacing an entire lesson record with the newest stats record.

---

## FULL REDESIGN (approved — autonomous execution of all phases)

Driven by a 77-finding read-only audit (run `wf_6c4fcb3f-9e4`: 5🔴 / 21🟠 / 30🟡 / 21⚪). Goal: best-in-class calm/premium Arabic→Japanese learning experience. Phases, ordered by impact:

- **Phase 0 — Trust & correctness** ✅ DONE (below)
- **Phase 1 — Focus Mode + home calm-down:** immersive full-screen section/exercise (only content + progress + section title + back); standardize Practice tab + Reading questions onto `ExerciseContainer`; express level progress once (drop duplicate ring/strip); collapse level-strip to a pill; drop gems chip from topbar; cut clicks-to-content.
- **Phase 2 — Content gaps:** author kanji glosses (meaningAr + on/kun) + per-level kanji (N4/N3 reuse N5); dialogue+reading for the remaining ~58 lessons (N5 18-25, all N4, all N3 = 0 today); gate N2/N1 behind "coming soon".
- **Phase 3 — Exercise/feedback consolidation:** unify the 7-step wrong-answer feedback into one shared handler; merge the 3 engines (Grammar/Vocab/Character) onto shared primitives + a `{type→Component}` registry; one `ResultCard`.
- **Phase 4 — Architecture:** real routing + `React.lazy`/`Suspense` (lazy-load N4/N3 packs & rare screens); de-monolith `App.jsx` into domain contexts/reducers (auth/economy/quiz/exam/progress); central i18n `t(key)`.
- **Phase 5 — Learning depth & gamification maturity:** per-skill retention panel (vocab/grammar/kanji); ≥3-level SRS confidence (Forgot/Hard/Easy); adaptive path (use mastery/needsRefresh); one Sensei persona shared by text+voice; one calm achievement-unlock moment.
- **Phase 6 — Dead-code & hygiene sweep:** remove orphaned `screens/Home|Letters|Lesson|Vocab.jsx`, dead mascot pair, `App.css`, empty `sampleLessons/`, POC `n5-lesson01.sections.js`, `createSenseiRealtimeSecret`, `legacyLessons`, Sensei prompt-preview dump; replace ordinal barrels with a manifest.

### Phase 0 — DONE
1. **Punctuation-insensitive validation (🔴).** New `src/utils/answerMatch.js` (`normalizeAnswer`/`answersMatch` strip whitespace + JP/AR/ASCII punctuation). Wired into all 4 chip-builders: `OrderExercise` (LessonSections), `GrammarExercises`, `VocabExercises`, `SentenceBuilderQuiz`. Fixes the bug where every "arrange the words" item was unbeatable (answer ends in 。 but no 。 chip exists).
2. **SRS on correct answers (🔴).** `ExercisesSection.handleAnswer` now `trackAnswer`s matched grammar/vocab on BOTH correct & wrong (was wrong-only) so learned items enter SM-2.
3. **Honest streak.** `reconcileStreak` (app-open = lapse-only, never advances) replaces `nextStreakValue` at the 2 load sites. `registerStudyActivity(xpGain)` advances streak once/day **only on real study** (quiz finish, exercise-session done, smart-review done) + grants +15 XP for non-kana actions. Threaded via `onStudyActivity`/`onStudyComplete` (App→LessonView→ExercisesSection; App→SmartReview).
4. **findGrammarRule fallback removed** → returns `null` (no misleading "why you were wrong").
5. **Speaking-skip neutralized** — `SpeakSectionExercise.onSkip` advances without scoring (was free correct/mastery).
6. **reviewStreak survives login** — `mergeProgressState` carries `reviewStreak` (newest by lastDate).

### Phase 1 — DONE
- **Immersive Focus Mode.** `LessonView` restructured: `section === 'overview'` = the guided-path hub (`LessonSectionPath`, the ONLY lesson navigator — the 10-tab bar is removed). Selecting a section renders a full-screen `.lesson-focus` overlay = minimal header (back-to-path + section title + `X / Y` step) + the section content only. No topbar/tabs/global stats inside. Study sections (Examples/Dialogue/Reading) take `onNext` → a "Continue →" button that advances to the next path section (`nextSection`/`.section-continue`). CSS in index.css (`.lesson-focus*`).
- **Calm home.** Gems chip removed from topbar (hearts + streak only). Level-strip only renders when `unlockedLevels.length > 1` (fresh learner = no lateral nav). Sensei FAB moved out of home content to app-shell (shows on all main tabs, hidden in lessons/focus).

### Phase 2 — DONE
- **Dialogue + reading for ALL 75 lessons** (was 17). A 59-agent workflow authored the 58 missing ones (N5 18-25, N4 1-25, N3 1-25), each grounded in its own lesson's vocab/grammar. Verified at runtime: 75/75 have dialogue + reading, **0 invalid questions** (every `answer` ∈ its `options`).
- **Kanji Arabic meanings** — `src/content/kanjiMeanings.js` (105 glyph→{meaningAr,onyomi,kunyomi}), wired into `buildKanjiStore` (store now has meanings for all 105). SmartReview `KanjiReviewCard` upgraded to test **meaning recall** (glyph → Arabic meaning, the previously-missing dimension) and reveal the readings after answering.
- **N2/N1 gated** — `levels` entries carry `comingSoon: true`; level-strip renders them disabled with a "قريباً/Soon" label, no entrance-exam trigger.
- The earlier "kanjiMeanings is not defined" console errors were stale HMR (added the usage one edit before the import); fresh build + reload are clean.

### Phase 3 — core consolidation DONE (engine-merge deferred)
- **Consistent mistake/SRS tracking across ALL exercise engines.** GrammarExercises and VocabExercises/VocabPracticeAll previously fed NO weakness/SRS data (red-flash only). Added: GrammarExercises takes `lessonId`+`ruleTitle` and `trackAnswer`s the grammar rule on every answer; VocabExercises/VocabPracticeAll take `lessonId` and track the target vocab item (shared `trackVocabAnswer` helper). Wrong answers now surface in Mistake Review + Smart Review (which carry the rich explanations), closing the learning loop everywhere. Wired from the lesson grammar/vocab sections + Mastery-Check challenges.
- DEFERRED (maintainability, higher-risk structural refactor, not user-facing): merging the 3 engines onto a single `{type→Component}` registry, and unifying `screens/Result.jsx` into the shared `ResultCard`. Best done as focused dedicated work.

### Phase 6 — partial (safe orphan removal) DONE
Removed 7 verified-zero-importer files: `screens/{Home,Letters,Lesson,Vocab}.jsx`, `components/characters.jsx`, `App.css`, `content/lessons/n5-lesson01.sections.js`, plus empty `src/learning/sampleLessons/`. Build still 288 modules (confirming they were outside the dep graph). NOTE: audit was WRONG that `JoniCharacter.jsx` is dead — it's live via `RuaaMascot`; kept. Left `functions/*` (user actively building realtime voice), `legacyLessons` (risky shape), and the Sensei prompt-preview (user's active area) untouched.

### Phase 4 — code-splitting slice DONE (router + de-monolith deferred)
- **React.lazy + Suspense for rare/heavy screens.** Converted in App.jsx: `SmartReview`, `AiSenseiPanel`, `AdminDashboard`, `Exam`, `ExamIntro`, `ExamResult` → `lazy()`, each render site wrapped in `<Suspense fallback={<ScreenFallback/>}>` (ScreenFallback = the brand loading splash). `ScreenFallback` defined just below the lazy imports.
- **Result:** eager first-paint chunk **2.25MB → 2.03MB**; ~211KB pulled into on-demand chunks. Biggest win = `AiSenseiPanel` (176.8KB / 50KB gz — it drags in the Anthropic SDK) now loads only when Sensei opens. Separate chunks: Exam 9.1KB, SmartReview 7.5KB, kanjiMeanings 7.6KB, AdminDashboard 5.6KB, ExamIntro 2.6KB, ExamResult 2.1KB.
- **DrawingPad kept STATIC** — `screens/Quiz.jsx` statically imports it, so lazy()ing it is ineffective (INEFFECTIVE_DYNAMIC_IMPORT warning); reverted to a plain import.
- Verified: clean `vite build` (288 modules, no warnings), live-loaded `AiSenseiPanel` end-to-end through Suspense (no error overlay), all 5 other lazy chunks dynamic-import with valid default exports.
- The earlier `kanjiMeanings is not defined` console errors are STALE HMR buffer (single fixed `?t=1781314318232`) — a fresh `import('/src/content/stores.ts')` runs `buildKanjiStore` fine (`lookupKanji` → 105/105 entries have meaningAr). Not a real error.
- DEFERRED (highest-risk, dedicated work): real router, de-monolith App.jsx into domain contexts/reducers, central i18n `t(key)`, lazy-loading N4/N3 content packs (data.js is woven into synchronous top-level render — risky).

### Phase 5 — learning depth & gamification maturity DONE
Built from a 7-agent read-only subsystem map, then adversarially reviewed (5 dimensions → per-finding verify): 2 real bugs found + fixed (both in the achievement moment), 3 false alarms.
- **3-level SRS confidence (Forgot/Hard/Easy).** `scheduleNext` already took 0–5; the grade was discarded in `recordAnswer`'s 4/2 collapse. Added an optional `quality` to `trackAnswer` (progressStorage.js): when present it calls `scheduleNext(state.srs[key] || createSrsRecord(itemId,itemType), quality)`, else the boolean path (all other callers untouched). SmartReview: `Q_FORGOT=2/Q_HARD=3/Q_EASY=5` + a `ConfidenceButtons` component; removed the vocab/kanji setTimeout auto-advance — a CORRECT pick now shows Hard/Easy, a WRONG pick shows the revealed answer + Next (→ Forgot); grammar card uses all three. `handleAnswer(correct, quality)` threads the grade; `correct` still drives lesson stats / mistake resolution / score. Verified: Easy(2.6)>Hard(2.36)>Forgot(2.18, +mistake, reset); boolean fallback unchanged; itemId/itemType preserved on the graded path.
- **Per-skill retention dashboard.** New pure `src/progress/skillStats.js` `getSkillRetention(state)` buckets `state.srs` by `record.itemType` (skips the synthetic `mistake` type) → `{total, due, strong, strengthPct}` per vocab/grammar/kanji; `strengthPct = round(masterySum/(total*5)*100)` — an honest **memory-strength PROXY** (SRS stores no per-item accuracy). New self-contained `RetentionPanel.jsx` (reads readProgressState in a useMemo, live-refreshes on PROGRESS_CHANGED_EVENT, returns null when empty) rendered in the **profile** View-Progress section (home stays calm). Verified live: vocab 70%/grammar 80%(green strong bar)/kanji 20% with correct due counts + RTL labels.
- **One shared Sensei persona.** New `src/ai/senseiPersona.ts` = the single source: `SENSEI_NAME_AR/EN`, `senseiTextPersona(ctx)`, `senseiVoiceIdentity()`, `SENSEI_VOICE_RULES_AR`, `SENSEI_CORE_RULE_AR`. `promptTemplates.ts` (text) + `senseiCall.ts` (voice) now import it. Verified the produced text+voice system prompts are **byte-identical** to the originals (zero AI-behaviour change). The realtime SERVER `functions/index.js` keeps its own copy (a Cloud Function can't import client TS — left untouched, it's user-protected).
- **Calm achievement-unlock moment.** A toast (`.achievement-toast`, app-shell, auto-dismiss 4.5s, queued so simultaneous unlocks each show). Detection model: **absorb-until-studied** — gated on `dataReady`; until the first real study action (`studiedSessionRef`, set in `registerStudyActivity`) every currently-unlocked achievement is absorbed into the persisted `seenAchievements` set SILENTLY, so neither the multi-render stat-hydration nor a cross-device login ever toasts an old unlock; only post-study locked→unlocked transitions fire. `seenAchievements` persists in the progress store (auto cloud-sync), unioned in `mergeProgressState`. **Why absorb-until-studied**: the simpler `undefined`-seed guard still mis-fired because guest/cloud stats load across several renders → a late-loading old unlock looked "fresh" (caught in live testing, hence the refinement).
- Verified: clean `vite build`; live — no spurious toast on load even through the stat-loading race; toast renders (text/icon/fixed pos); all pure logic unit-tested through the live dev modules.

### Remaining
- **Phase 3 remainder**: engine-registry merge + one ResultCard.
- **Phase 4 remainder**: router + de-monolith + i18n + content-pack splitting (deferred above).
- **Phase 5 follow-ups (optional)**: a true per-skill accuracy accumulator (vs the masteryLevel proxy) would need a new `{attempts,correct}` per-skill counter in `trackAnswer`; opening-streak achievements won't toast (only study-driven ones do — acceptable).

### Gotchas confirmed this session
- `.env.local` `VITE_ANTHROPIC_API_KEY` = LOCAL dev only (in browser bundle — never deploy with it; prod uses `askSensei` cloud fn). Committed key was screenshot-exposed → rotate.
- Dialogue/reading: all 75 lessons done (Phase 2). Kanji glosses populated in `src/content/kanjiMeanings.js` (105 N5).
- SRS itemType partitions vocab/grammar/kanji + a synthetic `mistake` (per-exercise pseudo-items) — exclude `mistake` from per-skill stats. Bucket by `record.itemType`, not by splitting the `${itemType}:${itemId}` key (itemIds can contain colons).
- Lesson progress key = `${currentLevel}-${activeLesson.id}`.
- No `tsc` in build; verify in live preview (preview_screenshot flaky → use DOM queries).
