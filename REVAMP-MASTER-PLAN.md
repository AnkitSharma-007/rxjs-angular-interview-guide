# RxJS Angular Interview Guide — Revamp Master Plan

> Source of truth for the revamp. Each phase in §26 is designed to be handed off as a standalone implementation task. Audited 2026-08-24 against the live site and repo state.

## 1. Executive Summary

The project today is a **well-written RxJS operator reference** (43 pages, MkDocs Material) — but it is not yet an **interview preparation platform**. Despite the name, there is no interview question bank, no difficulty grading, no cheat sheets, no learning path, no scenarios, no coding challenges, and no revision experience. Content quality is good-to-strong per page but suffers from AI-generation artifacts, mixed old/new Angular idioms, a handful of outright code bugs, missing H1s, no marble diagrams, and a default-configured theme with weak search, SEO, and navigation.

The recommendation is **not** to migrate frameworks. MkDocs Material can support ~90% of the target experience. The plan: fix correctness and tooling first, upgrade theme/IA, retrofit a consistent content model, expand coverage (~35 missing topics), then build the interview layer (question bank, cheat sheets, scenarios, quizzes) as structured Markdown with light metadata. Ten incremental phases, each independently shippable.

## 2. Current State Assessment

**What exists** (verified against repo + deployed site):

- 6 fundamentals pages (`docs/observable.md`, `docs/observer.md`, `docs/cold-observables.md`, `docs/hot-observables.md`, `docs/promise-vs-observable.md`, `docs/async-pipe.md`)
- 36 operator/subject pages across 7 categories under `docs/Operators/`
- 2 comparison pages buried inside categories (`switchMap-mergeMap-concatMap.md`, `subject-behaviorSubject-replaySubject.md`)
- Theme: near-default Material; `docs/stylesheets/extra.css` is 3 lines (one brand color)
- CI: `.github/workflows/ci.yml` deploy-only on push to `main`; no PR validation, no `--strict`, no link checking
- Assets: logo + favicon only — **zero marble diagrams or illustrations**

**Configuration gaps in `mkdocs.yml`:** no `site_url` (breaks sitemap/canonical URLs), no `plugins:` block, legacy `codehilite` instead of `pymdownx.highlight`, no `admonition` extension (callouts unavailable), no `navigation.tabs`, no `content.code.copy`, no search enhancements, dark-mode toggle mislabeled ("Switch to system preference" but no auto scheme defined), nav typo "Error Handeling".

## 3. Product Vision

The one place an Angular developer uses to go from "I use RxJS at work" to "I can answer any RxJS question at a junior→staff interview": learn fundamentals → master operators through Angular-real examples → drill comparisons and traps → practice graded questions → revise from cheat sheets in the final hour.

## 4. Target Users

| Persona                      | Primary need                           | Current support                            | Gap                                          |
| ---------------------------- | -------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| A — Beginner                 | Ordered learning path                  | ❌ Flat nav, no sequence, no prerequisites | Learn section with explicit ordering         |
| B — Intermediate Angular dev | Practical interview material           | ⚠️ Good operator pages, no Q&A             | Question bank, Angular scenarios             |
| C — Senior candidate         | Depth: concurrency, leaks, edge cases  | ⚠️ Some depth in higher-order mapping      | Advanced topics, architecture scenarios      |
| D — Interview-day reviser    | 30-min revision                        | ❌ Nothing scannable                       | Cheat sheets, comparison tables, TL;DR boxes |
| E — Interviewer              | Graded questions with expected answers | ❌ None                                    | Question bank with difficulty + rubric       |

Personas D and E are currently **completely unserved**; B and C are the core audience of the revamp.

## 5. Current Strengths

- Explanations are genuinely good: plain-language, analogy-driven (e.g., `shareReplay.md` DVR analogy; its `refCount` explanation is accurate and rare to see done well)
- Higher-order mapping comparison table in `switchMap-mergeMap-concatMap.md` is exactly the right format — should become a pattern, not an exception
- Many examples already use modern Angular (`inject()`, signals, `takeUntilDestroyed`, `@if`)
- Sound infrastructure choices: MkDocs Material, GitHub Pages, zero runtime dependencies
- Clean URLs, working search (default), functional dark mode

