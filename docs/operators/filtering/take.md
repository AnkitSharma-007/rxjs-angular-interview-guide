---
description: "Take the first N values, then complete."
tags:
  - Operators
  - Filtering
---

# take

`take()` is an RxJS operator that allows you to limit the number of values emitted by a source Observable. You specify a number, `N`, and `take(N)` will:

1.  Emit the first `N` values that come from the source Observable.
2.  As soon as the Nth value is emitted, it immediately sends a **`complete`** notification.
3.  It automatically **unsubscribes** from the source Observable.

Think of it as telling the Observable, "Just give me the first N things you have, and then you can stop." It's useful for dealing with streams that might emit many or even infinite values when you only need a limited number from the beginning.

**Key Characteristics:**

- **Limits Emissions:** Only allows the first `N` values through.
- **Completes the Stream:** Automatically sends a `complete` notification after the Nth value.
- **Unsubscribes from Source:** Prevents further processing or potential memory leaks from the source after completion.
- **Filtering/Completion:** Acts as both a way to filter by count and a way to ensure completion.

!!! abstract "At a glance"

    - **Signature:** `take(count)`
    - **Use when:** you need the first N values, or a guaranteed end for an infinite stream
    - **Avoid when:** the cut-off is a condition (`takeWhile`), an external signal (`takeUntil`), or the tail (`takeLast`)
    - **Top gotcha:** if the source completes early with fewer than N values, `take` forwards completion quietly; `first()` would error instead

## Minimal Example

```typescript
import { interval, take } from "rxjs";

interval(1000)
  .pipe(take(3))
  .subscribe({
    next: console.log,
    complete: () => console.log("done"),
  });

// 0, 1, 2, done   (the infinite interval is unsubscribed automatically)
```

## Real-World Example Scenario

Imagine you have a feature where you want to allow the user to perform an action, but only permit them to do it a limited number of times within a certain context, perhaps the first 3 times they click a specific "Try It" button during a tutorial phase.

**Scenario:** You have a button. You want to react to the user clicking it, but only respond to the **first 3 clicks**. After the third click, you want to ignore any subsequent clicks on that button for that specific stream instance. `take(3)` is perfect for this.

## Code Snippet

```typescript
import { Component, signal } from "@angular/core";
import { Subject, take } from "rxjs";

@Component({
  selector: "app-take-demo",
  template: `
    <p>Reacting only to the first 3 clicks.</p>
    <button (click)="clicks$.next()">Click Me (Max 3 Times)</button>
    <ul>
      @for (log of clickLog(); track $index) {
        <li>{{ log }}</li>
      }
    </ul>
    <p>{{ completionStatus() }}</p>
  `,
})
export class TakeDemoComponent {
  protected readonly clicks$ = new Subject<void>();
  protected readonly clickLog = signal<string[]>([]);
  protected readonly completionStatus = signal("Stream active...");

  constructor() {
    // no takeUntilDestroyed needed: take(3) completes the stream itself
    this.clicks$.pipe(take(3)).subscribe({
      next: () =>
        this.clickLog.update((log) => [
          ...log,
          `Processed click #${log.length + 1}`,
        ]),
      complete: () => this.completionStatus.set("Stream completed by take(3)."),
    });
  }
}
```

**Explanation:**

1.  **`clicks$` Subject**: Each button click pushes a value into the stream; this could go on forever.
2.  **`take(3)`**: Lets the first three clicks through. As the third click is delivered, it emits `complete` and unsubscribes from the Subject.
3.  **After completion**: Later clicks still call `clicks$.next()`, but nothing is listening on this pipeline anymore; the log stays at three entries and the status shows the completion message.
4.  **Cleanup**: Because `take(3)` guarantees completion, this subscription does not need `takeUntilDestroyed` to be leak-safe (adding it anyway also covers the case where the user never clicks three times before navigating away).

## Common Mistakes

**Using `take(1)` where `first()` semantics are wanted.** They differ on empty sources: `take(1)` completes silently, `first()` errors with `EmptyError`. Pick deliberately based on whether "no value" is an error in your flow.

**Snapshotting a plain Subject with `take(1)`.** A plain `Subject` has no current value, so `subject.pipe(take(1))` waits for the **next** emission (possibly forever). Snapshots need a `BehaviorSubject` or a signal.

**Expecting the pipeline to restart.** Once `take(N)` completes, that subscription is finished for good. Reacting to "another three clicks" requires subscribing again, not waiting.

## Interview Q&A

??? question "What is the difference between take(1) and first()?"

    Both emit at most one value and complete. `first()` accepts an optional predicate and **errors** with `EmptyError` if the source completes without a matching value; `take(1)` never errors on empty completion. `first(predicate)` is also equivalent to `filter(predicate)` + `take(1)`.

??? question "Why is take useful on infinite streams?"

    It converts an infinite stream into a finite one: after N values it completes and unsubscribes, running the source's teardown (clearing the interval, removing the listener). That guaranteed completion is also why such pipelines do not need manual unsubscribe management.

??? question "What happens if the source completes before N values?"

    `take` simply mirrors the early completion. Subscribers see however many values arrived and then `complete`; no error is raised.

## Related

- [takeUntil](takeUntil.md) to stop on a signal instead of a count
- [first](first.md) for one value with error-on-empty semantics
- [skip](skip.md), the mirror image that discards the first N values

## Summary

`take(N)` is a convenient way to limit the number of emissions you care about from an Observable and automatically ensure the stream completes and cleans up after itself once that limit is reached. It's very useful for handling "first N" scenarios or for putting a definite end on potentially infinite streams like `interval` or UI events.
