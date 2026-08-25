---
description: "Deprecated operator for custom retry logic; prefer retry with a config object."
tags:
  - Operators
  - Error Handling
---

# retryWhen

> **⚠️ Deprecated:** `retryWhen` is deprecated in RxJS and slated for removal. Prefer the [`retry`](retry.md) operator with a configuration object (`retry({ count, delay })`), which handles the same scenarios, including the exponential backoff shown below, with simpler code. This page is kept for interview awareness and for maintaining older codebases.

`retryWhen` gives you full control over the retry logic based on the errors that occur. Unlike `retry(n)`, which just retries immediately or with a simple configured delay, `retryWhen` lets you look at the sequence of errors and decide _if_ and _when_ to retry.

It works like this:

1.  You provide `retryWhen` with a function.
2.  This function receives an Observable (let's call it `errors$`) as input. This `errors$` observable emits the actual error objects whenever your source Observable fails.
3.  Your function must return a _new_ Observable (let's call it the "notifier" Observable).
4.  **Retry Trigger:** The source Observable (e.g., your HTTP request) is **resubscribed to (retried)** _every time the notifier Observable emits a `next` value_.
5.  **Stop Retrying:** If the notifier Observable emits an `error` or `complete` notification, the retrying stops, and the main Observable chain will emit that same `error` or `complete` notification.

!!! abstract "At a glance"

    - **Signature:** `retryWhen((errors$) => notifier$)` (deprecated)
    - **Use when:** maintaining older codebases or answering interview questions about legacy retry logic
    - **Prefer instead:** `retry({ count, delay })`, which covers the same scenarios declaratively
    - **Top gotcha:** a notifier that never errors or completes retries forever; termination is entirely your responsibility

## Key Points

1.  **Error Input:** Operates on the stream of errors from the source.
2.  **Notifier Output:** You define _when_ to retry by controlling when the notifier emits `next`.
3.  **Complex Logic:** Allows for sophisticated strategies like exponential backoff, checking external conditions (e.g., network status), or even prompting the user (though UI interaction within operators is generally discouraged).
4.  **Termination:** You _must_ ensure your notifier eventually emits an `error` or `complete` if you want the retries to stop; otherwise, you risk infinite retries. Usually, you `throwError` within the notifier's stream after a certain condition (like max retries exceeded) is met.

## Important Note

While `retryWhen` is powerful, it is deprecated and known for being complex and tricky to use correctly. For retry scenarios (like retrying a fixed number of times with a delay, retrying with exponential backoff, or retrying based on error type), the `retry` operator with its configuration object (`retry({ count: 3, delay: ... })`) is **preferred and easier to understand** in modern RxJS.

## Real-World Example

Let's implement a classic **exponential backoff** strategy. If an HTTP request fails, we want to retry, but wait longer each time before retrying, and give up after a few attempts.

- Attempt 1: Fails -> Wait 1 second -> Retry
- Attempt 2: Fails -> Wait 2 seconds -> Retry
- Attempt 3: Fails -> Wait 4 seconds -> Retry
- Attempt 4: Fails -> Give up and propagate the error.

- **Source Observable:** An `HttpClient` GET request.
- **Error Stream:** The `errors$` observable passed into `retryWhen`.
- **Notifier Logic:** Calculate increasing delay based on retry count, emit after delay, but throw an error if max retries exceeded.

## Modern Equivalent First

Before studying the legacy pattern, here is the same exponential backoff with today's [`retry`](retry.md):

```typescript
import { retry, throwError, timer } from "rxjs";

this.http.get<UserData>(this.apiUrl).pipe(
  retry({
    count: 3,
    delay: (error, retryCount) =>
      error.status >= 500 || error.status === 0
        ? timer(1000 * Math.pow(2, retryCount - 1)) // 1s, 2s, 4s
        : throwError(() => error), // don't retry client errors
  }),
);
```

Learn this form first. The rest of the page explains the `retryWhen` pattern you may still meet in older codebases.

## Angular Code Snippet

We'll modify the previous `UserService` example to use `retryWhen` for exponential backoff.

**1. User Data Service with `retryWhen`**

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import {
  Observable,
  throwError,
  timer,
  retryWhen,
  delayWhen,
  scan,
  tap,
  catchError,
} from "rxjs";

export interface UserData {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = "/api/user/profile"; // Example API endpoint

  getUserProfileWithRetryWhen(
    maxRetries = 3,
    initialDelay = 1000,
  ): Observable<UserData> {
    console.log("Attempting to fetch user profile (using retryWhen)...");
    return this.http.get<UserData>(this.apiUrl).pipe(
      tap(() =>
        console.log("Fetched user profile successfully on an attempt."),
      ),
      // --- retryWhen Logic ---
      retryWhen(
        (
          errors$, // errors$ is an Observable of the errors
        ) =>
          errors$.pipe(
            // Use scan to keep track of the retry attempts
            scan((retryCount, error: HttpErrorResponse) => {
              // Check if error is retryable and count is within limits
              // Here we retry only on 5xx or network errors, similar to before
              if (
                retryCount >= maxRetries ||
                !(error.status >= 500 || error.status === 0)
              ) {
                // If max retries reached or error is not retryable, throw the error
                // This will cause the notifier stream to error out, stopping retries.
                console.error(
                  `Attempt ${
                    retryCount + 1
                  }: Not retrying. Max retries (${maxRetries}) reached or error not retryable (${
                    error.status
                  }).`,
                );
                throw error; // Re-throw the error to be caught by the outer catchError
              }
              // Otherwise, increment the count for the next potential retry
              console.warn(
                `Attempt ${retryCount + 1} failed. Error: ${
                  error.message
                }. Will retry.`,
              );
              return retryCount + 1;
            }, 0), // Initial value for retryCount is 0
            // Calculate delay based on the retry count (exponential backoff)
            delayWhen((retryCount) => {
              const delay = initialDelay * Math.pow(2, retryCount - 1); // Calculate delay: 1000ms, 2000ms, 4000ms...
              console.log(
                `Attempt ${retryCount}: Waiting ${delay}ms before next retry...`,
              );
              return timer(delay); // Emit after the calculated delay
            }),
            // Note: If the scan operator above throws an error, this delayWhen
            // will not execute, and the error propagates immediately.
          ),
      ),
      // --- End of retryWhen Logic ---
      catchError((error: HttpErrorResponse) => {
        // This runs AFTER retryWhen gives up (notifier stream errors out)
        console.error(
          "Failed to fetch user profile after all retryWhen attempts:",
          error,
        );
        return throwError(
          () =>
            new Error(
              "Could not load user profile (retryWhen). Please try again later.",
            ),
        );
      }),
    );
  }
}
```

**2. User Profile Component**

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
import { UserService, UserData } from "./user.service"; // Adjust path if needed
import { EMPTY, catchError, tap, finalize } from "rxjs";

@Component({
  selector: "app-user-profile-rw", // Changed selector
  template: `
    <h3>User Profile (retryWhen Example)</h3>
    @if (loading()) {
      <p>Loading user profile...</p>
    } @else if (errorMsg()) {
      <p style="color: red;">Error: {{ errorMsg() }}</p>
    } @else if (userProfile()) {
      <div>
        <p><strong>ID:</strong> {{ userProfile()?.id }}</p>
        <p><strong>Name:</strong> {{ userProfile()?.name }}</p>
        <p><strong>Email:</strong> {{ userProfile()?.email }}</p>
      </div>
    } @else {
      <p>Click the button to load profile.</p>
    }

    <button (click)="loadProfile()" [disabled]="loading()">
      Load Profile (retryWhen)
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileRetryWhenComponent {
  // Renamed component
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  // --- State Signals ---
  userProfile = signal<UserData | null>(null);
  loading = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  loadProfile(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.userProfile.set(null);

    // Call the method using retryWhen
    this.userService
      .getUserProfileWithRetryWhen()
      .pipe(
        tap((data) => console.log("Component received user data:", data)),
        takeUntilDestroyed(this.destroyRef),
        catchError((err: Error) => {
          console.error("Component caught final error:", err);
          this.errorMsg.set(err.message || "An unknown error occurred.");
          return EMPTY;
        }),
        finalize(() => {
          this.loading.set(false);
          console.log("Finished loading attempt (success or final error).");
        }),
      )
      .subscribe({
        next: (data) => {
          this.userProfile.set(data);
        },
      });
  }
}
```

**Explanation of `retryWhen` Logic:**

1.  **`retryWhen(errors$ => ...)`**: We receive the stream of errors (`errors$`).
2.  **`errors$.pipe(...)`**: We process this error stream.
3.  **`scan((retryCount, error) => {...}, 0)`**: `scan` is like `reduce` for Observables. It maintains state across emissions.
    - `retryCount` holds the number of retries _attempted so far_ (starts at 0).
    - `error` is the current error emitted by the source.
    - Inside `scan`, we check if `retryCount >= maxRetries` or if the `error` type is one we don't want to retry.
    - If we should stop retrying, we `throw error;`. This is crucial! It makes the `scan` operator (and thus the whole notifier stream) emit an error, which signals `retryWhen` to stop and propagate this error.
    - If we _should_ retry, we increment the `retryCount` and return it. This incremented count becomes the input `retryCount` for the _next_ error emission and is also passed down the notifier pipe.
4.  **`delayWhen(retryCount => timer(delay))`**: This operator takes the `retryCount` passed down from `scan`.
    - It calculates the exponential delay: `initialDelay * Math.pow(2, retryCount - 1)`.
    - `timer(delay)` creates an Observable that emits a single value (0) after `delay` milliseconds.
    - `delayWhen` waits for this `timer` to emit before it emits the value it received (the `retryCount`). **This emission is what triggers `retryWhen` to resubscribe to the original `http.get` request.**

## Interview Q&A

??? question "Why was retryWhen deprecated?"

    Two reasons: the notifier pattern made the most common bugs easy (a notifier that never terminates retries forever; forgetting to rethrow swallows errors), and the `retry` configuration object covers the same scenarios, including conditional retries and backoff delays, with declarative options instead of a hand-built meta-stream.

??? question "Inside retryWhen, what exactly triggers a retry and what stops it?"

    Each `next` from the notifier triggers one resubscription of the source. An `error` or `complete` from the notifier ends the whole stream with that notification. That mapping (next = retry, error/complete = stop) is the crux interviewers check for.

## Related

- [retry](retry.md), the modern replacement with `count` and `delay` options
- [catchError](catchError.md) for the fallback after retries are exhausted
- [timer](../creation/timer.md), the delay source used in backoff notifiers

## Summary

`retryWhen` lets you construct a custom "notifier" Observable based on the errors from the source. When the notifier emits `next`, a retry occurs. When the notifier emits `error` or `complete`, retrying stops. While powerful for complex cases, remember that the modern `retry` operator often handles common scenarios more simply.