## 6. Current Weaknesses

1. **No interview layer at all** — the README promises "interview-style questions and answers"; no page delivers them
2. **AI-generation artifacts**: "It's Tuesday afternoon here in Bengaluru (around 3:00 PM IST)…" appears in 6 pages (`filter.md`, `take.md`, `concatMap.md`, `exhaustMap.md`, `mergeMap.md`, `switchMap.md`) — credibility-damaging
3. **Inconsistent Angular era**: 36 files still use `*ngIf`/`*ngFor` while others use `@if`/signals; mixed constructor vs `inject()` DI; explicit `standalone: true` (redundant in modern Angular, where standalone is the default)
4. **Code bugs** (see §20) including an invalid `inject(takeUntilDestroyed)` call
5. **No visual explanations** — zero marble diagrams for a library whose semantics are fundamentally temporal
6. **No H1s / inconsistent headings**: most pages start with body text (`observable.md`, `switchMap.md`); hurts SEO, a11y, and print/reader modes
7. **Miscategorization**: Subjects are not operators but live under "Operators"; comparisons buried; `find` is a low-value page while `fromEvent`, `scan`, `merge`, `concat` are missing
8. **Flat, unranked nav**: no difficulty signals, no tabs, no section landing pages, no "start here"
9. **Weak discoverability**: no `site_url`, no per-page meta descriptions, no social cards, no tags

## 7. Content Gap Analysis

Highest-value missing content, in priority order:

1. **Interview question bank** (graded junior/mid/senior/staff) — the product's namesake
2. **Cheat sheets**: operator decision tree ("which operator do I need?"), higher-order mapping quadrant, Subject family table, unsubscribe strategies table
3. **Fundamentals**: Subscription/teardown lifecycle, unicast vs multicast, sync vs async emission, error/completion contract (the "Observable contract" is a classic senior question)
4. **Missing operators** (see §8)
5. **Angular integration section** (see §9) — the differentiator
6. **Common mistakes/anti-patterns**: nested subscribes, `shareReplay` without `refCount` leaking, subscribing in constructors, Subject exposure instead of `asObservable`, manual subscribe when `async`/`toSignal` suffices
7. **Scenarios**: autocomplete, save-button double-click, login flow, dependent requests, parallel dashboard load, polling with backoff, route-param data loading, cache invalidation

## 8. RxJS Coverage Matrix

| Family         | Covered                                                                              | Missing (priority)                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Creation       | of, from, interval, timer, EMPTY/NEVER                                               | **fromEvent (P0)**, **defer (P1)**, **throwError (P1)**, range/generate (P3)                                                 |
| Transformation | map, switchMap, mergeMap, concatMap, exhaustMap                                      | **scan (P1)**, reduce (P2), pairwise (P2), buffer/bufferTime/bufferCount (P2), expand (P3), window\* (P3)                    |
| Filtering      | filter, take, takeUntil, first, last, skip, debounceTime, distinctUntilChanged, find | **throttleTime (P1)**, **takeWhile (P1)**, auditTime/sampleTime (P2), skipUntil/skipWhile (P2), distinct (P2), takeLast (P3) |
| Combination    | combineLatest, forkJoin, zip, withLatestFrom                                         | **merge (P1)**, **concat (P1)**, **startWith (P1)**, race (P2), endWith (P3)                                                 |
| Error          | catchError, retry, retryWhen                                                         | **throwError (P1)**, error propagation & recovery strategies page (P1)                                                       |
| Multicasting   | share, shareReplay                                                                   | connectable/multicast concepts note (P2)                                                                                     |
| Subjects       | Subject, BehaviorSubject, ReplaySubject                                              | **AsyncSubject (P1)**, Subject anti-patterns (P1)                                                                            |
| Utility        | tap, delay, finalize, timeout                                                        | observeOn/subscribeOn (P2, brief), materialize (P3)                                                                          |
| Scheduling     | —                                                                                    | One conceptual page only (P2); interviews rarely go deeper — deliberately keep shallow                                       |

Also fix: `docs/Operators/RxJS-operators.md` recommends deprecated `pluck` and contains double-slash links (`Operators//Creation/`).

## 9. Angular + RxJS Coverage Matrix

