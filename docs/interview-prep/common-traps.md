---
description: "Fourteen RxJS misconceptions that fail interviews, each corrected in two lines."
tags:
  - Interview Prep
---

# Common Traps & Misconceptions

Fast-scan format: the **myth** interviewers bait with, then the reality. If any correction surprises you, follow the link before the interview.

!!! danger "Myth 1: `delay` delays errors too"

    Errors bypass `delay` entirely and fire immediately, discarding buffered values. Minimum-display-time logic needs separate handling on the error path. → [delay](../operators/utility/delay.md)

!!! danger "Myth 2: `timeout(5000)` only limits the first emission"

    A plain number sets `each`: it polices **every** gap between emissions. A long-lived stream that goes quiet mid-life errors too. Use `{ first: 5000 }` for first-only. → [timeout](../operators/utility/timeout.md)

!!! danger "Myth 3: unsubscribe triggers the complete handler"

    It does not. No notification is delivered on unsubscribe; only teardown and `finalize` run. Cleanup in `complete` misses the navigation-away case. → [Subscription & Teardown](../learn/subscription.md)

!!! danger "Myth 4: a notifier that completes stops takeUntil"

    `takeUntil` reacts only to an **emission**. A `destroy$` that is completed but never nexted silently stops nothing, which is why the pattern is `next()` then `complete()`. → [takeUntil](../operators/filtering/takeUntil.md)

!!! danger "Myth 5: takeUntil works anywhere in the pipe"

    Operators after it (a `switchMap`, a `shareReplay`) can outlive the notification. `takeUntil` goes **last**. → [Memory Leaks](../angular/memory-leaks.md)

!!! danger "Myth 6: with refCount: true, shareReplay refetches after everyone unsubscribes"

    Only while the source is still **live**. Once it completes (an HTTP response), the value is cached permanently, `refCount` irrelevant. Refresh requires rebuilding the stream. → [shareReplay](../subjects/shareReplay.md)

!!! danger "Myth 7: BehaviorSubject and ReplaySubject(1) are interchangeable"

    Three differences: initial value (required vs none), `getValue()` (yes vs no), and after completion (nothing vs still replays the buffer). Caching flows expose all three. → [comparison](../comparisons/subject-behaviorSubject-replaySubject.md)

!!! danger "Myth 8: multiple async pipes share one subscription"

    Each `| async` subscribes independently; on a cold source that means duplicate work and duplicate HTTP requests. Bind once with `as`, share the stream, or use `toSignal`. → [Async Pipe](../angular/async-pipe.md)

!!! danger "Myth 9: of([1, 2, 3]) emits three values"

    One value: the array. Per-item emission is `from([1, 2, 3])`. Downstream operators behave completely differently. → [of](../operators/creation/of.md)

!!! danger "Myth 10: filter completes the stream when nothing matches"

    `filter` never terminates anything; a fully-filtered stream is silent, not complete. Count-based or condition-based completion is `take`/`takeWhile`/`first`. → [filter](../operators/filtering/filter.md)

!!! danger "Myth 11: toObservable emits every signal set()"

    It runs on effects and **coalesces**: several synchronous `set()` calls produce one emission with the final value. Event logs need a Subject. → [Signals Interop](../angular/signals-interop.md)

!!! danger "Myth 12: combineLatest emits as soon as one source emits"

    It waits for **every** source to emit at least once; one silent input blocks all output. Unblock with `startWith`. → [combineLatest](../operators/combination/combineLatest.md)

!!! danger "Myth 13: forkJoin emits when its sources have emitted"

    It waits for **completion**. A Subject or `valueChanges` input means it never fires, with no error to warn you. → [forkJoin](../operators/combination/forkJoin.md)

!!! danger "Myth 14: retrying a from(promise) re-runs the work"

    The promise already settled; `retry` just replays the same rejection. Wrap the call in `defer(() => from(call()))` so each attempt re-executes. → [defer](../operators/creation/defer.md)

## Self-Test

Cover the explanations and read only the myth lines: correct each one out loud in a sentence. Fourteen for fourteen means this page is done for you; anything less, follow the links.
