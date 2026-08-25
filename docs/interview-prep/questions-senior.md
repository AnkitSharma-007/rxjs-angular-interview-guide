---
description: "Senior-level RxJS interview questions: contract semantics, sharing internals, leak hunting, and architecture decisions."
tags:
  - Interview Prep
---

# Senior Interview Questions

At this level the questions test **semantics** (what exactly happens and why), **failure modes**, and **architecture judgment**. Answers below are what a strong senior actually says, including the trade-offs.

??? question "1. State the Observable contract and name two operator behaviors that only make sense because of it."

    `next* (error | complete)?`: any number of values, then at most one terminal notification, after which nothing is delivered, enforced by RxJS itself. Consequences: `catchError` must **replace** the stream (the errored execution is unrecoverable by contract), and `retry` works by **resubscribing** (a fresh execution is the only way forward). Also explains why inner-stream error containment keeps outer pipelines alive.

    **Deep dive:** [The Observable Contract](../learn/observable-contract.md)

??? question "2. Walk through shareReplay's lifecycle: live source, completed source, errored source, subscribers dropping to zero."

    Live source + `refCount: true`: last unsubscribe disconnects the source; the next subscriber re-triggers it. Live source + `refCount: false`: the source stays subscribed forever (leak risk on infinite sources). **Completed** source: the buffer replays to every future subscriber, `refCount` irrelevant, cached until the stream object dies; refresh requires rebuilding the pipeline. **Errored** source: not cached; the share resets and the next subscriber retries the source.

    **Deep dive:** [shareReplay](../subjects/shareReplay.md), [Caching](../angular/caching.md)

??? question "3. Users report the app slows down the longer it runs. Describe your leak-hunting process."

    Reproduce by navigating a suspect route in and out repeatedly; watch for handlers firing N times per event (duplicate-subscription signature). Heap-snapshot before/after and search detached component instances retained by subscription closures. Audit sources by the question "does this ever complete?": intervals, `fromEvent`, Subjects, `Router.events`, bare `shareReplay`. Fix with binding-level consumption (async pipe/`toSignal`) or `takeUntilDestroyed`, and verify with a `finalize` log.

    **Deep dive:** [Memory Leaks](../angular/memory-leaks.md)

??? question "4. Design a client-side cache for a list endpoint that must update after writes."

    A root service owning: a `refresh$` Subject, the stream `refresh$.pipe(startWith(void 0), switchMap(() => http.get(...)), shareReplay({bufferSize: 1, refCount: true}))`, and an `invalidate()` method calling `refresh$.next()` after successful mutations. Extensions when probed: per-key `Map` caches with eviction, TTL via `timer(0, ttl)` driving the switchMap, and stale-while-revalidate with `concat(of(cached), fresh$)`.

    **Deep dive:** [Caching](../angular/caching.md)

??? question "5. Sketch the 401 refresh-token flow so that N concurrent failing requests trigger exactly one refresh."

    Auth interceptor catches 401s and `switchMap`s into a **shared** refresh stream: a single in-flight `refreshToken$` (`shareReplay(1)`-style or a Subject gate) that all concurrent 401 handlers subscribe to. When it emits the new token, each handler retries its cloned original request; if the refresh itself fails, propagate to logout. The single-flight sharing is the senior detail.

    **Deep dive:** [Interceptors & Retries](../angular/interceptors-retry.md)

??? question "6. Where can unbounded memory growth hide inside RxJS operators themselves?"

    `zip` buffers the faster source until the slower catches up: unbounded on rate-mismatched live streams. Uncapped `mergeMap` holds unlimited concurrent inner subscriptions under burst load (cap with the `concurrent` argument). `concatMap`'s queue grows when the source outpaces inner completion. Unbounded `ReplaySubject`/bare `shareReplay` retain history forever.

    **Deep dive:** [zip](../operators/combination/zip.md), [mergeMap](../operators/transformation/mergeMap.md), [ReplaySubject](../subjects/replaySubject.md)

??? question "7. Implement a minimal store with RxJS and explain how it maps to NgRx."

    `actions$` Subject (dispatch), `scan(reducer, initialState)` (the store's state accumulation), `shareReplay(1)`/`toSignal` (selectors/subscription). NgRx formalizes exactly this: actions are a multicast stream, the reducer runs in `scan`, selectors are memoized `map`+`distinctUntilChanged` chains, and effects are pipelines listening to `actions$` with `withLatestFrom(state$)`.

    **Deep dive:** [scan](../operators/transformation/scan.md), [withLatestFrom](../operators/combination/withLatestFrom.md)

??? question "8. When do you architect with signals vs RxJS, and what are the bridge caveats?"

    Signals: synchronous state, template consumption, derived values (`computed`). RxJS: time and events: cancellation, debouncing, retries, stream combination. Bridges: `toSignal` subscribes eagerly, needs an injection context, rethrows stream errors on read, and offers `initialValue`/`requireSync`; `toObservable` runs on effects and **coalesces** synchronous updates, so it is a state bridge, not an event log; event semantics still need a Subject.

    **Deep dive:** [Signals & RxJS Interop](../angular/signals-interop.md)

??? question "9. What is the precise difference between unsubscribe and complete?"

    Direction and notification. `complete` is producer-initiated: subscribers' complete handlers run, then teardown. `unsubscribe` is consumer-initiated: **no** notification is delivered, no complete handler runs, but teardown and `finalize` still execute. UI cleanup must therefore live in `finalize` (or `DestroyRef.onDestroy`), never only in the complete handler.

    **Deep dive:** [Subscription & Teardown](../learn/subscription.md)

??? question "10. A concatMap-based queue stopped processing. What are the likely causes?"

    An inner Observable that never completes (a Subject, a stream missing `take`/`first`) blocks the queue permanently; an uncaught inner error tore down the whole chain, losing queued items (fix: per-item `catchError`); or upstream completion semantics changed (e.g., a `takeUntil` fired). Diagnose with `finalize`/`tap` instrumentation per stage.

    **Deep dive:** [concatMap](../operators/transformation/concatMap.md)

??? question "11. How does multicasting actually work under the hood?"

    Every multicast tool places a Subject between source and subscribers: the Subject subscribes to the source once (one producer execution) and fans notifications out to N subscribers. `share()` is that plus reference counting and configurable reset behavior (`resetOnRefCountZero`, `resetOnComplete`, `resetOnError`); `shareReplay` swaps in a `ReplaySubject`. Being able to draw source → Subject → subscribers answers most sharing questions.

    **Deep dive:** [Unicast vs Multicast](../learn/unicast-vs-multicast.md), [share](../subjects/share.md)

??? question "12. Your interceptor adds retries. What ordering and safety concerns come with that?"

    Interceptor order: registration order for requests, reverse for responses; a retry interceptor placed after auth retries with the same possibly-stale token, before auth re-runs token logic per attempt. Choose deliberately. Safety: gate retries on idempotency (method or `HttpContext` opt-in), bound each attempt with `timeout` inside the retry, and keep `catchError` after `retry` so retries see raw errors.

    **Deep dive:** [Interceptors & Retries](../angular/interceptors-retry.md)

## Keep Going

- Drill the [Operator Cheat Sheet](cheat-sheet-operators.md) until the decision tables are reflexive.
- The night before: run the [60-Minute Revision](sixty-minute-revision.md).
