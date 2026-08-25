---
description: "Complete a stream when a notifier emits: the classic unsubscribe pattern."
tags:
  - Operators
  - Filtering
---

# takeUntil

`takeUntil()` is an RxJS operator primarily used for managing the lifetime of an Observable stream, effectively acting as a **completion operator**. It mirrors the source Observable, allowing its values to pass through, **until** a second Observable, called the `notifier`, emits its first value.

As soon as the `notifier` Observable emits _any_ value, `takeUntil()` immediately:

1.  Sends a `complete` notification for the stream it's operating on.
2.  Unsubscribes from both the source Observable and the `notifier` Observable.

The actual value emitted by the `notifier` doesn't matter; `takeUntil` only cares about the _event_ of an emission. **A notifier that completes without ever emitting does nothing**: the source stream keeps running, which is why the classic pattern calls `next()` and not just `complete()`.

!!! abstract "At a glance"

    - **Signature:** `takeUntil(notifier$)`
    - **Use when:** a stream must end on an external signal: component destroy, logout, cancel button
    - **Avoid when:** `takeUntilDestroyed()` covers the case with less boilerplate in Angular components
    - **Top gotcha:** keep `takeUntil` as the **last** operator in the pipe; operators added after it can outlive the notification

## Key Characteristics

- **Conditional Completion:** Completes the main stream based on an external signal (the `notifier`).
- **Takes a Notifier Observable:** You provide the Observable that signals when to stop: `takeUntil(notifier$)`.
- **Passes Source Values:** Emits values from the source until the notification occurs.
- **Automatic Unsubscription:** Handles cleanup by unsubscribing from both streams upon completion.

## Minimal Example

```typescript
import { interval, Subject, takeUntil } from "rxjs";

const stop$ = new Subject<void>();

interval(500).pipe(takeUntil(stop$)).subscribe(console.log);

setTimeout(() => stop$.next(), 1800); // signal after ~3 emissions

// 0, 1, 2, then the stream completes and unsubscribes
```

!!! tip "Prefer takeUntilDestroyed in Angular components"

    Angular's `takeUntilDestroyed()` from `@angular/core/rxjs-interop` implements exactly this pattern tied to the component's `DestroyRef`, with no manual Subject or `ngOnDestroy`. Interviewers still expect you to know the classic `destroy$` pattern below, so learn both.

## Real-World Example Scenario

The most common and idiomatic use case for `takeUntil()` in Angular is to automatically unsubscribe from Observables when a component is destroyed. This prevents memory leaks, which can occur if subscriptions remain active after a component is removed from the DOM.

**Scenario:** You have an Angular component that needs to perform a periodic action, perhaps updating a timer displayed on the screen every second using `interval(1000)`. This interval would run forever if not stopped. You need to ensure that when the user navigates away from the component (and it gets destroyed), the interval subscription is automatically cleaned up. `takeUntil()` combined with a `Subject` triggered in `ngOnDestroy` is the standard pattern for this.

## Code Snippet

```typescript
import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subject, interval, takeUntil, tap } from "rxjs";

@Component({
  selector: "app-take-until-demo",
  template: `
    <h4>TakeUntil Demo</h4>
    <p>Timer running (check console). It stops when component is destroyed.</p>
    <p>Current count: {{ currentCount }}</p>
  `,
})
export class TakeUntilDemoComponent implements OnInit, OnDestroy {
  currentCount = 0;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    console.log(
      `[${new Date().toLocaleTimeString()}] Component Init - Starting Interval`,
    );
    interval(1000)
      .pipe(
        tap((count) =>
          console.log(
            `[${new Date().toLocaleTimeString()}] Interval emitted: ${count}`,
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (count) => (this.currentCount = count),
        complete: () =>
          console.log(
            `[${new Date().toLocaleTimeString()}] Interval stream completed via takeUntil.`,
          ),
      });
  }

  ngOnDestroy(): void {
    console.log(
      `[${new Date().toLocaleTimeString()}] Component Destroy - Signaling takeUntil`,
    );
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Explanation:**

1.  **`destroy$ = new Subject<void>()`**: A private `Subject` is created. This will act as our `notifier`.
2.  **`interval(1000).pipe(...)`**: We create an Observable that emits numbers every second.
3.  **`takeUntil(this.destroy$)`**: This is the key. The `interval` stream will continue emitting values _until_ the `this.destroy$` Subject emits a value.
4.  **`subscribe({...})`**: We subscribe to process the values from the interval.
5.  **`ngOnDestroy()`**: This Angular lifecycle hook is guaranteed to run when the component is about to be destroyed.
    - **`this.destroy$.next()`**: We emit a dummy value (`void`) from our `destroy$` Subject.
    - **`this.destroy$.complete()`**: It's good practice to also complete the Subject.
6.  **Behavior**: As soon as `this.destroy$.next()` is called in `ngOnDestroy`, the `takeUntil(this.destroy$)` operator detects this emission. It immediately completes the `interval` stream (triggering the `complete` handler in the subscription) and unsubscribes from `interval`. No more values will be processed, and the interval timer stops, preventing a memory leak.

## Common Mistakes

**Putting `takeUntil` in the middle of the pipe.** Operators after it (especially `switchMap` or `shareReplay`) create inner subscriptions the notifier does not govern, so work keeps running after "completion". The lint-friendly rule: `takeUntil` goes last.

**Calling only `destroy$.complete()`.** Completion of the notifier without an emission does **not** stop the source. The pattern is `this.destroy$.next()` (stop signal) followed by `this.destroy$.complete()` (cleanup of the Subject itself).

**Hand-rolling the pattern where `takeUntilDestroyed` suffices.** In components and directives, the interop helper removes the Subject, the `OnDestroy` interface, and two lifecycle lines, and it cannot be forgotten on new subscriptions added later.

## Interview Q&A

??? question "Why should takeUntil be the last operator in a pipe?"

    Because it completes only the chain **up to that point**. A `switchMap` placed after `takeUntil` can hold a live inner subscription when the notifier fires, leaking the very work the pattern was meant to stop. Placing `takeUntil` last guarantees the whole chain tears down together.

??? question "What happens if the notifier completes without emitting?"

    Nothing. `takeUntil` reacts only to an emission from the notifier. This is a classic bug: a `destroy$` where someone calls `complete()` but never `next()` silently leaves every subscription running.

??? question "How does takeUntilDestroyed relate to takeUntil?"

    It is the same completion mechanism wired to Angular's `DestroyRef` instead of a manual Subject: called in an injection context (or given a `DestroyRef` explicitly), it completes the stream when the component, directive, or service scope is destroyed.

## Related

- [take](take.md) and [first](first.md) for count-based completion
- [Async Pipe](../../angular/async-pipe.md), which avoids manual subscriptions entirely
- [Hot Observables](../../learn/hot-observables.md) for why long-lived streams leak without completion

## Summary

`takeUntil()` provides a clean, declarative way to complete an Observable stream based on a signal from another Observable, making it the standard and recommended pattern for managing subscription lifetimes tied to Angular component lifecycles.
