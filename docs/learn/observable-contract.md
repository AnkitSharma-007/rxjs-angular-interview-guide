---
description: "The grammar every Observable obeys: any number of values, then at most one error or completion."
tags:
  - Fundamentals
---

# The Observable Contract

Every Observable follows one simple grammar, often written as:

```
next* (error | complete)?
```

In words: **zero or more `next` notifications, optionally followed by exactly one terminal notification, either `error` or `complete`, never both.** After a terminal notification, nothing else is ever delivered to that subscriber.

This contract is what makes RxJS composable: every operator can rely on it, and every operator preserves it.

## The Guarantees

1. **Values stop after termination.** Once `error` or `complete` has been delivered, no further `next` (or anything else) reaches the subscriber, even if a badly behaved producer keeps pushing.
2. **Error and complete are mutually exclusive.** A stream ends in success (`complete`) or failure (`error`), never in both, and never twice.
3. **Teardown always runs.** After a terminal notification, or on unsubscribe, the producer's cleanup logic executes exactly once.

RxJS enforces this at the `Subscriber` layer, so even hand-written `new Observable(...)` producers that misbehave are sanitized:

```typescript
import { Observable } from "rxjs";

const rude$ = new Observable<number>((subscriber) => {
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2); // ignored: contract enforced
  subscriber.error(new Error("too late")); // also ignored
});

rude$.subscribe({
  next: console.log,
  complete: () => console.log("complete"),
});

// 1
// complete   (the post-completion next and error are silently dropped)
```

The same rule is why a completed [`Subject`](../subjects/subject.md) ignores further `next()` calls.

## Why Interviews Care

The contract explains behaviors that otherwise look like trivia:

- Why an uncaught error **kills a stream permanently**, and why [`catchError`](../operators/error-handling/catchError.md) must swap in a _new_ Observable rather than "resume" the old one.
- Why [`retry`](../operators/error-handling/retry.md) works by **resubscribing**: the errored execution is unrecoverable by contract, so the only way forward is a fresh one.
- Why placing error handling on the **inner** Observable of a `switchMap` keeps the outer stream alive: the inner stream's termination is contained, the outer stream never saw a terminal notification.
- Why `forkJoin` can trust "last value at completion" and `last()` can exist at all.

## Common Mistakes

**Treating `error` as just another value.** It is a terminal state. Streams that must survive failures (form pipelines, polling loops) need errors converted to values (`catchError` returning a fallback) _inside_ the pipeline.

**Emitting after completion in custom Observables.** RxJS drops the extra notifications, but the producer keeps doing wasted work. Return proper teardown and stop producing on termination.

**Assuming unsubscribe is part of the grammar.** Unsubscription is a consumer-side action, not a notification: no terminal event is delivered, handlers do not fire, only teardown (and `finalize`) run. See [Subscription & Teardown](subscription.md).

## Interview Q&A

??? question "Can an Observable error twice, or error and then complete?"

    No. The contract allows at most one terminal notification. Anything a producer attempts after that is discarded by the Subscriber wrapper. This is guaranteed by RxJS itself, not left to producer discipline.

??? question "Why can't a stream simply continue after an error?"

    Because `error` is defined as termination, operators and subscribers everywhere rely on it: resources are torn down and state is released. Recovery therefore means *replacement*: `catchError` substitutes a new Observable, and `retry` resubscribes for a fresh execution.

??? question "Where should catchError go so one failure doesn't stop everything?"

    On the innermost stream whose death you can afford, typically the per-request inner Observable inside `switchMap`/`mergeMap`/`concatMap`. The inner termination satisfies the contract locally while the outer stream keeps emitting.

## Next Up

- [Subscription & Teardown](subscription.md): the consumer-side half of the lifecycle
- [catchError](../operators/error-handling/catchError.md) and [retry](../operators/error-handling/retry.md), the recovery tools built on the contract
- [Subject](../subjects/subject.md), where the same rules govern manual `next()`/`complete()` calls
