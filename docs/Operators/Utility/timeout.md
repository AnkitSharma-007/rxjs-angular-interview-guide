---
description: "Error out if the source stays silent longer than a limit."
tags:
  - Operators
  - Utility
---

# timeout

The `timeout` operator sets a time limit. If the source Observable doesn't emit its **first value** or **complete** within that specified duration, the `timeout` operator will cause the stream to **emit a `TimeoutError`** and terminate.

Think of it like setting an **egg timer** for an operation:

- You start an operation (subscribe to the source Observable).
- You start the timer (`timeout` operator).
- If the operation finishes (emits a value or completes) _before_ the timer goes off, everything is fine.
- If the timer goes off _before_ the operation finishes, the timer rings loudly (`TimeoutError` is emitted), and you stop waiting for the original operation.

## Key Configurations & Behaviors

You can configure `timeout` with a duration (milliseconds), a specific `Date`, or a config object. A plain number sets the allowed gap for **every** emission, not just the first:

- `timeout(5000)`: Throws `TimeoutError` if no value arrives within 5 seconds of subscription, **or** if any later gap between values exceeds 5 seconds. (A number is shorthand for `{ each: 5000 }`.)
- `timeout({ first: 5000, each: 1000 })`: The first value must arrive within 5s; after that, values must be at most 1s apart.
- `timeout({ first: 5000 })`: Only the first value is bounded; later gaps are unlimited.
- `timeout({ each: 2000, with: () => fallback$ })`: Instead of erroring, switch to a fallback Observable when the deadline passes.

!!! abstract "At a glance"

    - **Signature:** `timeout(ms | date | { first, each, with })`
    - **Use when:** bounding waits on slow or unresponsive sources so the UI can react
    - **Avoid when:** a fallback is friendlier than an error; use the `with` option instead of `catchError` gymnastics
    - **Top gotcha:** `timeout(number)` polices the gap before **every** emission, not only the first one

## Minimal Example

```typescript
import { TimeoutError, timeout, timer } from "rxjs";

timer(3000) // first value would arrive after 3s
  .pipe(timeout(1000)) // but we only allow 1s
  .subscribe({
    next: console.log,
    error: (err) => console.log("timed out:", err instanceof TimeoutError),
  });

// after 1s: "timed out: true"
```

## Why Use `timeout`?

1.  **Preventing Indefinite Waits:** Protects your application from hanging if a backend service or other asynchronous source becomes unresponsive.
2.  **Improving User Experience:** Provides timely feedback (an error message) to the user instead of leaving them staring at a loading spinner forever.
3.  **Resource Management:** Can help release resources tied up in waiting for a response that may never come.

## Real-World Example: Setting a Timeout for an API Request

A common scenario is fetching data from an external API. Sometimes, the network might be slow, or the API server itself might be experiencing issues. We want to limit how long we wait for a response before giving up.

### Code Snippet

**1. Mock Data Service (Simulates Slow/Fast Responses)**

```typescript
import { Injectable } from "@angular/core";
import { Observable, delay, of, tap } from "rxjs";

export interface ExternalData {
  id: string;
  value: number;
}

@Injectable({
  providedIn: "root",
})
export class SlowDataService {
  fetchData(id: string, responseTimeMs: number): Observable<ExternalData> {
    console.log(
      `Backend: Request received for ID ${id}. Will respond in ${responseTimeMs}ms.`,
    );
    const data: ExternalData = { id: id, value: Math.random() * 100 };

    // Simulate the delay
    return of(data).pipe(
      delay(responseTimeMs),
      tap(() => console.log(`Backend: Responding for ID ${id}.`)),
    );
  }
}
```

**2. Data Fetching Component (Applies `timeout`)**

