---
description: "What subscribe() returns, what unsubscribe() really does, and every way Angular cleans up subscriptions."
tags:
  - Fundamentals
---

# Subscription & Teardown

Calling `subscribe()` starts an Observable execution and returns a **`Subscription`**: a handle representing that running execution. Its one important method is `unsubscribe()`, which stops the execution and runs the producer's cleanup logic, called **teardown**.

Understanding what actually happens on unsubscribe separates candidates who use RxJS from candidates who understand it.

## What Teardown Means

When an Observable is created, its producer can register cleanup:

```typescript
import { Observable } from "rxjs";

const seconds$ = new Observable<number>((subscriber) => {
  let count = 0;
  const id = setInterval(() => subscriber.next(count++), 1000);

  // teardown: runs on unsubscribe, error, or complete
  return () => {
    clearInterval(id);
    console.log("interval cleared");
  };
});

const sub = seconds$.subscribe(console.log);
setTimeout(() => sub.unsubscribe(), 3500);

// 0, 1, 2, "interval cleared"
```

Every well-behaved source works this way: `interval` clears its timer, `fromEvent` removes its listener, `HttpClient` **aborts the HTTP request**. Cancellation in RxJS is not "stop calling my callback"; it is "release the underlying resource".

## Unsubscribe Is Not Complete

A crucial distinction:

|                          | `complete()`                      | `unsubscribe()`                         |
| ------------------------ | --------------------------------- | --------------------------------------- |
| Initiated by             | The **producer** (no more values) | The **consumer** (no longer interested) |
| `complete` handler runs? | Yes                               | **No**                                  |
| `finalize` runs?         | Yes                               | Yes                                     |
| Teardown runs?           | Yes                               | Yes                                     |

Unsubscribing silently detaches: no completion notification is delivered. If cleanup must run on every ending, put it in [`finalize`](../operators/utility/finalize.md), not in the `complete` handler.

## Do You Always Have to Unsubscribe?

No. Finite streams clean themselves up:

- `HttpClient` requests emit once and **complete**; the subscription closes itself.
- Streams bounded by [`take`](../operators/filtering/take.md), [`first`](../operators/filtering/first.md), or [`takeWhile`](../operators/filtering/takeWhile.md) complete by construction.

The danger is **infinite** sources: `interval`, `fromEvent`, Subjects, `valueChanges`, router streams. Those outlive the component unless something ends them.

## The Angular Cleanup Toolbox

From most to least preferred in typical component code:

1. **Don't subscribe manually.** Bind with the [`async` pipe](../angular/async-pipe.md) or convert with `toSignal`; both manage the subscription for you.
2. **`takeUntilDestroyed()`** from `@angular/core/rxjs-interop`, for pipelines that must be subscribed in class code. Ties completion to `DestroyRef`.
3. **`takeUntil(destroy$)`**, the classic manual pattern (a Subject plus `ngOnDestroy` calling `next()` then `complete()`). Still expected knowledge in interviews.
4. **Storing `Subscription` objects** and calling `unsubscribe()` in `ngOnDestroy`, possibly collecting several with `subscription.add(...)`. Verbose, easy to forget, last resort.

## Common Mistakes

**Expecting the `complete` handler to run on unsubscribe.** It does not; only teardown and `finalize` run. Loading flags reset in `complete` stay stuck when the user navigates away mid-request.

**Unsubscribing HTTP "just in case" but leaking intervals.** Effort goes where it is not needed while `interval`/`fromEvent`/Subject subscriptions, the real leak sources, go uncleaned. Focus on non-completing sources.

**One `Subscription` variable, many subscribes.** Reassigning `this.sub = obs$.subscribe(...)` overwrites the previous handle, orphaning it. Use `takeUntilDestroyed` on each pipeline, or `subscription.add()`.

## Interview Q&A

??? question "What exactly happens when you call unsubscribe()?"

    The subscription is marked closed, the producer's teardown runs (clearing timers, removing listeners, aborting requests), and no further notifications are delivered. Notably, the `complete` handler is **not** invoked; `finalize` is.

??? question "Which Angular subscriptions actually need manual cleanup?"

    Ones on sources that never complete: `interval`/`timer` loops, `fromEvent`, Subjects, `valueChanges`, router streams. One-shot `HttpClient` calls complete on their own, though cleanup still helps abort requests that are in flight when the component dies.

??? question "How does takeUntilDestroyed work under the hood?"

    It is `takeUntil` wired to Angular's `DestroyRef`: when the injection context (component, directive, service) is destroyed, an internal notifier fires, completing the stream, which closes the subscription and runs teardown. Called outside an injection context, it requires an explicit `DestroyRef` argument.

## Next Up

- [The Observable Contract](observable-contract.md): the rules that make teardown predictable
- [takeUntil](../operators/filtering/takeUntil.md) and [finalize](../operators/utility/finalize.md), the operators from this page
- [Async Pipe](../angular/async-pipe.md), the subscribe-free alternative
