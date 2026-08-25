---
description: "Ignore the first N emissions."
tags:
  - Operators
  - Filtering
---

# skip

The `skip()` operator is quite straightforward: it tells an Observable stream to simply **ignore the first `N` values** it emits. After skipping the specified number of items, it will then allow all subsequent emissions to pass through normally.

Think of it as telling someone to start counting _after_ a certain number. If you say `skip(3)`, you're essentially saying "Ignore the 1st, 2nd, and 3rd things that happen, but tell me about the 4th, 5th, 6th, and so on."

!!! abstract "At a glance"

    - **Signature:** `skip(count)`
    - **Use when:** a known number of leading emissions is noise, classically the initial `BehaviorSubject` value
    - **Avoid when:** the cut-off is a condition or another stream (`skipWhile`, `skipUntil`)
    - **Top gotcha:** skipped values are still produced by the source and then discarded; `skip` does not delay subscription

## Key Characteristics

1.  **Counts and Ignores:** It keeps an internal count of how many items have been emitted by the source.
2.  **Skips the Start:** It prevents the first `N` emissions from reaching the subscriber or subsequent operators in the pipe.
3.  **Emits After Skipping:** Once `N` items have been skipped, all following items are emitted without further modification by `skip()`.
4.  **Argument:** It takes one argument: `count` (the number of emissions to skip).

## Minimal Example

```typescript
import { from, skip } from "rxjs";

from([1, 2, 3, 4, 5]).pipe(skip(2)).subscribe(console.log);

// 3, 4, 5
```

## Real-World Analogy

Imagine you are subscribing to a news feed that sends updates every hour. However, you know that the first 2 updates of the day are always just routine system checks or old news summaries that you don't care about.

You can use `skip(2)` on this news feed stream. This way, you won't be bothered by the first two updates each day. You'll only start receiving notifications from the 3rd update onwards, which contains the actual news you're interested in.

## Angular Example: Ignoring the Initial Value from a `BehaviorSubject`

A common use case in Angular involves `BehaviorSubject` or `ReplaySubject(1)`. These types of Subjects store the "current" value and emit it immediately to any new subscriber. Sometimes, you only want to react to _future changes_ pushed to the Subject, not the value it happens to hold at the exact moment you subscribe.

Let's say you have a service managing user authentication status:

```typescript
import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: "root" })
export class AuthService {
  // Initially, user is logged out. Emits `false` immediately to new subscribers.
  private loggedInStatus = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.loggedInStatus.asObservable();

  login() {
    // Simulate successful login
    console.log("AuthService: User logged in.");
    this.loggedInStatus.next(true);
  }

  logout() {
    console.log("AuthService: User logged out.");
    this.loggedInStatus.next(false);
  }
}

// --- In a Component ---
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop"; // Core interop functions
import { filter, skip } from "rxjs";
import { AuthService } from "./auth.service"; // Assuming AuthService exists as defined previously

@Component({
  selector: "app-login-watcher",
  template: `
    <div>
      User is currently: {{ isLoggedIn() ? "Logged In" : "Logged Out" }}
    </div>

    @if (loginMessage()) {
      <div style="color: green;">{{ loginMessage() }}</div>
    }

    <button (click)="authService.login()">Log In</button>
    <button (click)="authService.logout()">Log Out</button>
  `,
})
export class LoginWatcherComponent {
  protected authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  isLoggedIn = toSignal(this.authService.isLoggedIn$, { initialValue: false });

  // Use a signal to hold the dynamic login message
  loginMessage = signal<string>(""); // Initialize with an empty string

  constructor() {
    this.setupLoginSubscription();
  }

  private setupLoginSubscription(): void {
    this.authService.isLoggedIn$
      .pipe(
        skip(1),
        // Optional: Filter for only 'true' values if you only care about login events
        filter((isLoggedIn) => isLoggedIn === true),
        // Automatically unsubscribe when the component is destroyed
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        console.log("LoginWatcherComponent: Detected LOGIN event!");
        // Use the signal's .set() method to update the state
        this.loginMessage.set(
          `Welcome back! Login detected at ${new Date().toLocaleTimeString()}`,
        );

        // Clear the message after a few seconds using standard setTimeout
        setTimeout(() => {
          // Use .set() again to clear the signal's value
          this.loginMessage.set("");
        }, 5000);
      });

    console.log(
      "LoginWatcherComponent initialized. Waiting for login events...",
    );
  }
}
```

**Explanation of the Angular Example:**

1.  `AuthService` uses a `BehaviorSubject` (`loggedInStatus`) initialized to `false`.
2.  `isLoggedIn` is created using toSignal, which converts the `isLoggedIn$` Observable into a signal. This is useful for displaying the current state reactively in the template (isLoggedIn()). `toSignal` requires an `initialValue`.
3.  The `skip(1)` operator intercepts the initial `false` emission and discards it.
4.  The `subscribe` block does _not_ run initially.
5.  Later, if the user clicks the "Log In" button, `authService.login()` calls `this.loggedInStatus.next(true)`.
6.  This new value `true` is emitted by the `BehaviorSubject`.
7.  `skip(1)` has already done its job (skipped one item), so it lets `true` pass through.
8.  The optional `filter(isLoggedIn => isLoggedIn === true)` also lets `true` pass.
9.  The `subscribe` block now executes, logging the message and updating the component's `loginMessage` property, because a _new_ value was emitted _after_ the initial skipped one.

## Common Mistakes

**Skipping the current state you actually need.** `skip(1)` on a `BehaviorSubject` gives you _changes only_. If the component also needs the state at subscribe time, expose it separately, as the example does with `toSignal` for display plus a skipped stream for events.

**Forgetting that replayed values count.** Subscribing to a `ReplaySubject(2)` replays two values immediately; `skip(1)` discards the first replayed one, not the first "new" one. The count applies to whatever the subscriber receives, in order.

**Using skip for value-based conditions.** "Ignore until the flag becomes true" is [`skipWhile`](https://rxjs.dev/api/operators/skipWhile) or a plain [`filter`](filter.md); `skip` is strictly positional.

## Interview Q&A

??? question "Why is skip(1) so common with BehaviorSubject?"

    A `BehaviorSubject` emits its current value to every new subscriber. When you only want to react to future changes (a login event, a settings change), `skip(1)` discards that immediate replay while keeping all later emissions.

??? question "How do skip, skipWhile, and skipUntil differ?"

    `skip(n)` discards a fixed count. `skipWhile(predicate)` discards while the predicate holds and then lets everything through (it never re-engages). `skipUntil(notifier$)` discards until another Observable emits. Count vs condition vs external signal.

??? question "Does skip prevent the skipped work from happening?"

    No. The source still runs and emits; `skip` just drops the first N notifications on the way downstream. If producing values is expensive, control the source itself rather than filtering afterwards.

## Related

- [take](take.md), the mirror image that keeps only the first N
- [filter](filter.md) for value-based dropping
- [BehaviorSubject](../../subjects/behaviorSubject.md), the usual reason skip(1) appears in Angular code

## Summary

`skip(N)` is useful when you need to disregard a known number of initial emissions from an Observable stream, allowing you to focus on the values that come after that initial phase.
