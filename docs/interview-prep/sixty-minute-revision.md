---
description: "A timed revision plan for the final hour before an RxJS/Angular interview."
tags:
  - Interview Prep
---

# The 60-Minute Revision

One hour before the interview. Follow the clock; resist the urge to deep-dive. Every block ends with sound bites you can deliver verbatim.

## 0-10 min: Fundamentals

Skim: [Observable](../learn/observable.md) · [The Observable Contract](../learn/observable-contract.md) · [Subscription & Teardown](../learn/subscription.md)

Sound bites:

- "Observables are lazy streams; nothing runs until subscribe, and each subscription of a cold Observable runs the producer again."
- "The contract is `next* (error | complete)?`; after a terminal event, silence. That's why errors kill streams and recovery means replacement or resubscription."
- "Unsubscribe runs teardown but not the complete handler; `finalize` is the only hook that covers complete, error, and unsubscribe."

## 10-25 min: Higher-Order Mapping (the big one)

Skim: [the four-way comparison](../comparisons/switchMap-mergeMap-concatMap.md), especially the triple-click table and decision guide.

Sound bites:

- "switchMap cancels, mergeMap parallelizes, concatMap queues, exhaustMap drops."
- "Typeahead: debounceTime, distinctUntilChanged, switchMap, with catchError on the inner request so one failure doesn't kill the search box."
- "Save button: exhaustMap plus a disabled state. Login: exhaustMap. Ordered writes: concatMap. Independent fan-out: mergeMap with a concurrency cap."
- "concatMap(fn) is just mergeMap(fn, 1)."

## 25-35 min: Subjects & Sharing

Skim: the [Subject family table](cheat-sheet-operators.md#subject-family) · [shareReplay](../subjects/shareReplay.md)

Sound bites:

- "Subject = events, BehaviorSubject = state with a current value, ReplaySubject = history for late subscribers, AsyncSubject = final value at completion."
- "Services expose `asObservable()`; only the service calls next()."
- "shareReplay with bufferSize 1 and refCount true is the HTTP cache; once the source completes it's cached permanently, and refresh means rebuilding the stream behind a trigger Subject."
- "Multicasting is always a Subject in the middle: one producer, fan-out to N subscribers."

## 35-45 min: Angular Integration

Skim: [HttpClient Patterns](../angular/http-patterns.md) · [Router](../angular/router.md) · [Signals Interop](../angular/signals-interop.md)

Sound bites:

- "Dependent requests: chained switchMaps. Parallel: forkJoin dictionary with per-request catchError. Resilience order: timeout, retry, catchError."
- "Sibling navigation reuses the component; data loading must react to paramMap, not snapshot."
- "valueChanges has no initial emission; startWith(control.value) fixes it."
- "Signals hold state, RxJS handles events and async; toSignal subscribes eagerly and cleans up on destroy, toObservable coalesces synchronous updates."

## 45-55 min: Cleanup & Traps

Skim: [Memory Leaks](../angular/memory-leaks.md) · [Anti-Patterns](../angular/anti-patterns.md)

Sound bites:

- "HTTP completes itself; intervals, fromEvent, Subjects, valueChanges, and Router.events don't. Those need async pipe, toSignal, or takeUntilDestroyed."
- "Nested subscribes lose cancellation, error flow, and teardown; flatten with a mapping operator."
- "takeUntil goes last in the pipe. takeWhile(() => this.alive) only checks on emission, so it leaks on silent streams."
- "Streams created in getters resubscribe every change-detection cycle; create once as a field and share."

## 55-60 min: Final Sweep

Read the [Ten Facts](cheat-sheet-operators.md#ten-facts-worth-saying-out-loud) once, slowly. Close the laptop.

!!! tip "In the interview"

    When asked "which operator?", answer with the **decision criterion**, not just the name: "only the latest matters here, so switchMap" or "every write must land in order, so concatMap". Reasoning is what gets scored.
