---
description: "Run side effects like logging without changing the stream."
tags:
  - Operators
  - Utility
---

# tap

The `tap` operator lets you perform **side effects** for notifications (`next`, `error`, `complete`) emitted by an Observable. A "side effect" is an action that doesn't directly modify the value passing through the stream itself.

Think of it like this: Data is flowing down a pipe (your Observable stream). `tap` allows you to attach a sensor to the side of the pipe. This sensor can:

1.  **Look** at the data flowing past (`next` notification).
2.  **React** if something goes wrong (an `error` notification occurs).
3.  **Notice** when the flow stops (`complete` notification).

Crucially, the sensor ( `tap` ) **does not change the data** flowing through the pipe. The same value that comes into `tap` goes out of `tap` to the next operator in the chain.

!!! abstract "At a glance"

    - **Signature:** `tap(nextFn)` or `tap({ next, error, complete })`
    - **Use when:** logging, debugging, analytics, or carefully scoped external side effects
    - **Avoid when:** transforming values (`map`), doing cleanup (`finalize`), or handling errors (`catchError`)
    - **Top gotcha:** `tap`'s return value is ignored, and its side effects run **once per subscription**, so multiple subscribers repeat them

## Why Use `tap`?

Its primary purpose is performing actions that aren't part of the main data transformation logic:

1.  **Logging:** The most common use! Log values as they pass through a specific point in your stream to understand what's happening.
2.  **Debugging:** Temporarily insert `tap(console.log)` to inspect values during development.
3.  **Updating External State (with caution):** You _could_ use `tap` to update things outside the stream, like setting a loading flag or updating a Signal. However, be mindful – complex state logic is often better handled directly in the `subscribe` block or using dedicated state management patterns. The `finalize` operator is often preferred for cleanup actions like stopping loading indicators.
4.  **Triggering Other Actions:** Maybe start a notification or trigger some non-critical background task based on an emission.

## Minimal Example

```typescript
import { map, of, tap } from "rxjs";

of(1, 2, 3)
  .pipe(
    tap((n) => console.log("before map:", n)),
    map((n) => n * 10),
    tap((n) => console.log("after map:", n)),
  )
  .subscribe();

// before map: 1, after map: 10
// before map: 2, after map: 20
// before map: 3, after map: 30
```

## Real-World Example: Logging and Updating Loading State During Data Fetch

Let's fetch some user data and use `tap` to log the progress and potentially update a loading state (though we'll use `finalize` for stopping the loading, as it's more robust).

## Code Snippets

**1. Simple Data Service (`user-data.service.ts`)**

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, delay, of } from "rxjs"; // Import 'delay' and 'of' for simulation

export interface SimpleUser {
  id: number;
  name: string;
}

@Injectable({
  providedIn: "root",
})
export class UserDataService {
  private http = inject(HttpClient);
  private apiUrl = "https://jsonplaceholder.typicode.com/users/"; // Fake API

  getUser(id: number): Observable<SimpleUser> {
    console.log(`UserDataService: Requesting user with ID: ${id}`);
    // In a real app, use http.get:
    // return this.http.get<SimpleUser>(`${this.apiUrl}${id}`);

    // --- Simulation for predictable example ---
    const fakeUser: SimpleUser = { id: id, name: `User ${id}` };
    return of(fakeUser).pipe(delay(1500)); // Simulate network delay
    // --- End Simulation ---
  }
}
```

**2. User Profile Component (`user-profile.component.ts`) - Uses `tap`**

```typescript
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { UserDataService, SimpleUser } from "./user-data.service"; // Adjust path
import { EMPTY, Observable, catchError, delay, finalize, tap } from "rxjs";