| Topic                                                                                       | Status                                | Priority                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| AsyncPipe                                                                                   | ✅ `docs/async-pipe.md`               | Keep, modernize                                      |
| Subscription management (`takeUntilDestroyed`, DestroyRef, async pipe, when to unsubscribe) | ⚠️ Used everywhere, explained nowhere | **P0 — dedicated page**                              |
| Signals interop (`toSignal`, `toObservable`, when signals replace RxJS)                     | ⚠️ Used in examples, never explained  | **P0 — dedicated page** (top modern interview topic) |
| HttpClient patterns (cancellation, sequential/parallel/dependent requests)                  | ⚠️ Scattered in operator pages        | P1 — consolidated page                               |
| Reactive Forms `valueChanges`                                                               | ⚠️ Incidental                         | P1                                                   |
| Router (params, events, ActivatedRoute + switchMap)                                         | ❌                                    | P1                                                   |
| Loading/error/success UI state pattern                                                      | ❌                                    | P1                                                   |
| HTTP interceptors + retry strategies                                                        | ❌                                    | P1                                                   |
| Memory leaks: causes, detection, prevention                                                 | ❌                                    | **P0** (guaranteed senior question)                  |
| Caching with shareReplay (staleness, invalidation)                                          | ⚠️ Partial                            | P1                                                   |
| Polling                                                                                     | ❌                                    | P2                                                   |
| Component communication / service-with-a-Subject state pattern                              | ⚠️ Partial in Subject pages           | P1                                                   |
| OnPush + RxJS, zoneless notes                                                               | ❌                                    | P2                                                   |
| WebSockets / SSE                                                                            | ❌                                    | P2 (one page, brief)                                 |
| RxJS anti-patterns                                                                          | ❌                                    | **P0**                                               |

## 10. Interview Preparation Gap Analysis

Currently supported modes: **reference lookup only**. Missing modes: guided learning, question practice, comparison drilling, scenario walkthroughs, timed revision, interviewer sourcing. The Interview Prep section (§11) plus per-page Q&A blocks close all six with static Markdown — no backend needed.

## 11. Information Architecture Proposal

Enable `navigation.tabs` with six top-level tabs (renames require the `mkdocs-redirects` plugin to preserve inbound URLs):

1. **Learn** — ordered fundamentals: What is RxJS → Observable → Observer → Subscription & teardown → Creation → Promise vs Observable → Cold vs Hot → Unicast vs Multicast → Error/completion contract. Numbered, with "next up" links.
2. **Operators** — current categories, each with an index page containing a decision table; `find` demoted, missing operators added. Rename "Error Handeling" → "Error Handling".
3. **Subjects & Multicasting** — moved out of Operators: Subject family, AsyncSubject, share/shareReplay, anti-patterns, caching.
4. **Angular + RxJS** — the differentiator section (§9 topics).
5. **Comparisons** — promoted to first-class: higher-order mapping ×4 (add exhaustMap to the existing trio), Subject family, share vs shareReplay, combineLatest vs zip vs forkJoin vs withLatestFrom, debounce vs throttle vs audit vs sample, take/first/single, merge vs concat.
6. **Interview Prep** — Questions by level (junior/mid/senior-staff), Scenarios, Coding challenges, Common mistakes & traps, Cheat sheets, "60-minute revision" page.

## 12. Learning Journey Proposal

- Each page's front matter carries `level: beginner|intermediate|advanced` and `path_order`; landing page presents three entry points: "New to RxJS" → Learn tab sequence; "Interview in 2 weeks" → operators + comparisons + questions; "Interview today" → cheat sheets + top-20 questions
- End-of-page "Next: …" links form the path; comparison pages act as checkpoints
- Keep it static and editorially curated — no progress tracking, no accounts

## 13. Operator Page Template

Nine sections:

1. **H1 = operator name** + one-line definition + front matter (description, tags, level)
2. **At a glance** admonition: signature, marble diagram, "use when", "avoid when", #1 gotcha
3. **How it works** (current prose strength — keep)
4. **Minimal example** (pure RxJS, short)
5. **Angular example** (modern only: `inject()`, signals, `@if`/`@for`, no `standalone: true`, `takeUntilDestroyed` or async pipe)
6. **Common mistakes** (1–3, each with wrong→right)
7. **Comparison** links + one-row "vs" table where applicable
8. **Interview Q&A** — 2–4 collapsible questions with graded difficulty
9. **Related operators** footer

