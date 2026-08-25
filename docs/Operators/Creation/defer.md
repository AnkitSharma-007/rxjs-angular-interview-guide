---
description: "Create the Observable lazily, once per subscriber, at subscription time."
tags:
  - Operators
  - Creation
---

# defer

`defer()` takes a factory function and calls it **at subscription time**, once **per subscriber**, to produce the actual Observable. Nothing inside the factory runs until someone subscribes.

It is the tool for making eager things lazy and for making per-subscription decisions.

!!! abstract "At a glance"

    - **Signature:** `defer(() => ObservableInput)`
    - **Use when:** the source must be created fresh per subscription: wrapping promises, capturing "now" values, choosing a source conditionally
    - **Avoid when:** the source is already lazy and identical for every subscriber (most operator pipelines)
    - **Top gotcha:** without `defer`, `from(promise)` starts the promise's work immediately, and `retry` would re-consume the same settled promise instead of re-running the work

## Minimal Example

```typescript
import { defer, of } from "rxjs";

const eager$ = of(Date.now()); // timestamp captured NOW, once
const lazy$ = defer(() => of(Date.now())); // captured per subscription

setTimeout(() => {
  eager$.subscribe((t) => console.log("eager:", t)); // creation time
  lazy$.subscribe((t) => console.log("lazy: ", t)); // subscription time
}, 1000);

// eager: 1700000000000   <- ~1s older
// lazy:  1700000001000
```

## Angular Example: Making a Promise Lazy and Retryable

Browser APIs return promises, which are eager and run exactly once. `defer` fixes both properties:

```typescript
import { Injectable } from "@angular/core";
import { Observable, defer, from, retry, timer } from "rxjs";

@Injectable({ providedIn: "root" })
export class ClipboardService {
  // Each subscription (and each retry!) calls the factory again,
  // creating a fresh promise and re-running the actual work.
  readText(): Observable<string> {
    return defer(() => from(navigator.clipboard.readText())).pipe(
      retry({ count: 2, delay: () => timer(300) }),
    );
  }
}
```

**How it works:**

1. Without `defer`, `from(navigator.clipboard.readText())` would call the API the moment the Observable is built, whether or not anyone subscribes.
2. With `defer`, the clipboard is read when a consumer subscribes.
3. `retry` resubscribes on failure, which re-invokes the factory, creating a **new** promise and genuinely retrying the operation. Retrying a bare `from(promise)` would just re-deliver the same rejection.

## Common Mistakes

**Wrapping a promise without `defer` and expecting retries.** A promise runs once; `retry` on `from(promise)` re-reads the same settled result. The factory is what makes each attempt real.

**Doing side effects at pipeline-build time.** `of(computeExpensive())` computes eagerly even if the stream is never used. `defer(() => of(computeExpensive()))` moves the cost to subscription time.

**Using `defer` for conditional logic that belongs in `iif` or plain operators.** `defer(() => flag ? a$ : b$)` is legitimate, but if the condition depends on a stream value, `switchMap` is the natural home.

## Interview Q&A

??? question "What problem does defer solve that of and from cannot?"

    Evaluation timing. `of(expr)` evaluates `expr` when the Observable is created; `defer(() => of(expr))` evaluates it when each subscriber arrives. Anything time-, state-, or side-effect-sensitive belongs behind the factory.

??? question "Why does defer matter for retrying promise-based APIs?"

    `retry` works by resubscribing. Resubscribing to `from(promise)` replays the same settled promise; resubscribing to `defer(() => from(callApi()))` calls `callApi()` again. `defer` turns \"replay the result\" into \"redo the work\".

??? question "Is defer cold or hot?"

    Cold by definition: the producer is created inside, per subscriber. `defer` is effectively the purest expression of coldness in RxJS, and a good vehicle for explaining the concept.

## Related

- [from](from.md) and its promise-eagerness caveat
- [retry](../error-handling/retry.md), which relies on resubscription semantics
- [Cold Observables](../../learn/cold-observables.md) for the underlying model