@Component({
  selector: "app-user-profile",
  template: `
    <h3>User Profile (Tap Example)</h3>
    <button (click)="loadUser(1)" [disabled]="loading()">Load User 1</button>
    <button (click)="loadUser(5)" [disabled]="loading()">Load User 5</button>
    <button (click)="loadUser(999)" [disabled]="loading()">
      Load User 999 (Will Error)
    </button>

    @if (loading()) {
      <p>Loading user data...</p>
    } @else if (errorMessage()) {
      <p style="color: red;">Error: {{ errorMessage() }}</p>
    } @else if (user()) {
      <div>
        <h4>{{ user()?.name }}</h4>
        <p>ID: {{ user()?.id }}</p>
      </div>
    } @else {
      <p>Click a button to load user data.</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileComponent {
  private userDataService = inject(UserDataService);
  private destroyRef = inject(DestroyRef);

  // --- State Signals ---
  user = signal<SimpleUser | null>(null);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  loadUser(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.user.set(null);
    console.log(`UserProfileComponent: Starting to load user ${id}`);

    // --- Modify service call to handle potential error ---
    let user$: Observable<SimpleUser>;
    if (id === 999) {
      // Simulate an error case
      user$ = new Observable((observer) =>
        observer.error(new Error(`User with ID ${id} not found`)),
      ).pipe(delay(500)); // Simulate delay before error
    } else {
      user$ = this.userDataService.getUser(id);
    }
    // --- End modification ---

    user$
      .pipe(
        // --- Using tap ---
        tap({
          // Side effect for NEXT notification (successful data emission)
          next: (userData) => {
            console.log(
              "%c tap: Received user data in stream:",
              "color: blue",
              userData,
            );
            // You could do other things here, like trigger analytics maybe.
            // BUT: Notice we don't modify 'userData' here.
          },
          // Side effect for ERROR notification
          error: (err) => {
            console.error(
              "%c tap: Encountered an error in stream:",
              "color: red",
              err.message,
            );
            // We can log the error here, but handling (like setting UI state)
            // is often better done in catchError or subscribe's error handler.
          },
          // Side effect for COMPLETE notification
          // (Note: finalize is often more reliable for cleanup)
          complete: () => {
            console.log(
              "%c tap: Stream completed (no more values expected).",
              "color: green",
            );
          },
        }),
        // -----------------
        // Handle errors properly. catchError stops the error from killing the stream
        // and allows finalize to run.
        catchError((err: Error) => {
          this.errorMessage.set(err.message || "Failed to load user.");
          // Return EMPTY or another observable to gracefully complete the stream
          return EMPTY;
        }),
        // finalize runs when the observable completes OR errors (guaranteed cleanup)
        finalize(() => {
          this.loading.set(false);
          console.log(
            `UserProfileComponent: Finished loading attempt for user ${id}.`,
          );
        }),
        // Automatically unsubscribe when the component is destroyed
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          // Update the main state in subscribe's next handler
          this.user.set(data);
        },
        // Error handling primarily done in catchError now
        error: (err) => {
          /* Already caught and handled */
        },
        // Complete handler (optional, finalize often covers cleanup)
        complete: () => {
          console.log("UserProfileComponent: Subscribe detected completion.");
        },
      });
  }
}
```

**Explanation:**

1.  When `loadUser()` is called, we set the `loading` signal to `true`.
2.  We call the (modified) `userDataService.getUser(id)` which returns an Observable.
3.  We `pipe` this Observable through several operators:
    - **`tap({...})`**:
      - The `next` function inside `tap` logs the received `userData` when (and if) the `getUser` Observable successfully emits data. It _doesn't_ change the `userData`.
      - The `error` function logs the error if the `getUser` Observable fails.
      - The `complete` function logs when the stream finishes normally.
    - **`catchError(...)`**: This properly handles potential errors. It catches the error from the stream (or from `tap`'s error handler if it threw one), sets the `errorMessage` signal, and returns `EMPTY` so the stream terminates gracefully without crashing the application and allows `finalize` to run.
    - **`finalize(...)`**: This is crucial for cleanup. It sets `loading` back to `false` _regardless_ of whether the stream completed successfully (`next` + `complete`) or errored out (`error`). This is generally safer than using `tap({ complete: ... })` for UI state cleanup.
    - **`takeUntilDestroyed(...)`**: Standard practice for preventing memory leaks by unsubscribing when the component is destroyed.
4.  Finally, `.subscribe({...})` is called to activate the entire chain.
    - The `next` handler in `subscribe` is the primary place to update the component's main data state (the `user` signal).
    - The `error` and `complete` handlers in `subscribe` are less critical here because `catchError` and `finalize` are handling those aspects for UI state updates.

Run this code, click the buttons, and watch the console. You'll see the `tap` logs appearing _before_ the final state updates in the `subscribe` or `finalize` blocks, demonstrating how `tap` lets you observe the stream's events without interfering with the main data flow or error handling logic.

## Common Mistakes

**Returning a value from `tap`.** Whatever the callback returns is discarded; the input value continues downstream unchanged. Transformations belong in `map`; async work belongs in `switchMap` and friends.

**Using `tap({ complete })` for cleanup.** It never fires on error or unsubscribe. `finalize` covers all three terminal paths and is the right tool for loading flags and resource cleanup.

**Forgetting side effects multiply with subscribers.** On a cold, unshared stream, three subscribers mean the `tap` runs three times, tripling analytics events or logs. Share the stream (or move the effect) when that matters.

## Interview Q&A

??? question "What is the difference between tap and map?"

    `map` transforms the value and its return value flows downstream. `tap` observes the notification, runs a side effect, ignores the callback's return value, and passes the original value through untouched.

??? question "When do side effects belong in tap vs in subscribe?"

    `subscribe` is the stream's end consumer: final state updates belong there. `tap` is for observing at a specific point *inside* the pipeline (before/after certain operators), for cross-cutting concerns like logging, and for effects in shared streams where you cannot control every subscriber.

??? question "Does tap execute if nobody subscribes?"

    No. Like everything in a pipeline, `tap` only runs as notifications flow, and notifications only flow with at least one subscription. A common debugging surprise: adding `tap(console.log)` shows nothing because the Observable was never subscribed.

## Related

- [finalize](finalize.md) for guaranteed cleanup on complete, error, or unsubscribe
- [map](../transformation/map.md) when you actually want to change the value
- [catchError](../error-handling/catchError.md) for reacting to errors rather than observing them
