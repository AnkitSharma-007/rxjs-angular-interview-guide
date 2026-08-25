---
description: "Where RxJS memory leaks actually come from in Angular, how to find them, and how to prevent them."
tags:
  - Angular
---

# Memory Leaks & Subscription Cleanup

An RxJS memory leak in Angular is almost always the same story: **a subscription to a stream that never completes outlives the component that created it**. The subscription's callbacks capture `this`, so the destroyed component, its template references, and everything it holds stay reachable and are never garbage-collected.

A guaranteed senior-interview topic, because the symptoms (slow degradation, duplicate handlers, ghost requests) only appear at scale.

## Where Leaks Actually Come From

Ranked by how often they bite in real applications:

1. **Infinite sources subscribed in components:** [`interval`](../operators/creation/interval.md)/`timer` loops, [`fromEvent`](../operators/creation/fromEvent.md) on `window`/`document`, service-level [Subjects](../subjects/subject.md), router streams, store selections. None of these ever complete.
2. **`valueChanges` of long-lived controls.** A control owned by the component dies with it, but subscribing to a **service- or parent-owned** control from a child leaks when the child is destroyed.
3. **`shareReplay` without `refCount`.** The bare `shareReplay(1)` form keeps the source subscribed forever; on a non-completing source that is a leak by design. See [shareReplay](../subjects/shareReplay.md).
4. **Event-bus Subjects holding dead listeners.** Every un-torn-down `subscribe` on a global Subject keeps its component in memory and its logic firing.

What almost never leaks: a plain `HttpClient` subscription. It emits once and **completes**, closing itself. (Cleanup still adds value there: it aborts requests in flight when the user navigates away.)

## The Anatomy of a Leak

```typescript
// LEAKS: the interval outlives the component
export class TickerComponent {
  count = 0;
  constructor() {
    interval(1000).subscribe(() => this.count++); // no teardown of any kind
  }
}
```

Every navigation to this component adds another immortal interval, each keeping a dead `TickerComponent` alive. After ten visits: ten timers, ten retained component trees, ten times the work per second.

```typescript
// FIXED: completion is tied to the component's lifetime
constructor() {
  interval(1000)
    .pipe(takeUntilDestroyed())
    .subscribe(() => this.count++);
}
```

## Prevention, in Order of Preference

1. **Don't subscribe manually.** The [`async` pipe](async-pipe.md) or [`toSignal`](signals-interop.md) manage the entire lifecycle.
2. **`takeUntilDestroyed()`** for pipelines that must live in class code.
3. **`takeUntil(destroy$)`**, the classic pattern; still interview-required knowledge. Remember: `destroy$.next()` then `complete()` in `ngOnDestroy`, and keep `takeUntil` **last** in the pipe.
4. **Self-completing pipelines** where the logic allows: `take(1)`, `first()`, [`takeWhile`](../operators/filtering/takeWhile.md).
5. **Manual `Subscription` bookkeeping** as the last resort.

Full mechanics of teardown live in [Subscription & Teardown](../learn/subscription.md).

## Finding Leaks

- **DevTools heap snapshots:** navigate to the suspect component and away several times, snapshot, and search for the component class name. Multiple detached instances = leak.
- **Instrument teardown during development:** a `finalize(() => console.log("closed"))` (or a `DestroyRef.onDestroy` log) on suspicious pipelines shows immediately which ones never close.
- **Symptom watching:** handlers firing more times after each visit to a page is the classic duplicate-subscription signature.

## Common Mistakes

**Auditing HTTP calls while ignoring intervals and Subjects.** Effort goes to the streams that complete anyway; the immortal ones slip through. Audit by asking "does this source ever complete?".

**`takeUntil` before operators that hold other subscriptions.** A `switchMap` after `takeUntil` keeps its active inner subscription alive past the notifier (completing the outer stream does not cancel the inner one), and a `combineLatest`/`withLatestFrom` keeps its other sources subscribed. Purely pass-through operators like `finalize` are safe after it, but the simple rule that avoids the analysis: `takeUntil`-style operators go last.

**Trusting `takeWhile(() => this.alive)`.** It only checks on emission; a silent stream never re-evaluates the flag and the subscription lingers. Use signal-based completion (`takeUntil`, `takeUntilDestroyed`).

## Interview Q&A

??? question "Does Angular automatically clean up subscriptions when a component is destroyed?"

    No. Angular destroys the component, but RxJS subscriptions are plain objects with no framework linkage; whatever they capture stays alive. Only the mechanisms that hook destruction, the async pipe, `toSignal`, `takeUntilDestroyed`, or your own `ngOnDestroy` logic, break that chain.

??? question "Why is subscribing to HttpClient usually leak-safe, and when is it still worth cleaning up?"

    The response stream emits once and completes, which closes the subscription automatically. Cleanup still matters for in-flight requests during navigation (unsubscribing aborts them) and for pipelines where the HTTP call is chained into something non-completing.

??? question "How would you demonstrate a leak to a teammate?"

    Add a counter or log inside the subscription, navigate in and out of the page three times, and show the handler firing three times per event. Then take a heap snapshot and point at the detached component instances retained by the subscription closure.

## Related

- [Subscription & Teardown](../learn/subscription.md) for the underlying mechanics
- [takeUntil](../operators/filtering/takeUntil.md) and [Async Pipe](async-pipe.md), the main prevention tools
- [shareReplay](../subjects/shareReplay.md) for the refCount leak in detail
