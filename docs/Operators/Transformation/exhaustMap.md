---
description: "Ignore new values while the current inner Observable runs: double-click protection."
tags:
  - Operators
  - Transformation
---

# exhaustMap

`exhaustMap()` is a **higher-order mapping operator**. When it receives a value from the source (outer) Observable:

1.  It checks if it's already executing an inner Observable from a _previous_ source value.
2.  **If it's NOT busy:** It uses the new source value and your project function to create a new inner Observable, subscribes to it, and starts emitting its values.
3.  **If it IS busy** (meaning the inner Observable from a previous source value hasn't completed yet): It **completely ignores** the new value from the source Observable. It just drops it and does nothing further with it.
4.  It will only listen for and process a _new_ source value once its current inner Observable completes.

Think of it like a busy worker who takes the first task assigned. While working on that task, they completely ignore anyone else trying to give them new tasks. Only when they finish the current task will they accept the _next_ task that comes along. Any tasks attempted while they were busy are lost.

!!! abstract "At a glance"

    - **Signature:** `exhaustMap(project)`
    - **Use when:** the first trigger wins and repeats should be ignored until it finishes: submit buttons, login, manual refresh
    - **Avoid when:** every event matters; dropped values are gone forever (use `concatMap` to queue instead)
    - **Top gotcha:** ignored clicks give no feedback; pair it with a disabled state so users know a request is in flight

## Key Characteristics

- **Higher-Order Mapping:** Maps values from an outer Observable to inner Observables.
- **Ignores While Busy:** Discards incoming source values if an inner Observable is currently active.
- **No Concurrency (Managed):** Only ever handles one inner Observable at a time.
- **No Cancellation:** It doesn't cancel the active inner Observable; it lets it finish.
- **Use Cases:** Perfect for situations where you want to execute an action based on the _first_ trigger in a potential burst of triggers, and then ignore all subsequent triggers until that action is fully complete. Common for preventing duplicate actions caused by rapid user input, like double-clicks.

## Minimal Example

```typescript
import { exhaustMap, interval, map, take } from "rxjs";

interval(500)
  .pipe(
    take(4), // source emits 0, 1, 2, 3
    exhaustMap((n) =>
      interval(600).pipe(
        take(2),
        map((i) => `outer ${n} / inner ${i}`),
      ),
    ),
  )
  .subscribe(console.log);

// 1 and 2 arrive while the inner stream for 0 is active: DROPPED
// outer 0 / inner 0
// outer 0 / inner 1
// outer 3 / inner 0
// outer 3 / inner 1
```

## Real-World Example Scenario

A classic scenario where `exhaustMap` shines is **preventing double form submissions**.

**Scenario:** A user fills out a form in your Angular application and clicks the "Submit" button. This click should trigger an API call to save the data. However, users sometimes get impatient or accidentally double-click the button. If you used `mergeMap`, you might send the same data twice concurrently. If you used `concatMap`, the second click would be queued and executed after the first completes (still potentially undesirable). If you used `switchMap`, the second click might cancel the first save attempt (definitely not what you want!).

You want the application to:

1.  Register the _first_ click on "Submit".
2.  Start the API call (the inner Observable).
3.  **Ignore any further clicks** on the "Submit" button _while_ that API call is in progress.
4.  Only after the first API call completes (successfully or with an error) should it listen for a _new_ click again.

`exhaustMap` handles this perfectly.

## Angular Example

```typescript
import { Component, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject, catchError, exhaustMap, finalize, of } from "rxjs";

@Component({
  selector: "app-submit-once",
  template: `
    <button (click)="submits$.next()" [disabled]="submitting()">
      {{ submitting() ? "Submitting..." : "Submit" }}
    </button>
    <p>{{ status() }}</p>
  `,
})
export class SubmitOnceComponent {
  private readonly http = inject(HttpClient);

  protected readonly submits$ = new Subject<void>();
  protected readonly submitting = signal(false);
  protected readonly status = signal("");

  constructor() {
    this.submits$
      .pipe(
        // clicks while a save is in flight are IGNORED, not queued
        exhaustMap(() => {
          this.submitting.set(true);
          return this.http.post("/api/orders", {}).pipe(
            catchError(() => of(null)), // keep the stream alive on failure
            finalize(() => this.submitting.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) =>
        this.status.set(result ? "Order placed" : "Something went wrong"),
      );
  }
}
```

**How it works:**

1. Every click pushes into the `submits$` Subject.
2. `exhaustMap` starts the HTTP `POST` for the first click. While that request is in flight, further clicks are **dropped**, not queued and not cancelled into a new request.
3. `finalize` resets the loading flag on success, error, or unsubscribe, so the button re-enables exactly when `exhaustMap` becomes ready for the next click.
4. `catchError` on the inner Observable keeps one failed save from killing the whole click stream, and `takeUntilDestroyed()` cleans up with the component.

## Common Mistakes

**Expecting dropped values to run later.** Unlike `concatMap`, there is no queue. A click ignored by `exhaustMap` never produces a request. If every event must be processed, `exhaustMap` is the wrong tool.

**No feedback for ignored clicks.** Users cannot tell the difference between "ignored" and "broken". Disable the button or show a spinner while the inner Observable runs.

**Using switchMap for login.** Pressing Enter twice would cancel the first auth request mid-flight. Login flows are the textbook `exhaustMap` case: let the first attempt finish, ignore the rest.

## Interview Q&A

??? question "A user triple-clicks Save. What happens with exhaustMap, concatMap, switchMap, and mergeMap?"

    `exhaustMap`: one request; clicks two and three are dropped. `concatMap`: three requests, one after another. `switchMap`: three attempts, but requests one and two are cancelled; only the third completes. `mergeMap`: three concurrent requests. This single scenario is the most common higher-order mapping interview question.

??? question "Why is exhaustMap the usual choice for login forms?"

    An in-flight auth request should neither be duplicated (`mergeMap`), queued for replay (`concatMap`), nor cancelled by an impatient second click (`switchMap`). Ignoring repeats until the attempt resolves matches what users expect.

??? question "Does exhaustMap ever cancel its inner Observable?"

    No. It always lets the active inner Observable finish; it only drops incoming source values while busy. Cancellation on new input is `switchMap`'s behavior.

## Related

- [switchMap vs mergeMap vs concatMap](../../comparisons/switchMap-mergeMap-concatMap.md), where exhaustMap is the fourth strategy to mention
- [concatMap](concatMap.md) to queue events instead of dropping them
- [switchMap](switchMap.md) to cancel the in-flight operation instead of protecting it

## Summary

Use `exhaustMap` when you want to ensure that an action triggered by an event stream only runs if it's not already running due to a previous trigger. It's the perfect tool for preventing duplicate submissions or actions caused by rapid, repeated events where only the first "available" trigger should be processed.