Marble diagrams: standardized SVGs checked into `docs/assets/`, consistent visual language, dark-mode aware.

## 14. Interview Question Template

Per-question structure (Markdown with a small metadata line, not a database):

- **Metadata**: difficulty (junior/mid/senior/staff), type (conceptual/coding/scenario), topics, frequency (common/occasional/rare)
- **Body**: question → expected answer → what a strong answer includes (interviewer rubric) → common wrong answer/trap → follow-up questions (2–3) → links to deep-dive pages
- Rendered as collapsible `???` details blocks so question lists double as self-testing quizzes — this is the entire "practice mode" with zero JavaScript

## 15. UI/UX Audit

| Issue                                                                  | Severity | Fix                                                                   |
| ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| No top-level tabs; 43-item flat sidebar                                | High     | `navigation.tabs`, `navigation.sections`, section indexes             |
| Default search (no suggest/highlight)                                  | High     | `search.suggest`, `search.highlight`, `search.share`                  |
| No copy button on code blocks (learning site!)                         | High     | `content.code.copy`                                                   |
| Callouts unusable (`admonition` ext missing)                           | High     | Add `admonition` + `pymdownx.highlight` w/ line numbers & annotations |
| Landing page is marketing prose, no entry points                       | High     | Card grid: 3 journeys + popular topics                                |
| Very long code examples dominate pages (switchMap example ≈ 170 lines) | Medium   | Template caps Angular examples; tabbed "Minimal / Angular" views      |
| Dark toggle label wrong ("system preference" without auto scheme)      | Medium   | Add 3-state palette (auto/light/dark)                                 |
| No `navigation.top`, no `toc.follow`                                   | Low      | Enable                                                                |
| Mobile: fine baseline (Material), but long unbroken pages hurt         | Medium   | TL;DR boxes + tighter examples                                        |

## 16. Accessibility Audit

- **Serious**: missing H1s on most pages → broken document outline for screen readers; heading levels skip (H3 before H2 in `observable.md`)
- **Moderate**: brand pink `#c2185b` on dark background needs contrast verification; link-only color affordances in body text; future marble images need alt-text conventions
- **Minor**: Material baseline is strong (skip link, keyboard nav, focus states exist)
- Actions: H1 retrofit (Phase 3), contrast-check palette (Phase 2), alt-text rule in contribution guide, a11y check in QA gate

## 17. Technical Architecture Assessment

**Stay on MkDocs Material.** The target experience is content + navigation + search + light disclosure interactivity — all native strengths. A SPA rewrite would add build complexity, hurt SEO, and serve no feature on the roadmap.

- Content stays Markdown; metadata via YAML front matter (tags, difficulty) — no separate data files until a generated index is needed
- Interactivity budget: collapsible Q&A (`pymdownx.details`), tabs, tags plugin, optional StackBlitz links — **no custom JS app**
- Plugins to add: `search` (explicit, tuned), `tags`, `redirects`, `social`, optionally `git-revision-date-localized`
- Revisit only if a quiz engine with scoring is ever wanted (P3, likely never)

## 18. Performance Assessment

Static and inherently fast. Actions: keep pages < ~150KB HTML by trimming giant examples; social cards plugin is CI-only cost (cache it); marble SVGs hand-optimized (never PNG screenshots); Lighthouse spot-check in QA gate (≥ 95 performance, 100 SEO on key pages).

## 19. SEO Assessment

- **Broken today**: no `site_url` → sitemap and canonical URLs wrong/absent — one-line fix, do first
- No per-page `description` front matter → generic SERP snippets; add during template retrofit
- No H1s → weak title signals (fixed by template)
- Add: social cards (og:image), internal-link mesh via Related/Comparison footers, interview-intent page titles ("switchMap interview questions" is a real search query Interview Prep pages should own)
- URL churn from IA restructure must ship with redirects in the same release

## 20. Content Accuracy Assessment