```typescript
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from "@angular/core";
import { JsonPipe } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { SlowDataService, ExternalData } from "./slow-data.service"; // Adjust path
import {
  EMPTY,
  TimeoutError,
  catchError,
  finalize,
  tap,
  timeout,
} from "rxjs";

@Component({
  selector: "app-data-fetcher",
  imports: [JsonPipe],
  template: `
    <div>
      <h4>Data Fetcher with Timeout</h4>
      <button (click)="getData(500)" [disabled]="loading()">
        Fetch Fast Data (500ms)
      </button>
      <button (click)="getData(6000)" [disabled]="loading()">
        Fetch Slow Data (6000ms)
      </button>

      @if (loading()) {
        <p class="status loading">Loading data (Timeout set to 5s)...</p>
      }
      @if (errorMessage()) {
        <p class="status error">Error: {{ errorMessage() }}</p>
      }
      @if (fetchedData()) {
        <div class="data">
          <p>Data Received:</p>
          <pre>{{ fetchedData() | json }}</pre>
        </div>
      }
    </div>
  `,
  // No 'styles' section as per previous request
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataFetcherComponent {
  private dataService = inject(SlowDataService);
  private destroyRef = inject(DestroyRef);

  // --- State Signals ---
  loading = signal<boolean>(false);
  fetchedData = signal<ExternalData | null>(null);
  errorMessage = signal<string | null>(null);

  private readonly apiTimeoutMs = 5000; // Set timeout to 5 seconds

  getData(responseTimeMs: number): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.fetchedData.set(null);
    this.errorMessage.set(null);
    console.log(
      `UI: Initiating fetch. Response expected in ${responseTimeMs}ms. Timeout is ${this.apiTimeoutMs}ms.`,
    );

    this.dataService
      .fetchData("item123", responseTimeMs)
      .pipe(
        tap((data) =>
          console.log(
            "UI Stream: Data received (before timeout check completed)",
          ),
        ),

        // --- Apply the timeout ---
        timeout(this.apiTimeoutMs), // If no 'next' within 5000ms, throw TimeoutError
        // -----------------------

        catchError((err) => {
          console.error("UI Stream: Error caught.");
          // --- Check specifically for TimeoutError ---
          if (err instanceof TimeoutError) {
            console.error("Error Type: TimeoutError");
            this.errorMessage.set(
              `Operation timed out after ${this.apiTimeoutMs / 1000} seconds.`,
            );
          } else {
            console.error("Error Type: Other", err);
            this.errorMessage.set(
              `An unexpected error occurred: ${err.message || err}`,
            );
          }
          // Return EMPTY to allow finalize to run
          return EMPTY;
        }),
        finalize(() => {
          this.loading.set(false);
          console.log(
            "UI: Finalize block executed - Loading state set to false.",
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          console.log("UI: Subscribe next - updating data signal.");
          this.fetchedData.set(data);
        },
        // Error handled by catchError
        error: (err) => {
          /* Already handled */
        },
        complete: () => {
          console.log("UI: Subscribe complete.");
        },
      });
  }
}
```

**Explanation:**

1.  When `getData()` is called, `loading` is set to `true`.
2.  The `SlowDataService.fetchData` method is called, which returns an Observable that will emit data after the specified `responseTimeMs`.
3.  **`timeout(this.apiTimeoutMs)`**: This operator starts its internal timer (5000ms). It waits for the `fetchData` Observable to emit a `next` notification.
    - **Scenario 1 (Fetch Fast Data - 500ms):** The `fetchData` Observable emits data after 500ms. This is well within the 5000ms timeout. `timeout` sees the emission, cancels its internal timer, and passes the data along the stream. The data is displayed.
    - **Scenario 2 (Fetch Slow Data - 6000ms):** The `fetchData` Observable is set to respond after 6000ms. The `timeout` operator's timer reaches 5000ms _before_ `fetchData` emits anything. `timeout` stops waiting, throws a `TimeoutError`, and terminates the source subscription.
4.  **`catchError((err) => ...)`**: This catches any error, including the `TimeoutError`.
    - We use `instanceof TimeoutError` to specifically check if the error was due to the timeout.
    - We set an appropriate `errorMessage` based on the error type.
    - We return `EMPTY` to ensure the stream completes gracefully for `finalize`.
5.  **`finalize(() => { this.loading.set(false); })`**: This runs reliably after the stream terminates (either successfully after `next`, or after `catchError` handles the `TimeoutError` or any other error), ensuring the loading indicator is hidden.
6.  **`takeUntilDestroyed`**: Standard automatic unsubscription.
7.  The `subscribe` block updates the `fetchedData` signal only if the operation completed successfully within the timeout period.

By using `timeout`, you make your data fetching more robust against unresponsive services, leading to a better user experience.

## Common Mistakes

**Assuming the number form only bounds the first value.** `timeout(5000)` also errors if a long-lived stream goes quiet for 5s between emissions. For "first response within N, then anything goes", use `timeout({ first: N })`.

**Hand-rolling fallbacks with catchError.** When the desired behavior is "use cached data after N ms", the built-in `with` option is cleaner: `timeout({ first: 3000, with: () => of(cached) })`.

**Ordering timeout and retry wrong.** `timeout(...)` then `retry(...)` retries timed-out attempts; the reverse retries only source errors and lets a single slow attempt hang past your deadline.

## Interview Q&A

??? question "What exactly does timeout(5000) guarantee?"

    That no more than 5 seconds pass between subscription and the first value, or between consecutive values. Any violated gap produces a `TimeoutError` and terminates the stream. Completion before the deadline is fine and produces no error.

??? question "How do you time out into a fallback instead of an error?"

    Use the config object's `with` option: `timeout({ each: 2000, with: () => fallback$ })` unsubscribes from the slow source and switches to the fallback stream, no `TimeoutError` involved.

??? question "How would you combine timeout with retries for a flaky API?"

    `http.get(url).pipe(timeout(3000), retry({ count: 2, delay: 1000 }), catchError(...))`: each attempt gets 3 seconds, timed-out attempts are retried like any other error, and the final failure is mapped to UI state.

## Related

- [retry](../error-handling/retry.md) to re-attempt timed-out operations
- [catchError](../error-handling/catchError.md) for mapping `TimeoutError` to user-facing state
- [delay](delay.md), the opposite tool: adding time instead of bounding it
