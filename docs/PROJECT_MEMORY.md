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
- Added a central browser audio service in `src/utils/audioPlayer.js`. All Japanese pronunciation and feedback sounds should go through `src/sounds.js`, which now wraps the central player. Avoid new scattered `new Audio(...)` or direct `speechSynthesis` calls unless there is a feature-specific reason.
- Current app has no bundled mp3/wav/ogg/m4a lesson audio files. Japanese pronunciation relies on Web Speech API TTS, with optional remote TTS fallback. Audio failures emit a global app notice instead of silently failing.

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

### Phase 6 — dead-code sweep (remaining safe scope) DONE
- **Removed `legacyLessons`** from data.js (130-line const). It was already dead: `lessons = [...n5Lessons, ...legacyLessons.slice(n5Lessons.length)]` and `legacyLessons` had 5 entries vs `n5Lessons` 25, so `.slice(25)` was always `[]`. Export is now `export const lessons = [...n5Lessons]` (behavior-identical). Build clean.
- **Orphan scan**: only `main.jsx` (the Vite entry, referenced by index.html) shows as unimported → no dead source files remain (the earlier sweep was thorough).
- **NOT removed (deliberate)**: `createSenseiRealtimeSecret` lives in `functions/index.js` — protected (user's active realtime-voice area; removal needs a redeploy). The Sensei prompt-preview `<pre>` in AiSenseiPanel.jsx is **user-facing** (labeled "Prompt that would be sent (preview)") and may be an intentional privacy-transparency feature — flagged, not removed. Ordinal-barrel→manifest is cosmetic/low-value — skipped.

### Phase 3 remainder — NOT DONE (assessed not beneficial)
On inspection both items would harm rather than help:
- **Engine `{type→Component}` registry**: the 3 engines (GrammarExercises/VocabExercises/CharacterExercises) are invoked at distinct context-specific call sites that already know which drill they want (grammar section→grammar, vocab→vocab, character screen→kana/kanji). There is NO single dispatch point selecting by `type`, so a registry adds indirection with no benefit and real rewiring risk.
- **One ResultCard**: `screens/Result.jsx` (rich quiz-result screen: score-ring, perfect/good/practice title, XP, retry) and `exercise-ui/ResultCard.jsx` (minimal in-exercise finish card) serve genuinely different UX. Merging would REGRESS the quiz screen. Left as-is.

### Phase 4 — de-monolith IN PROGRESS (incremental, one domain at a time)
- **i18n extraction DONE**: the 242-line static `copy` (ar/en UI strings) moved out of App.jsx into `src/i18n/copy.js` (`export const copy` + `getCopy(lang)`); App.jsx imports it. Pure const move, zero behavior change. Build clean.
- **Exam domain extraction DONE**: the entrance/exit exam state machine (examState + startExitExam/startEntranceExam/finalizeExam/handleExamAnswer/handleSectionStart/forceFinishSection + the auto-advance useEffect) moved verbatim into `src/hooks/useExam.js`. App calls `const {…} = useExam({ screen, setScreen, kanjiReadingMode, setLevelExams, setUnlockedLevels, buildExamQuestions })` at the old `examState` useState site (all deps declared by then). `buildExamQuestions` stays in App.jsx (its helper cluster is large) and is injected. **Verified live end-to-end**: N3 entrance exam — startEntranceExam→exam-intro→section-start (handleSectionStart)→stable Q1→answer (handleExamAnswer)→auto-advance to Q2, no errors. (Reachable only by temporarily setting guest `unlockedLevels:['N5','N4']` so N3 is the next-locked level; the level-strip shows only when >1 level unlocked.)
- **NOT done yet (next increments, rising coupling)**: kana-quiz domain, hearts/economy, character/drawing, then the big ones — real router (replace `screen`/`tab` state machine) and the tangled progress/auth state. Do each one-at-a-time, verify live, keep the user able to test. Content-pack lazy-splitting (N4/N3) stays risky (data.js woven into sync render).
- **Pattern that works**: extract a cohesive domain's state+handlers+effects into `src/hooks/useX.js`, inject the cross-domain deps (setScreen, economy setters, study sinks) as params, return the public surface, call it at the original useState site. Verbatim move = behavior-preserving; build + a live walk-through of that domain's flow confirms.

### Remaining (need user go-ahead / dedicated effort)
- **Phase 4 big refactor**: router + state→contexts de-monolith + N4/N3 content-pack splitting. Do incrementally, verifying each step live.
- **Phase 5 follow-ups (optional)**: a true per-skill accuracy accumulator (vs the masteryLevel proxy) would need a new `{attempts,correct}` per-skill counter in `trackAnswer`; opening-streak achievements won't toast (only study-driven ones do — acceptable).

### Home dashboard simplification (level selector → top bar) DONE
Goal: reduce clutter on Home; level is one-at-a-time info that doesn't need permanent visibility.
- **Removed from Home**: the large `.dashboard.dashboard-calm` level card (ring + "المستوى N5" + %) AND the `.level-strip` (N5/N4/N3 row). Home content now: TodayWidget → unit-card → lesson-path (cleaner, focused on continue/review/weak/goal).
- **New `src/components/LevelSelector.jsx`**: compact top-bar dropdown ("N5 ▾"). Self-contained (own open state, closes on outside-`pointerdown`/Escape/selection). Lists all levels: unlocked → `setCurrentLevel`; next-locked → `startEntranceExam` (the relocated entrance-exam trigger); comingSoon (N2/N1) disabled with "قريباً". Rendered in `.app-topbar` (now `justify-content: space-between`, with `.top-stats` flex). Props injected from App (levels, currentLevel, unlockedLevels, LEVEL_ORDER, levelExams, setCurrentLevel, startEntranceExam).
- **Level progress relocated to Profile › View progress**: new `.profile-level-card` (the `dashboard-progress-ring` + "المستوى N5 / أساسي") above the stats grid.
- CSS added: `.level-selector*`, `.profile-level-card` (index.css, after `.app-topbar`). The old `.dashboard-calm`/`.level-strip` CSS is now unused (left in place, harmless).
- Verified live: home card+strip gone; topbar shows "N5 ▾"; dropdown lists N5(active)/N4(entrance)/N3(locked)/N2·N1(soon); selecting N4 launches the N4 entrance exam; Profile shows the level ring. No console errors.

### Community feed redesign (HelloTalk-style) DONE
Goal: modern dark social-learning feed. Decision (user): reuse the real Firestore backend; .jsx components + central .ts types; no partial TS migration.
- **Kept 100% of `CommunityHub`'s container** (state/effects/handlers: Firestore questions/replies/follows/DMs/notifications + both modals). **Only the render was rebuilt** as a feed. Real `communityQuestions` are mapped to feed posts (`mapQuestionToPost`); the full reply thread (compose/edit/delete/report) is reused verbatim via a `renderThread(post)` render-prop — zero backend logic duplicated. Mock data (`src/data/communityMockData.js`) covers only the no-backend types (voice rooms, challenges, correction/teacher/exchange samples).
- **New files**: `src/types/community.ts` (central types); `src/data/communityMockData.js` (9 tabs `COMMUNITY_TABS` + `postMatchesTab` + `MOCK_COMMUNITY_POSTS`); `src/components/community/` → CommunityIcons, CommunityHeader, CommunityTabs, CommunityActionBar, CommunityCommentPreview, VoiceRoomCard, DailyChallengeCard, CommunityPostCard, CommunityFeed (all .jsx). CSS `.cm-*` block appended to index.css.
- **Header**: DMs + friend-requests (start) → existing `openInbox`; rounded search (filters feed); notifications → `openInbox`; profile → own profile modal. Self-contained inline SVG icons (no new icon-registry deps).
- **Tabs** (9): آخر الأحداث/لك/مساعدة/غرف صوتية/تبادل لغوي/بالقرب مني/تحديات/أسئلة القواعد/مفردات اليوم — horizontal-scroll, filled-active pill, filter feed by type/tags (no reload).
- **Post card**: avatar+name+level chip+AR⇄JP+menu; expandable content; JP/romaji/translation; tags; action bar (like/comment/save/share/translate, +correct for corrections); 1–2 comment preview + "view all"; type switch → VoiceRoomCard / DailyChallengeCard; teacher styling. Like = optimistic local + real `likeQuestion`; save = local Set (no backend yet); translate = notice when unavailable.
- No router changes (tab state machine). RTL-correct (logical CSS). `App.jsx` imports the new pieces; the old grid cards (leaderboard/groups/AI corrector/partner) were removed from the render — their handlers (`joinGroup`, `checkSentence`, `talkToPartner`, `studyGroups`) are now unused but left in place (harmless, no build error).
- Verified live: 9 tabs render + filter (voice→2, challenges→2 answerable, help→correction w/ comment preview); like toggles; challenge self-grades ("✓ صحيح"); notifications opens inbox; profile opens modal. Build clean, no console errors.

### Dedicated DMs + Notifications screens + density pass DONE
- **No router** → dedicated screens are a lifted `communityView` state in App.jsx (`'feed'|'dm-inbox'|'dm-chat'|'notifications'|'notif-settings'`), passed into `CommunityHub`. When `tab==='community' && communityView!=='feed'` (`inCommunityScreen`), App hides the topbar + bottom-nav + Sensei FAB so the screen is full/focused. `communityView` resets to 'feed' via `useEffect` whenever you leave the community tab.
- **CommunityHub** keeps ALL Firestore logic and now early-returns the dedicated screen for each `communityView` (before the feed return). Derives `conversations` (group `messages`+`sentMessages` by counterpart → last msg / unread / status / `timeAgo`), `activityNotifications` (notifications **minus** `type:'message'`, newest-first, with `timeAgo`), and `openConversation` (marks that thread read → `setDmProfile` → `dm-chat`). Header DMs→`dm-inbox`, notifications→mark-all-read + `notifications`. `messageProfile` now routes to `dm-chat`.
- **New components** (`src/components/community/`): `DMInboxScreen`, `DMChatScreen`, `NotificationsScreen`, `NotificationSettingsScreen`, `ConversationRow`, `MessageBubble`, `ChatComposer`, `NotificationRow` + icons (Back/Send/Plus/Gear/Image). Chat reuses the same `dmMessages`/`sendMessageToProfile`/`messageDraft` the old dm-modal used (proven). Notification settings persist to `localStorage` (`nihongo-notif-settings`).
- **Density pass**: tightened community (`.cm-header` 8/12→6/8, `.cm-tabs` →8 bottom, `.cm-feed` gap 12→10, `.cm-post` 16→13/14, `.cm-actionbar` 12/10→10/8, `.cm-compose` 12→10) and home (`.today-widget` margin 18→12 / pad 18→14 / gap 14→11, `.retention-panel` 18→14).
- `.cm-screen` = `position:fixed; inset:0; z-index:60` flex column (header / scroll body / pinned composer). `safe-area-inset-bottom` on the composer.
- Verified live: DMs icon → inbox screen (chrome hidden, empty state); notifications → screen (no messages, gear→settings); settings toggle flips + persists; back navigation at every level restores chrome + feed (7 posts); no console errors. DM chat + conversation rows render with real data (not exercised — this guest has no messages — but reuse proven logic + build-valid).
- Old inline dm-modal + `inbox-panel` messages/notifications branches are now superseded (requests branch still used inline); left in place, harmless.

### Spacing −18% pass #2 + global button audit/fixes DONE
- **Spacing**: further tightened the named Home/Community areas — `.cm-search` 40→36h, `.cm-tab` 7/14→6/13, `.cm-compose input` 11→9, `.cm-post` 13→11, `.cm-tags` 12→10, `.today-recommend` 14/16→11/14, `.today-review-cta`/`.today-goal`/`.today-weak-row` →10/11, `.today-widget` gap/margin/pad →10/10/12.
- **Button audit** (8-agent workflow, 221 clickables, 206 already working). Fixed every genuinely-inert one:
  - **Mock-post Comment / Correct / View-all** were no-ops (`onToggleComments` early-returned for `mock-` ids). Removed the guard; `CommunityPostCard` now expands an inline read-only `.cm-thread-mock` (from `commentsPreview`) for non-question posts. ✅ verified live.
  - **Home weak-grammar / weak-vocab cards** were non-interactive stat divs → now `<button>`s → `onReviewWeak(type)` → `setReviewFilter(type)` + `setScreen('review')`. `SmartReview` gained a `reviewFilter` prop that filters the session by `itemType`. (Cards only show when weak items exist.)
  - **DM attach** (Image/File/Location) were stubs → Image/File open a real file picker and send a text placeholder naming the file (TODO: real Storage upload); Location uses `navigator.geolocation` → sends a Google-Maps link. Added `sendMessageBody(body)` (refactored out of `sendMessageToProfile`) + `onSendText` prop through DMChatScreen→ChatComposer.
  - **Notification row** only marked-read → now also opens the sender's profile (`setSelectedProfile` + back to feed).
  - **Profile-card avatar** was a dead affordance → `<button>` → `setScreen('edit-profile')`. ✅ verified live.
  - **DM chat header** (avatar+name) → now a button → opens counterpart profile.
- **Left as-is (not user-facing dead buttons)**: guest "Create account" navigates to login (functional, just duplicate of Login); `SpeakSectionExercise` onAnswer no-op (rare examples-but-no-exercises branch; its record/replay/skip buttons all work); `ReviewSection` unused export + `onQuiz` dead prop chain (dead CODE, no rendered button) — flagged for a cleanup pass.
- Build clean, no console errors.

### Button-audit follow-ups (the 3 deferred items) DONE
- **(a) Sign-up intent**: `Login.jsx` gained an `initialMode` prop (`useState(initialMode==='register'?…)`). App added `authIntent` state + `goToAuth(intent)`; profile "إنشاء حساب" → `goToAuth('register')`, "تسجيل الدخول"/Welcome-login/settings-account → `goToAuth('login')`; `<Login initialMode={authIntent}/>`. ✅ verified live: Create account opens the register form.
- **(b) Speak-practice result**: the examples-but-no-exercises branch's `SpeakSectionExercise onAnswer={() => {}}` → now `recordLessonStat(readProgressState(), String(lesson.id), passed !== false)` (completion counts).
- **(c) Dead code removed**: `ReviewSection` (unused export), the `onQuiz` prop chain (LessonView sig + ExercisesSection call + render), and `startLessonQuiz` (only reachable via the dead onQuiz). `makeLessonVocabQuiz` + `ReviewSpeakingSession` are now orphaned internal helpers (tree-shaken; left in place).
- ⚠️ **Concurrent-edit incident**: `LessonSections.jsx` was being restructured by the user/linter mid-turn (sections reordered — Warmup/Examples moved up, ReviewSection/ReviewSpeakingSession area changed). A line-based `sed` for the ReviewSection removal hit a transient layout and briefly broke the `ExamplesSection`/`WarmupSection` exports (stale HMR errors `?t=1781363931224`). Resolved: final `vite build` clean; a fresh `import('/src/components/LessonSections.jsx')` confirms `ExamplesSection`/`WarmupSection`/`ExercisesSection` export and `ReviewSection` is gone; lesson flow verified live (9-section path + Warmup focus render). **Lesson for next time: prefer Edit (exact-match) over line-range `sed` on files under concurrent edit.**

### Community post interactions → production-grade DONE (admin = planned)
Posts are a mix of real Firestore `communityQuestions` (source 'question') + `MOCK_COMMUNITY_POSTS` (source 'mock'). Interactions are real for questions; mock posts toggle locally.
- **Like** (`toggleQuestionLike`): deterministic like doc `communityQuestionLikes/${qid}_${uid}` (setDoc/deleteDoc — no dupes) + `likeCount` on the question via `increment(±1)` (display `Math.max(0,…)`); optimistic with rollback; liked-state from a `where('userId','==',uid)` likes subscription (persists across refresh, merge-keeps mock ids); fresh like → `notifyQuestionAuthor(…, 'like', "…أعجب بمنشورك")`. mapQuestionToPost likesCount = `q.likeCount`.
- **Comments**: comment/view-all now navigate to a dedicated post screen (`communityView='post'` + `activePostId`; "route" `/community/post/:id` is informational — no router). Reuses `CommunityFeed` with `expandedId=activePostId` so the card shows the full thread (`renderThread` composer/replies for questions, inline mock comments otherwise). Title "التعليقات", chrome hidden. Feed cards no longer expand inline (`expandedId={null}`).
- **Save/Bookmark**: `bookmarks/${uid}_${qid}` (setDoc/deleteDoc) + `where('userId','==',uid)` subscription → `savedPostIds`; optimistic+rollback. New **Saved Posts** screen (`communityView='saved'`, reuses CommunityFeed) + Profile→Settings entries "المنشورات المحفوظة" and "إعدادات الإشعارات" (both `setTab('community')`+`setCommunityView(...)`). NOTE: mock-post saves are local-only (lost on tab unmount); real question bookmarks persist.
- **Translate**: collapsible `.cm-translation` in the card (Original → Translation). Offline gloss `buildGloss` = known-kanji→Arabic from `kanjiMeanings`; honest "لا تتوفر ترجمة" when none. Toggle via the translate action. (Real MT later — could route to askSensei.)
- **Share**: `.cm-share-modal` with the post URL `${origin}/community/post/${id}`, Copy-link (clipboard → "تم نسخ الرابط", fallback shows URL if clipboard blocked), and Native Share (only when `navigator.share` exists). `sharePost` state.
- New shared `feedHandlers` object spreads identical props into the feed + post-detail + saved screens. Firestore: added `bookmarks` collection + `likeCount` field; reused everything else. Copy keys added to `communityText` (ar+en). Build clean; verified live: translate/share/comment-nav/save all work, no console errors.
- **The "battery/streak" topbar icons are REAL** (hearts + streak state, Firestore-synced) — not fake; left as-is.
- **Admin (Part 7) NOT built this turn**: current `AdminDashboard` is lesson-overrides only. A production 12-module admin (ban/suspend ENFORCEMENT, analytics aggregation, feature flags, moderation queue, voice/DM admin) requires **Firestore security rules + an `admin` custom claim** that can't be deployed/verified from here — flagged as the next dedicated phase. Tractable first slice when resumed: tabbed shell + Users (list/search `publicProfiles`) + Reports/Moderation (resolve `communityReports`, delete/hide/pin questions) + Announcements (write a global `notifications`/`announcements` doc).

### Call Sensei — Phase A (voice UX) + B (modes) + E (quota) DONE
Realtime WebRTC + OpenAI Realtime core (`gpt-realtime-2`, `createSenseiRealtimeCall`) left untouched — only additive layers.
- **New files**: `src/ai/callModes.js` (7 modes: free / roleplay{restaurant,airport,hotel,shopping,interview} / jlpt / pronunciation / grammar / vocab / shadowing; `modePromptSnippet(modeId, scenarioId)` → Arabic instruction snippet), `src/ai/callQuota.js` (localStorage daily **30-min** realtime quota — `canStartCall`/`addCallSeconds`/`callMinutesRemaining`/`quotaMessage`; resets per local day; NO paid-API change), `src/components/ai/CallModePicker.jsx` (mode grid + roleplay scenario sub-picker).
- **SenseiCallScreen.jsx** (small edits, core preserved): added `callMode`/`scenario`/`muted`/`speakerOn`/`showTranscript`/`callSeconds` state. Setup screen now shows `<CallModePicker>` + "X min left today". `startRealtimeCall` does a `canStartCall()` quota check first, and merges the mode into the existing encoded context: `encodeContext({ ...ctx, modePrompt: modePromptSnippet(...) })` (no change to the WebRTC/SDP flow). On connect (`dataChannel.onopen`) a 1s timer runs; `cleanupRealtime` stops it and **banks the seconds to the quota** (`addCallSeconds`). Realtime controls row = **mute** (toggles local mic track `.enabled`), **speaker** (toggles `remoteAudio.muted`), **duration** (mm:ss), **transcript toggle**, **end** — replacing the lone end button. Transcript gated on `showTranscript`.
- **functions/index.js** `buildRealtimeInstructions`: appends `context.modePrompt` (≤400 chars) so the chosen mode shapes the whole session. ⚠️ **needs `firebase deploy --only functions` to take effect** (until then the call still works, just without per-mode behavior). NOT otherwise changed.
- **senseiContext.ts NOT touched** — mode is merged client-side, so no edit was necessary.
- CSS: `.call-mode-picker/-grid/-chip`, `.call-scenario-*`, `.sensei-call-quota`, `.sensei-call-duration`, `.sensei-call-btnrow`, `.sensei-ctrl-btn(.active/.off)`, `.sensei-ctrl-end`.
- Verified live: call setup renders all 7 modes + roleplay scenarios (restaurant/airport/…) + "المتبقي اليوم: 30 دقيقة"; build clean; no console errors. Realtime controls + server modePrompt need a live OpenAI call (+ functions redeploy) to fully exercise.
- **Deferred (next phases, as planned)**: ~~C post-call report~~ (DONE), ~~D persistence + memory + mistakes→SRS~~ (DONE — see below), richer realtime grounding (weakKanji/mistakes).

### Call Sensei — Phase C (post-call report) DONE
After a live call ends, the transcript is summarized into a study report. No new backend — reuses the existing `requestSensei` → `askSensei` cloud path, so the per-user daily AI quota applies unchanged.
- **New files**: `src/ai/callReport.js` (`buildReportPrompt` asks for strict JSON; `parseReport` extracts the first `{…}` block and **defensively normalizes** — `mistakes` accept string OR `{you,better,why}` objects, score clamped 0–100, lists capped; on parse failure keeps the raw text as `summary` with `raw:true` so the user always gets something; `generateCallReport(turns, ctx)` → `{status:'ok'|'empty'|'error'|'disabled', report}`, `empty` when <2 turns). `src/components/ai/CallReportScreen.jsx` (full-screen; loading/empty/error states; score card colored good≥75 / mid≥50 / low; summary; mistakes block = strikethrough wrong → green corrected → reason; word/grammar/pronunciation/review sections; sticky Done footer).
- **SenseiCallScreen.jsx** (small additive edits): `reportStatus`/`report` state + `reportConvoRef`. The realtime **End** control (`sensei-ctrl-end`) now calls `endCallWithReport` → cleanup, then if ≥2 turns `runReport(convo)` → renders `<CallReportScreen>` via an **early return** before the main call JSX. `finishReport` clears state + `onClose()`. Header ✕ stays a quick-exit (no report). Retry re-runs from `reportConvoRef`. Fallback mode unchanged (report wired to the live path only).
- CSS: `.call-report*` (head/body/score/summary/section/list/mistakes(.cr-you/.cr-better/.cr-why)/foot/loading/empty/spinner) appended to `index.css`.
- Verified: build clean; `parseReport` validated live (structured JSON → score 82 + structured mistake; non-JSON → raw fallback); prompt carries the schema; report screen **mounted live with sample data + screenshotted** (RTL correct). Full end-to-end (real transcript) needs a live OpenAI call.

### Call Sensei — Phase D (persistence + cross-call memory + mistakes→Smart Review) DONE
Three legs. User explicitly chose the **full** mistakes→review (also surface in the daily Smart Review), not just the memory loop.
- **New file `src/ai/callSessions.js`** (Firestore + memory + SRS push, all best-effort, never throws to caller): `saveCallSession({mode,scenario,durationSeconds,turns,report})` → `addDoc('callSessions', {uid, ...sanitized, createdAt: serverTimestamp(), createdAtMs: Date.now()})`; `fetchRecentCallSessions(max=3)` uses **single-field `where('uid','==',uid)` + client-side sort by `createdAtMs`** (deliberately NO composite index needed); `buildCallMemory(sessions)` → short Arabic string (topic + top fixes, ≤320 chars); `pushCallMistakesToReview(report)` → for each `{you,better,why}` calls `recordSpeakingMistake` (skips empty `better`, dedupes via `speakingId` hash).
- **Smart Review integration (the chosen full path)**: SRS/mistake records gained itemType **`'speaking'`** which carries a self-contained `data:{you,better,why}` payload (no lesson resolution). `learning.ts` `SrsItemType` += `'speaking'`, `MistakeRecord` += optional `data`. `mistakeLog.recordMistake` passes `data` through (harmlessly undefined for lesson callers). New `progressStorage.recordSpeakingMistake(state,{itemId,data,questionAr})` writes mistake + an SRS record **due now** (so it shows next review, then normal SM-2). `reviewQueue.resolveItem` gained a `'speaking'` branch (reads payload from the mistake record by key) + `push` passes `mistakes`/`key`. `SmartReview.jsx`: new `SpeakingReviewCard` (self-graded reveal flashcard mirroring GrammarReviewCard — strikethrough `you` → bold `better` 🔊 → `why` → Forgot/Hard/Easy) + `entry.kind==='speaking'` render branch + `questionAr` ternary branch. On correct grade, existing `resolveMistake` clears it.
- **Cross-call memory wiring (realtime core untouched)**: `SenseiContext` += optional `recentCallMemory`. `SenseiCallScreen.jsx`: mount effect `fetchRecentCallSessions(3)→buildCallMemory→setCallMemory`; shown on setup screen (`.sensei-call-memory`, "🧠 يتذكّر سينسيه…"); injected via the existing `encodeContext({...ctx, modePrompt, recentCallMemory: callMemory})` (no SDP/WebRTC change, `senseiContext.ts` untouched). Persistence: `persistAndLearn(convo, report)` runs inside `runReport` when status==='ok', **guarded by `savedRef`** (reset false at call start) so retry/re-render can't double-save; `endedSecondsRef` captures duration **before** `cleanupRealtime` banks+zeroes `callSecondsRef`.
- **functions/index.js** `buildRealtimeInstructions` reads `context.recentCallMemory` (≤300) and appends a "تتذكر من مكالمات سابقة…" line before modePrompt. ⚠️ **needs `firebase deploy --only functions`** to take effect.
- **firestore.rules**: added private `callSessions` block (owner-only via `uid` field; create checks `request.resource.data.uid`, rest check `resource.data.uid`). ⚠️ **needs `firebase deploy --only firestore:rules`**.
- Verified live (no OpenAI/Firestore needed for these): build clean + `node --check functions/index.js` OK; pipeline test — `pushCallMistakesToReview` added 2 (empty skipped), `buildReviewSession` surfaced 2 `speaking` entries with payload, `buildCallMemory` correct; **SpeakingReviewCard mounted + screenshotted** both states; grading "Easy" set `resolved:true` + SRS interval 1/reps 1 + done screen. Needs deploy + a signed-in live call to exercise save/fetch/server-memory end-to-end.

### Gotchas confirmed this session
- `.env.local` `VITE_ANTHROPIC_API_KEY` = LOCAL dev only (in browser bundle — never deploy with it; prod uses `askSensei` cloud fn). Committed key was screenshot-exposed → rotate.
- Dialogue/reading: all 75 lessons done (Phase 2). Kanji glosses populated in `src/content/kanjiMeanings.js` (105 N5).
- SRS itemType partitions vocab/grammar/kanji + synthetic `mistake` (per-exercise pseudo-items) + `speaking` (Phase D call corrections, carry self-contained `data` payload) — exclude `mistake`/`speaking` from per-skill stats. Bucket by `record.itemType`, not by splitting the `${itemType}:${itemId}` key (itemIds can contain colons).
- Lesson progress key = `${currentLevel}-${activeLesson.id}`.
- No `tsc` in build; verify in live preview (preview_screenshot flaky → use DOM queries).