| Finding                                                                                        | Location                                     | Classification                                                 |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `inject(takeUntilDestroyed)` — cannot inject a function; also `@ViewChild` read in constructor | `docs/hot-observables.md` (~L51)             | **Incorrect** — fix immediately                                |
| `tap` callback returns `of([])`/`undefined` as if it affected the stream                       | `docs/Operators/Transformation/switchMap.md` | **Incorrect** — tap ignores return values                      |
| `retryWhen` page lacks deprecation notice (deprecated in RxJS, slated for removal)             | `docs/Operators/Error/retryWhen.md`          | **Outdated** — add banner, teach `retry({delay})` as primary   |
| `pluck` recommended                                                                            | `docs/Operators/RxJS-operators.md`           | **Outdated** — deprecated/removed                              |
| `*ngIf`/`*ngFor`, explicit `standalone: true`, constructor DI across 36 files                  | repo-wide                                    | **Outdated style** — modernize in template retrofit            |
| shareReplay/refCount semantics, higher-order mapping comparison, cold/hot explanations         | various                                      | **Definitely correct** — preserve                              |
| forkJoin error semantics, combineLatest first-emission requirement                             | spot-checked pages                           | **Probably correct** — verify during retrofit against rxjs.dev |

Rule going forward: every factual claim is verified against the latest official docs — <https://angular.dev/> and <https://rxjs.dev/> — before merge. Content stays **evergreen**: no RxJS/Angular version numbers in prose, front matter, or examples; describe current default behavior and revise whenever the official docs change.

## 21. Competitive Benchmark Summary

