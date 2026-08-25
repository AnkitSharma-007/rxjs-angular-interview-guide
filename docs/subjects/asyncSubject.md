---
description: "A Subject that emits only its final value, and only when it completes."
tags:
  - Subjects
---

# AsyncSubject

An `AsyncSubject` is the rarest member of the Subject family. It buffers the **last** value passed to `next()`, and emits it to all subscribers **only when `complete()` is called**. Until completion, subscribers receive nothing at all.

Think of it as "the Subject that behaves like a Promise": one final result, delivered at the end, replayed to anyone who asks afterwards.

!!! abstract "At a glance"

    - **Signature:** `new AsyncSubject<T>()`
    - **Use when:** a one-shot computation should broadcast a single final result to all interested parties, whenever they subscribe
    - **Avoid when:** consumers need intermediate values (`Subject`/`ReplaySubject`) or current state (`BehaviorSubject`)
    - **Top gotcha:** without `complete()`, an AsyncSubject **never emits anything**, no matter how many `next()` calls happened

## Minimal Example

```typescript
import { AsyncSubject } from "rxjs";

const result = new AsyncSubject<number>();

result.subscribe((v) => console.log(`A: ${v}`));

result.next(1);
result.next(2);
result.next(3); // nothing logged yet: no completion

result.complete(); // A: 3   (only the LAST value, at completion)

result.subscribe((v) => console.log(`B: ${v}`)); // B: 3  (late subscribers get it too)
```

## Where It (Rarely) Fits

The classic use case is a **one-shot, shareable result**: an expensive computation or request that runs once, where every consumer, early or late, should receive the same final answer:

```typescript
import { AsyncSubject, Observable } from "rxjs";

export class LicenseService {
  private readonly license$ = new AsyncSubject<string>();
  private started = false;

  getLicense(): Observable<string> {
    if (!this.started) {
      this.started = true;
      this.validateLicenseKey().then((key) => {
        this.license$.next(key);
        this.license$.complete(); // emission happens here
      });
    }
    return this.license$.asObservable(); // everyone gets the final key, once ready
  }

  private validateLicenseKey(): Promise<string> {
    return Promise.resolve("VALID-KEY");
  }
}
```

In modern code, the same need is usually covered by `shareReplay(1)` on a **single-emission** source like an HTTP call, or by `firstValueFrom` when a Promise is acceptable. (On a multi-value source they diverge: `shareReplay` forwards every value live and replays the last one, while AsyncSubject stays silent until completion.) Interviewers still like AsyncSubject as a "do you know the whole family?" question.

## Common Mistakes

**Forgetting `complete()`.** All values are held back until completion; a missing `complete()` means permanent silence. This is the defining behavior, and the main source of bugs.

**Using it for progress or state.** Intermediate `next()` values are unobservable by design. Progress updates want `Subject`/`ReplaySubject`; current state wants `BehaviorSubject` or a signal.

**Reinventing `shareReplay(1)`.** If the source is an Observable that emits once and completes (like an HTTP call), `source$.pipe(shareReplay(1))` provides the same "one result, replayed to everyone" semantics without manual Subject management. The equivalence only holds for single-emission sources: a multi-value stream through `shareReplay` delivers every value to live subscribers, which AsyncSubject never does.

## Interview Q&A

??? question "When does an AsyncSubject emit, and what exactly?"

    Only on `complete()`, and only the last `next()` value, followed immediately by the completion notification. Subscribers arriving after completion still receive that final value: it is cached forever.

??? question "What happens if an AsyncSubject completes without any next() calls?"

    Subscribers receive only the `complete` notification, no value. If it errors instead, subscribers (including future ones) receive the error.

??? question "Which non-Subject tools cover AsyncSubject's use case today?"

    For single-emission sources like HTTP calls, `shareReplay(1)` for stream consumers or `lastValueFrom(source$)` when a Promise fits better. For multi-value sources the match is looser (`shareReplay` forwards intermediate values live; a true only-the-final-value need is `takeLast(1)` territory). AsyncSubject remains relevant mostly for manual, imperative completion control, and for interview completeness.

## Related

- [Subject](subject.md), [BehaviorSubject](behaviorSubject.md), [ReplaySubject](replaySubject.md), the rest of the family
- [shareReplay](shareReplay.md), the operator that usually replaces it
- [last](../operators/filtering/last.md), the operator with matching only-at-completion semantics
