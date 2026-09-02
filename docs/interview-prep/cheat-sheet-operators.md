---
description: "Every RxJS decision table on one page: pick the right operator, Subject, and cleanup strategy fast."
tags:
  - Interview Prep
---

# Operator Cheat Sheet

One page, every decision table. Built for the last hour before an interview.

## "I want to..." → Operator

| I want to...                                | Use                                                                      | Why                                             |
| ------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| Transform each value                        | [`map`](../operators/transformation/map.md)                              | Pure per-value projection                       |
| Run a side effect without changing values   | [`tap`](../operators/utility/tap.md)                                     | Return value ignored                            |
| Accumulate state across emissions           | [`scan`](../operators/transformation/scan.md)                            | Emits every intermediate result                 |
| Call an API per value, latest wins          | [`switchMap`](../operators/transformation/switchMap.md)                  | Cancels the stale inner stream                  |
| Call an API per value, all in parallel      | [`mergeMap`](../operators/transformation/mergeMap.md)                    | Optional concurrency cap                        |
| Call an API per value, strictly in order    | [`concatMap`](../operators/transformation/concatMap.md)                  | Queues; = `mergeMap(fn, 1)`                     |
| Ignore triggers while one is running        | [`exhaustMap`](../operators/transformation/exhaustMap.md)                | Drops, does not queue                           |
| Drop values failing a condition             | [`filter`](../operators/filtering/filter.md)                             | Stream stays alive                              |
| Settle bursty input (typing)                | [`debounceTime`](../operators/filtering/debounceTime.md)                 | Emits after silence                             |
| Steady rate from continuous events          | [`throttleTime`](../operators/filtering/throttleTime.md)                 | Consider `{ trailing: true }`                   |
| Skip unchanged repeats                      | [`distinctUntilChanged`](../operators/filtering/distinctUntilChanged.md) | `===` by default; objects need a comparator     |
| First N values then stop                    | [`take`](../operators/filtering/take.md)                                 | Completes + unsubscribes                        |
| Stop on an external signal                  | [`takeUntil`](../operators/filtering/takeUntil.md)                       | Keep it last in the pipe                        |
| Stop when the data says so                  | [`takeWhile`](../operators/filtering/takeWhile.md)                       | `inclusive: true` for the final value           |
| Combine latest values of live streams       | [`combineLatest`](../operators/combination/combineLatest.md)             | Silent until all emit once                      |
| All parallel calls, one final result        | [`forkJoin`](../operators/combination/forkJoin.md)                       | Inputs must complete                            |
| Attach current state to an event            | [`withLatestFrom`](../operators/combination/withLatestFrom.md)           | Only the source triggers                        |
| Funnel independent triggers into one stream | [`merge`](../operators/combination/merge.md)                             | First come, first served                        |
| One stream after another completes          | [`concat`](../operators/combination/concat.md)                           | Cache-then-network                              |
| Give a stream an immediate first value      | [`startWith`](../operators/combination/startWith.md)                     | Unblocks combineLatest; loading states          |
| Recover from errors with a fallback         | [`catchError`](../operators/error-handling/catchError.md)                | Must return an Observable                       |
| Retry transient failures                    | [`retry`](../operators/error-handling/retry.md)                          | `{ count, delay }`; gate on error type          |
| Bound waiting time                          | [`timeout`](../operators/utility/timeout.md)                             | Number = every gap; `with` for fallback         |
| Guaranteed cleanup                          | [`finalize`](../operators/utility/finalize.md)                           | Runs on complete, error, AND unsubscribe        |
| Share one execution, live only              | [`share`](../subjects/share.md)                                          | Resets at zero subscribers or on complete/error |
| Share + cache for late subscribers          | [`shareReplay`](../subjects/shareReplay.md)                              | `{ bufferSize: 1, refCount: true }`             |

## Higher-Order Mapping: The Quadrant

|                           | **Keep all inner streams** | **One at a time**                  |
| ------------------------- | -------------------------- | ---------------------------------- |
| **New value interrupts**  | —                          | `switchMap` (cancel the old)       |
| **New value waits/joins** | `mergeMap` (parallel)      | `concatMap` (queue)                |
| **New value is dropped**  | —                          | `exhaustMap` (protect the current) |