- **Learn RxJS** (learnrxjs.io): great recipes, no Angular context, aging → we win on Angular + interview focus
- **RxMarbles**: interactive diagrams only → embed static marbles, link out; don't rebuild it
- **rxjs.dev**: authoritative API reference → never compete on API completeness; link to it
- **angular-interview-questions repos** (e.g., sudheerj's): breadth without depth, wall-of-text README → we win on structure, depth, revision UX
- **Differentiator**: the only resource combining operator depth × modern Angular (signals, standalone, current control flow) × graded interview questions × revision experience

## 22. Recommended Feature Set

**Existing (keep/improve)**: operator pages, comparison pages, dark mode, search, GH Pages deploy.
**Recommended changes**: IA restructure, template retrofit, modernized examples, accuracy fixes, theme upgrade, CI hardening.
**New**: Interview question bank, cheat sheets, scenarios, coding challenges, common-mistakes section, Angular+RxJS section, marble diagrams, tags, social cards, section index pages, landing-page journeys.
**Optional (P3)**: StackBlitz embeds, quiz scoring, i18n.

## 23. Feature Prioritization

| #   | Feature                                          | Problem solved                          | Complexity                  | Depends on       | Priority |
| --- | ------------------------------------------------ | --------------------------------------- | --------------------------- | ---------------- | -------- |
| 1   | Accuracy fixes + artifact removal                | Credibility                             | Low                         | —                | **P0**   |
| 2   | CI: PR build w/ `--strict` + link check (lychee) | Regressions ship silently               | Low                         | —                | **P0**   |
| 3   | `site_url` + config/theme upgrade                | Search/SEO/UX baseline                  | Low                         | —                | **P0**   |
| 4   | IA restructure + redirects                       | Findability                             | Medium                      | 3                | **P0**   |
| 5   | Operator template retrofit + H1s + front matter  | Consistency, a11y, SEO                  | High (36 pages, mechanical) | 4                | **P1**   |
| 6   | Interview question bank (~120 questions)         | Core product promise                    | High (editorial)            | 4                | **P1**   |
| 7   | Cheat sheets (4)                                 | Persona D unserved                      | Medium                      | 5                | **P1**   |
| 8   | Angular + RxJS section (~10 pages)               | Differentiator                          | High (editorial)            | 4                | **P1**   |
| 9   | Missing operators wave 1 (~12 pages)             | Coverage gaps                           | Medium                      | 5                | **P1**   |
| 10  | Marble diagrams                                  | Temporal semantics unteachable in prose | Medium                      | asset convention | **P1**   |
| 11  | Scenarios + coding challenges                    | Senior prep                             | Medium                      | 6                | **P2**   |
| 12  | Tags + quiz-style details blocks                 | Browse/practice modes                   | Low                         | 5, 6             | **P2**   |
| 13  | Social cards, analytics-lite                     | Reach                                   | Low                         | 3                | **P2**   |
| 14  | StackBlitz embeds, interactive quiz engine       | Nice-to-have                            | High                        | all              | **P3**   |

## 24. Design System Recommendations

- Extend `docs/stylesheets/extra.css` minimally: difficulty badge styles (3 colors, contrast-checked), "At a glance" admonition variant, comparison-table density tweaks — target < 150 lines total
- Marble diagram convention: consistent SVG timeline style, dark-mode aware
- Typography/spacing: keep Material defaults; resist custom fonts beyond current Roboto
- Iconography: Material icons for section indexes; no custom icon set

## 25. Technical Implementation Strategy

- All work stays in this repo; content-first, config-light
- Front matter metadata is the only "content model" — no JSON/YAML data files initially; if question filtering later needs an index, generate it with a tiny MkDocs hook (Python), not client JS
- Every URL change ships with `mkdocs-redirects` entries in the same PR
- Each phase ships as **its own PR** that leaves the site fully working (strict build + link check green)
- **Commit workflow**: the agent never runs git commits or pushes. For each phase it prepares the file changes plus a short commit message; the maintainer reviews, commits, and opens the PR manually
- **Evergreen content policy**: no RxJS/Angular version numbers anywhere in site content; correctness means "matches the latest <https://angular.dev/> and <https://rxjs.dev/> documentation", re-verified whenever content is touched

## 26. Phased Roadmap

**Phase 0 — Tooling & correctness baseline** _(unblocks everything)_
Scope: fix the four code/content bugs (§20), remove 6 Bengaluru artifacts, fix "Error Handeling" typo and double-slash links; add PR workflow running `mkdocs build --strict` + lychee link check alongside existing `.github/workflows/ci.yml`.
DoD: strict build green on PRs; zero known incorrect statements; artifacts gone.

**Phase 1 — Config & theme upgrade**
Scope: `mkdocs.yml` only — `site_url`, plugins (search, tags, redirects, social), extensions (admonition, pymdownx.highlight + superfences w/ Mermaid, snippets), features (tabs, sections, indexes, top, toc.follow, code.copy), 3-state palette.
Risk: social plugin needs cairo in CI — add to workflow. DoD: all features render on deployed site; sitemap has absolute URLs.

**Phase 2 — IA restructure** _(depends on 1)_
Scope: move files into Learn / Operators / Subjects & Multicasting / Angular+RxJS / Comparisons / Interview Prep trees; section index pages with decision tables; redirects for every moved URL; new landing page with 3 journey cards.
DoD: no 404s from old URLs (lychee against sitemap), every section has an index.

**Phase 3 — Content model & template retrofit** _(depends on 2; parallelizable per category)_
Scope: apply §13 template to all 36 operator pages + 6 fundamentals: add H1s, front matter (description/tags/level), modernize all examples to current Angular syntax per angular.dev, trim oversized examples, add Common Mistakes + Interview Q&A blocks, verify facts against the latest rxjs.dev / angular.dev.
DoD: 100% pages pass a template checklist; zero `*ngIf`/`standalone: true` remnants.

**Phase 4 — Coverage expansion wave 1** _(parallel with 5)_
Scope: new pages — fromEvent, defer, throwError, scan, merge, concat, startWith, throttleTime, takeWhile, AsyncSubject, Subscription & teardown, unicast vs multicast, error/completion contract, error-strategies overview.
DoD: §8 P0/P1 gaps closed, each page template-compliant with marble diagram.

**Phase 5 — Angular + RxJS section** _(parallel with 4)_
Scope: ~10 pages per §9 — signals interop, subscription management, memory leaks, anti-patterns, HttpClient patterns, forms, router, interceptors + retry, caching, loading/error/success pattern.
DoD: section complete; cross-linked from operator pages.

**Phase 6 — Interview experience** _(depends on 3; content can start earlier)_
Scope: question bank (~120 questions: 40 junior / 45 mid / 35 senior-staff) using §14 schema; 4 cheat sheets; 8–10 scenarios; 6–8 coding challenges; common-traps page; "60-minute revision" page.
DoD: Persona D can revise in 30 min using only Interview Prep tab; Persona E can source a full interview loop.

**Phase 7 — Light interactivity & polish**
Scope: tags index page, quiz-style self-test pages (details blocks), optional StackBlitz links, wave-2 operators (auditTime, sampleTime, buffer\*, pairwise, reduce, race, observeOn/subscribeOn, scheduling concept page).

**Phase 8 — A11y / performance / SEO hardening**
Scope: heading-outline audit, contrast fixes, alt text, per-page descriptions completed, Lighthouse pass on 5 representative pages, image/SVG optimization.

**Phase 9 — QA & launch**
Scope: full quality-gate run (§28), README rewrite to match new product, CONTRIBUTING.md with templates, announcement.

## 27. Testing Strategy

- **Automated per-PR**: `mkdocs build --strict` (catches nav/link/anchor breakage), lychee (internal + external links), markdownlint (heading order, single H1), spell check with a project dictionary (`cSpell` or `codespell`)
- **Code samples**: manual rule — every new/changed Angular sample is verified in a local scratch project or StackBlitz before merge (PR checklist item)
- **Manual gates per phase**: mobile walkthrough, keyboard-only navigation pass, search smoke tests ("switchMap vs", "memory leak", "BehaviorSubject")

## 28. Quality Gates

- **Content**: 0 known inaccuracies; every operator page template-complete; every page has ≥ 1 interview question; terminology consistent (one glossary)
- **Engineering**: strict build, link check, lint green; deploy succeeds; no console errors on sampled pages
- **UX**: any operator reachable ≤ 3 clicks from home; search returns target in top 3 for operator names; revision path ≤ 30 min
- **Accessibility**: single H1 per page, no skipped levels, WCAG AA contrast, full keyboard operability
- **Performance**: Lighthouse ≥ 95 perf / ≥ 90 a11y / 100 SEO on home, one operator page, one question page
- **SEO**: absolute sitemap, unique title + description per page, social cards render

## 29. Risks and Mitigations

| Risk                                                   | Mitigation                                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Editorial volume (~60 new pages, 120 questions) stalls | Phases shippable independently; one PR per phase, authored per category; templates lower authoring cost  |
| URL restructure tanks existing search traffic          | `mkdocs-redirects` in same PR; verify with lychee against old sitemap                                    |
| Accuracy regressions in new content                    | Latest angular.dev / rxjs.dev verification rule; PR checklist                                            |
| Angular churn re-dates content                         | Evergreen policy: no version pins; examples follow current angular.dev defaults; periodic accuracy sweep |
| Scope creep toward an app                              | §17 interactivity budget is a hard line; P3 items require re-justification                               |

## 30. Definition of "Interview Ready"

A user is interview-ready when they can: explain the Observable contract and cold/hot/unicast/multicast unprompted; choose among switchMap/mergeMap/concatMap/exhaustMap for any scenario with cancellation/ordering justification; explain every Subject variant and when not to use one; describe three unsubscribe strategies and when each applies; identify shareReplay leak scenarios; sketch error-handling for a resilient HTTP call; and explain signals↔RxJS interop trade-offs. The site is "interview ready" when every one of those competencies has a learn page, a comparison, questions at 3 difficulty levels, and a cheat-sheet entry.

## 31. Definition of Done for the Entire Revamp

All P0/P1 features shipped; §8 and §9 matrices show no P0/P1 gaps; all §28 quality gates pass; all five personas complete their §4 primary task unaided; README/CONTRIBUTING reflect the new product; two consecutive releases deployed green through the hardened CI.

## 32. Recommended Next Steps

1. Execute Phase 0 as the first implementation task — small, high-credibility-impact, zero risk
2. Execute Phase 1 (single-file config change) next; phases 0+1 together visibly transform the site in two PRs
3. Then parallelize: Phase 3 retrofit (mechanical) alongside Phase 6 question authoring (editorial)

**Open decisions**

1. Question bank granularity — recommended: per-level pages with topic anchors + tags
2. Marble diagram tooling — recommended: hand-authored SVG (consistent, dark-mode aware)
3. Analytics — optional privacy-light option (GoatCounter/Plausible), P2
