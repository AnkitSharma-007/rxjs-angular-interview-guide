---
description: "Mid-level RxJS interview questions with answers: higher-order mapping, sharing, error handling, and Angular patterns."
tags:
  - Interview Prep
---

# Mid-Level Interview Questions

The questions that decide most Angular interviews. Higher-order mapping dominates this level; if you drill one thing, drill the [four-way comparison](../comparisons/switchMap-mergeMap-concatMap.md).

??? question "1. Explain switchMap. Why is it the right operator for typeahead search?"

    It maps each source value to an inner Observable and subscribes, **unsubscribing from the previous inner Observable** when a new value arrives. For typeahead: each keystroke's request cancels the stale one, so out-of-order responses can never overwrite the latest results, and `HttpClient` aborts the dead request at the network layer.

    **Strong answers also mention:** the full pipeline: `debounceTime` → `distinctUntilChanged` → `switchMap`, with `catchError` on the **inner** stream.

    **Deep dive:** [switchMap](../operators/transformation/switchMap.md)

??? question "2. A user triple-clicks Save. Compare what switchMap, mergeMap, concatMap, and exhaustMap each do."

    `mergeMap`: three parallel requests, racing. `concatMap`: three sequential requests, ordered. `switchMap`: cancels the first two; only the last completes, though the aborted server writes may still have landed. `exhaustMap`: one request; clicks two and three are dropped, which is usually what a save button wants (paired with a disabled state).

    **Deep dive:** [the comparison](../comparisons/switchMap-mergeMap-concatMap.md), including the scenario table

??? question "3. Why are nested subscribes an anti-pattern, and what replaces them?"

    Three failures: no cancellation (inner requests race and leak), errors bypass the outer pipeline, and inner subscriptions have unmanaged lifetimes. A higher-order mapping operator (`switchMap`/`concatMap`/`exhaustMap`/`mergeMap`) flattens the logic into one pipeline with unified cancellation, error flow, and teardown.

    **Deep dive:** [Anti-Patterns #1](../angular/anti-patterns.md)

??? question "4. How do you make one HTTP request serve many subscribers, and what does refCount do?"

    Pipe the request through `shareReplay({ bufferSize: 1, refCount: true })` in a shared service. `refCount` controls whether the operator unsubscribes from a **live** source when subscribers drop to zero. Crucially, once the source **completes**, the value is cached permanently regardless of `refCount`; refreshing requires rebuilding the stream.

    **Deep dive:** [shareReplay](../subjects/shareReplay.md), [Caching](../angular/caching.md)

??? question "5. debounceTime vs throttleTime: when do you use each?"

    `debounceTime` waits for a pause and emits the last value; during constant activity it emits nothing. Ideal for typing. `throttleTime` emits then enforces a cooldown, producing steady output during continuous activity. Ideal for scroll/mousemove. Bonus nuance: throttle's default drops the trailing value; `{ trailing: true }` fixes stale final state.

    **Deep dive:** [debounceTime](../operators/filtering/debounceTime.md), [throttleTime](../operators/filtering/throttleTime.md)

??? question "6. combineLatest vs forkJoin vs zip in one scenario each."

    Live filters + data → `combineLatest` (re-emits on any change). Three one-shot API calls before render → `forkJoin` (one emission of final values at completion). Pairing two streams by position (1st with 1st) → `zip`. Traps: `combineLatest` is silent until every source emits (fix with `startWith`); `forkJoin` never emits if an input never completes.

    **Deep dive:** [combineLatest](../operators/combination/combineLatest.md), [forkJoin](../operators/combination/forkJoin.md), [zip](../operators/combination/zip.md)

??? question "7. Where does catchError go in a typeahead pipeline, and why does the placement matter?"

    On the inner request Observable, inside `switchMap`. Placed on the outer stream, the first failed request terminates the whole `valueChanges` pipeline (errors are terminal per the contract) and the search box stops responding. Inner placement confines the error to that one request.

    **Deep dive:** [catchError](../operators/error-handling/catchError.md), [Observable Contract](../learn/observable-contract.md)

??? question "8. How do you implement retry with exponential backoff, and which errors should you not retry?"

    `retry({ count: 3, delay: (error, retryCount) => timer(1000 * 2 ** (retryCount - 1)) })`. Gate the callback: return `throwError(() => error)` for client errors (4xx), retry only transient ones (network, 5xx), and never blindly retry non-idempotent writes.

    **Strong answers also mention:** the canonical order `timeout` → `retry` → `catchError`.

    **Deep dive:** [retry](../operators/error-handling/retry.md), [HttpClient Patterns](../angular/http-patterns.md)

??? question "9. Rank the subscription-cleanup options in an Angular component."

    1) Don't subscribe manually: async pipe or `toSignal`. 2) `takeUntilDestroyed()` for class-code pipelines. 3) The classic `takeUntil(destroy$)` with `next()` + `complete()` in `ngOnDestroy`. 4) Manual `Subscription` bookkeeping. Also know: `takeUntil` goes **last** in the pipe.

    **Deep dive:** [Subscription & Teardown](../learn/subscription.md), [Memory Leaks](../angular/memory-leaks.md)