Triple-click Save: `mergeMap` 3 racing requests · `concatMap` 3 sequential · `switchMap` cancels first 2 · `exhaustMap` 1 request, 2 drops. Full scenario: [the comparison](../comparisons/switchMap-mergeMap-concatMap.md).

## Subject Family

|                                                     | Initial value | New subscriber gets    | Sync read    | After complete()         |
| --------------------------------------------------- | ------------- | ---------------------- | ------------ | ------------------------ |
| [`Subject`](../subjects/subject.md)                 | No            | Nothing                | No           | Complete only            |
| [`BehaviorSubject`](../subjects/behaviorSubject.md) | Required      | Current value          | `getValue()` | Complete only            |
| [`ReplaySubject(n)`](../subjects/replaySubject.md)  | No            | Last n values          | No           | **Still replays buffer** |
| [`AsyncSubject`](../subjects/asyncSubject.md)       | No            | Nothing until complete | No           | Final value + complete   |

## Timing Operators

| Operator                                                    | Behavior                                         | Fits                      |
| ----------------------------------------------------------- | ------------------------------------------------ | ------------------------- |
| [`debounceTime(t)`](../operators/filtering/debounceTime.md) | Last value after t of silence                    | Typing                    |
| [`throttleTime(t)`](../operators/filtering/throttleTime.md) | Value, then cooldown t                           | Scroll, clicks            |
| [`auditTime(t)`](../operators/filtering/auditTime.md)       | On activity, wait t, emit latest                 | Steady sampling of bursts |
| [`sampleTime(t)`](../operators/filtering/sampleTime.md)     | Every t, emit latest only if new since last tick | Fixed-clock readouts      |
| [`delay(t)`](../operators/utility/delay.md)                 | Shift each value by t (errors NOT delayed)       | Minimum display time      |

## Unsubscribe Strategies

| Strategy                | When                      | Notes                                                             |
| ----------------------- | ------------------------- | ----------------------------------------------------------------- |
| Async pipe / `toSignal` | Display data              | No manual subscription at all                                     |
| `takeUntilDestroyed()`  | Class-code pipelines      | Injection context (or pass `DestroyRef`)                          |
| `takeUntil(destroy$)`   | Legacy / explicit control | `next()` then `complete()`; keep it **last**                      |
| `take(1)` / `first()`   | One-shot reads            | Self-completing; on empty: `take(1)` silent, `first()` EmptyError |
| Manual `unsubscribe()`  | Last resort               | Collect with `subscription.add()`                                 |

Not needed for plain `HttpClient` calls: they complete themselves. Needed for: intervals, `fromEvent`, Subjects, `valueChanges`, `Router.events`.

## Error Handling in One Pipeline

```typescript
http.get(url).pipe(
  timeout(5000),                   // bound each attempt
  retry({ count: 2, delay: ... }), // transient errors only
  catchError(() => of(fallback))   // final safety net -> UI state
);
```

Order is the interview point: timeout inside, retry before catchError. Layers: interceptor = transport, service = domain fallback, component = UI state. Details: [Interceptors & Retries](../angular/interceptors-retry.md).

## Ten Facts Worth Saying Out Loud

1. Observables are lazy; nothing runs until subscribe.
2. Cold = producer per subscriber; hot = shared producer. Unicast/multicast is the same axis.
3. The contract: `next* (error | complete)?`, then silence.
4. Errors are terminal; `catchError` replaces, `retry` resubscribes.
5. Unsubscribe runs teardown but **not** the complete handler; `finalize` covers all endings.
6. `switchMap` cancels, `concatMap` queues, `exhaustMap` drops, `mergeMap` parallelizes.
7. Bare `shareReplay(1)` never disconnects; completed sources cache forever regardless of `refCount`.
8. `combineLatest` is silent until every input emits; fix with `startWith`.
9. `forkJoin` needs completion, not just emission.
10. Signals hold state; RxJS orchestrates events and async. Bridge with `toSignal`/`toObservable`.
