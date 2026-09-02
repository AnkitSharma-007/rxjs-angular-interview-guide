---
description: "Two observables that emit nothing: EMPTY completes immediately, NEVER stays silent forever."
tags:
  - Operators
  - Creation
---

# EMPTY vs NEVER

Let's clarify the difference between the RxJS constants `EMPTY` and `NEVER`. Both are simple, pre-defined Observable constants, but they represent very different stream behaviors, primarily concerning completion.

Think of it like this: Both represent a stream that will _never give you any data_ (no `next` emissions). The difference lies in whether they tell you they are finished or just stay silent forever.

1.  **`EMPTY`**
    - **What it does:** Represents an Observable that emits **zero** items.
    - **Key Behavior:** As soon as you subscribe to it, it immediately sends a **`complete`** notification.
    - **Analogy:** It's like a function that returns immediately without doing anything (`return;`), or reading an empty file. It quickly signals "I have nothing to give you, and I'm done."
    - **Use Case:** Useful when you need an Observable that does nothing but signal successful completion right away. This is often helpful in conditional logic within higher-order mapping operators (like `switchMap`, `mergeMap`, `concatMap`). For example, if a condition isn't met, you might return `EMPTY` instead of making an API call, indicating that the operation for that specific trigger completed successfully without producing a value.

2.  **`NEVER`**
    - **What it does:** Represents an Observable that emits **zero** items.
    - **Key Behavior:** It **never** sends a `complete` notification and **never** sends an `error` notification. It remains silent indefinitely after subscription.
    - **Analogy:** It's like a process that hangs forever without producing output or terminating, or a phone line that just keeps ringing and ringing without ever being answered or going to an error state. It signals "I have nothing for you right now, and I might _never_ have anything, and I'm certainly not finished."
    - **Use Case:** Represents a stream that simply never emits or terminates. Useful in testing, and for deliberately preventing completion in operators where completion is what matters: a `NEVER` input keeps [`merge`](../combination/merge.md) or [`concat`](../combination/concat.md) from ever completing, and `switchMap(() => NEVER)` parks a pipeline until the next outer value. **It does not "keep `combineLatest` or `race` alive":** `combineLatest` needs every source to emit at least once, so a `NEVER` input suppresses all output permanently, and in `race` a `NEVER` contender simply loses and is unsubscribed.

!!! abstract "At a glance"

    - **Signature:** `EMPTY` and `NEVER` are constants, not functions; import and use them directly
    - **Use `EMPTY` when:** a branch should produce nothing but still complete, typically inside `switchMap`/`concatMap` conditionals or `catchError`
    - **Use `NEVER` when:** a stream must stay open silently: tests, preventing completion in `merge`/`concat` pipelines, parking a branch inside a higher-order map
    - **Top gotcha:** returning `NEVER` where `EMPTY` was meant leaves queues (`concatMap`) and joins (`forkJoin`) waiting forever

## Direct Comparison

| Feature              | `EMPTY`                     | `NEVER`                |
| :------------------- | :-------------------------- | :--------------------- |
| **`next` emissions** | 0                           | 0                      |
| **`complete`**       | Yes (immediately)           | No (never)             |
| **`error`**          | No (by default)             | No (never)             |
| **Terminates?**      | Yes (completes immediately) | No (runs indefinitely) |

## Minimal Example

```typescript
import { EMPTY, NEVER } from "rxjs";

EMPTY.subscribe({
  next: () => console.log("next"), // never runs
  complete: () => console.log("EMPTY: complete"), // runs immediately
});

NEVER.subscribe({
  next: () => console.log("next"), // never runs
  complete: () => console.log("complete"), // never runs either
});

// Output: "EMPTY: complete" and nothing else, ever
```

## Code Snippet Demonstration

```typescript
import { Component, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EMPTY, NEVER } from "rxjs";

@Component({
  selector: "app-empty-never-demo",
  template: `
    <h4>EMPTY vs NEVER Demo</h4>
    <p>Check the console log.</p>
    <p>EMPTY Status: {{ emptyStatus() }}</p>
    <p>NEVER Status: {{ neverStatus() }}</p>
  `,
})
export class EmptyNeverDemoComponent {
  protected readonly emptyStatus = signal("Subscribing...");
  protected readonly neverStatus = signal("Subscribing...");

  constructor() {
    console.log("--- Subscribing to EMPTY ---");
    // EMPTY completes synchronously on subscribe; no teardown needed
    EMPTY.subscribe({
      next: () => this.emptyStatus.set("Got next (unexpected)"),
      complete: () => {
        // called immediately, before the subscribe() call even returns
        console.log("EMPTY: complete! (Called immediately)");
        this.emptyStatus.set("Completed immediately");
      },
    });
    console.log(`EMPTY status right after subscribe: ${this.emptyStatus()}`);

    console.log("--- Subscribing to NEVER ---");
    // NEVER never terminates on its own; tie the subscription to the
    // component's lifetime or it leaks
    NEVER.pipe(takeUntilDestroyed()).subscribe({
      next: () => this.neverStatus.set("Got next (unexpected)"),
      complete: () =>
        // NEVER itself never completes; this fires only because
        // takeUntilDestroyed completes the stream on destroy
        console.log("NEVER: complete (from takeUntilDestroyed on destroy)"),
    });
    console.log(`NEVER status right after subscribe: ${this.neverStatus()}`);

    // show that NEVER does not complete on its own
    setTimeout(() => {
      if (this.neverStatus() === "Subscribing...") {
        console.log(
          "After 2 seconds, NEVER still has not emitted or completed.",
        );
        this.neverStatus.set("Still running after 2s (as expected)");
      }
    }, 2000);
  }
}
```

## Summary

Choose `EMPTY` when you need an Observable that does nothing but signals successful completion instantly.

Choose `NEVER` when you need an Observable that does nothing and _never_ signals completion or error.

## Interview Q&A

??? question "Where does EMPTY show up in real Angular code?"

    Mostly in two places: as a conditional no-op inside higher-order mapping (`switchMap(x => valid(x) ? this.http.post(...) : EMPTY)`) and as a "swallow the error, emit nothing" recovery in `catchError(() => EMPTY)`. In both, downstream completion semantics stay healthy because EMPTY completes.

??? question "What breaks if you use NEVER instead of EMPTY inside concatMap?"

    `concatMap` waits for each inner Observable to complete before starting the next. `NEVER` never completes, so the queue stalls permanently: every later source value waits behind a stream that will not end. The same trap freezes `forkJoin`, and a `NEVER` source in `combineLatest` blocks it from ever emitting, since every input must emit at least once.

??? question "Does subscribing to EMPTY require cleanup?"

    No; it completes synchronously on subscribe, which closes the subscription. `NEVER` is the opposite: it never terminates itself, so the subscriber must unsubscribe (or use `takeUntil`-style operators) to release it.

## Related

- [of](of.md), whose zero-argument form behaves like EMPTY
- [concatMap](../transformation/concatMap.md) and [forkJoin](../combination/forkJoin.md), where the completion difference matters most
- [catchError](../error-handling/catchError.md), a frequent EMPTY call site