??? question "10. Why does a detail page show stale data after navigating from /users/1 to /users/2?"

    The router **reuses** the component instance for sibling routes; `ngOnInit` does not rerun. Data loading must react to the `paramMap` stream: `route.paramMap.pipe(map(get id), switchMap(fetch))`, which also cancels the in-flight request for the previous id.

    **Deep dive:** [Router & RxJS](../angular/router.md)

??? question "11. Why did my valueChanges pipeline not run for the initial form value, and what is the fix?"

    `valueChanges` emits only on changes; there is no replay of the current value. Prepend `startWith(control.value)` when the pipeline derives state that must exist from the first render (dependent dropdowns, computed summaries).

    **Deep dive:** [Reactive Forms](../angular/reactive-forms.md), [startWith](../operators/combination/startWith.md)

??? question "12. What do toSignal and toObservable do, and when do you still need RxJS in a signals codebase?"

    `toSignal` subscribes to a stream and exposes the latest value as a signal, cleaning up on context destroy; `toObservable` streams a signal's changes. RxJS remains the tool for *events over time*: debouncing, cancellation (`switchMap`), retries, and combining event sources; signals hold the resulting state.

    **Strong answers also mention:** `toSignal`'s initial-value options and that `toObservable` coalesces synchronous updates.

    **Deep dive:** [Signals & RxJS Interop](../angular/signals-interop.md)

??? question "13. forkJoin returned nothing and no error. What happened?"

    One of its inputs never completed: a Subject, `valueChanges`, or an interval. `forkJoin` waits for **completion**, not just emission. Bound live inputs with `take(1)` or switch to `combineLatest` when ongoing emissions are the point.

    **Deep dive:** [forkJoin](../operators/combination/forkJoin.md)

??? question "14. Build a loading/error/success UI from one HTTP call. What does the stream look like?"

    Map the response into a discriminated union: `map(data => ({status:"loaded", data}))`, `catchError(() => of({status:"error"}))`, `startWith({status:"loading"})`, then `toSignal(..., { requireSync: true })`. One stream, no boolean flag drift, exhaustive `@switch` in the template.

    **Deep dive:** [HttpClient Patterns](../angular/http-patterns.md)

??? question "15. What is the difference between share and shareReplay?"

    Both multicast one source execution. `share` is live-only: late subscribers miss everything and, by default, the operator resets when subscribers hit zero or the source terminates. `shareReplay` adds a replay buffer for late subscribers and (with the bare form) can hold the source subscription forever, the classic leak.

    **Deep dive:** [share](../subjects/share.md), [shareReplay](../subjects/shareReplay.md)

## Next Step

Solid on all fifteen? The [Senior Questions](questions-senior.md) go into semantics and architecture.
