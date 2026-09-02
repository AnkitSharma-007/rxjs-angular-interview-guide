---
description: "Shift emissions forward in time."
tags:
  - Operators
  - Utility
---

# delay

The `delay` operator **shifts the emission** of each `next` value from its source Observable forward in time by a specified duration.

Think of it like **scheduled mail delivery:**

- The source Observable "drops a letter in the mailbox" (`next` emission occurs).
- The `delay` operator picks it up but holds onto it.
- It waits for the specified time (e.g., 500 milliseconds).
- _Then_, it delivers the letter (emits the `next` value) downstream.

Completion follows the last delayed value. **Errors are the exception: an `error` notification is NOT delayed**; it tears through immediately, skipping any values still waiting in the delay buffer.

## Key Points

1.  **Delays Emissions:** It delays _when_ the values are sent to the next operator or subscriber.
2.  **Doesn't Delay Subscription:** The subscription to the source happens immediately; only the emissions are postponed.
3.  **Errors Are Not Delayed:** `next` and `complete` are shifted; an `error` fires downstream immediately and discards pending delayed values.
4.  **Input:** Takes a duration in milliseconds (e.g., `delay(500)`) or a specific future `Date`.

!!! abstract "At a glance"

    - **Signature:** `delay(ms)` or `delay(date)`
    - **Use when:** enforcing a minimum display time, simulating latency in demos and tests
    - **Avoid when:** you want to rate-limit or coalesce emissions (`debounceTime`/`throttleTime`) or delay per-value by a dynamic amount (`delayWhen`)
    - **Top gotcha:** errors skip the delay entirely, so "minimum display time" logic built on `delay` alone does not apply to failure paths

## Minimal Example

```typescript
import { delay, of } from "rxjs";

console.log("subscribing");
of("hello").pipe(delay(1000)).subscribe(console.log);

// subscribing
// (1 second later) hello
```

## Why Use `delay`?

1.  **UI Polish:** Simulate a minimum processing time. For example, if saving data is extremely fast, a "Saving..." message might just flash on and off. Using `delay` can ensure the message stays visible for at least, say, half a second, providing better user feedback.
2.  **Testing/Debugging:** Introduce artificial latency into streams to test how your application handles timing issues or loading states.
3.  **Simple Sequencing (Less Common):** Ensure a small pause before an action occurs after an event (though more complex sequencing often uses other operators).

## Real-World Example: Minimum Display Time for a "Saved" Message

Imagine clicking a "Save" button. The backend operation might be incredibly fast (e.g., 50ms). If you immediately show and then hide a "Saved!" confirmation, the user might not even register it. Let's ensure the "Saved!" message stays visible for at least 750ms.

## Code Snippet

```typescript
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  EMPTY,
  Observable,
  catchError,
  delay,
  finalize,
  of,
  switchMap,
  tap,
  timer,
} from "rxjs";

// Mock Service Function (simulates a quick backend save)
function mockSaveOperation(): Observable<{
  success: boolean;
  timestamp: number;
}> {
  console.log("Backend: Starting simulated save...");
  const saveSuccess = Math.random() > 0.2; // Simulate occasional failure
  return of(saveSuccess).pipe(
    delay(100), // Simulate VERY FAST network/backend time (100ms)
    tap((success) =>
      console.log(
        `Backend: Simulated save ${success ? "successful" : "failed"}.`,
      ),
    ),
    switchMap((success) => {
      if (success) {
        return of({ success: true, timestamp: Date.now() });
      } else {
        // Simulate an error being returned from backend
        return timer(50).pipe(
          switchMap(() => {
            throw new Error("Save failed due to backend validation.");
          }),
        );
      }
    }),
  );
}

@Component({
  selector: "app-save-status",
  template: `
    <div>
      <h4>Save Example with Delay</h4>
      <button (click)="saveData()" [disabled]="saving()">Save Data</button>

      @if (saving()) {
        <p class="status saving">Saving...</p>
      } @else if (statusMessage()) {
        <p
          class="status"
          [class.success]="isSuccess()"
          [class.error]="!isSuccess()"
        >
          {{ statusMessage() }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveStatusComponent {
  private destroyRef = inject(DestroyRef);

  // --- State Signals ---
  saving = signal<boolean>(false);
  statusMessage = signal<string | null>(null);
  isSuccess = signal<boolean>(false);

  saveData(): void {
    if (this.saving()) return; // Prevent multiple saves

    this.saving.set(true);
    this.statusMessage.set(null); // Clear previous status
    console.log('UI: Save initiated, showing "Saving..."');

    const minimumDisplayTime = 750; // Ensure feedback shows for at least 750ms

    mockSaveOperation()
      .pipe(
        tap({
          next: (result) =>
            console.log("UI Stream: Save operation successful (before delay)"),
          error: (err) =>
            console.error("UI Stream: Save operation failed (before delay)"),
        }),

        // --- Apply the delay ---
        // Holds each NEXT value for minimumDisplayTime.
        // NOTE: errors are NOT held; they skip the delay entirely.
        delay(minimumDisplayTime),
        // ---------------------

        catchError((err: Error) => {
          // Handle the error immediately (errors skip the delay)
          console.error("UI: Handling error immediately:", err.message);
          this.isSuccess.set(false);
          this.statusMessage.set(`Error: ${err.message}`);
          // Return EMPTY to gracefully complete the stream for finalize
          return EMPTY;
        }),
        // finalize runs after next/complete pass through the delay;
        // on the error path it runs immediately, since errors are not delayed
        finalize(() => {
          console.log('UI: Finalizing save operation (hiding "Saving...")');
          this.saving.set(false);
        }),
        // Automatically unsubscribe when the component is destroyed
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          // Handle success AFTER the delay
          console.log(`UI: Displaying success message after delay.`);
          this.isSuccess.set(true);
          this.statusMessage.set(
            `Saved successfully at ${new Date(
              result.timestamp,
            ).toLocaleTimeString()}`,
          );
        },
        // Error is handled in catchError
        // Complete isn't strictly needed here as finalize covers the loading state change
      });
  }
}
```

**Explanation:**

1.  When `saveData()` is called, `saving` is set to `true`, showing the "Saving..." message immediately.
2.  `mockSaveOperation()` is called. It simulates a quick backend response (completes in ~100ms) using `of(...)` and `delay(100)`.
3.  The result (or error) from `mockSaveOperation` flows into the component's RxJS pipe.
4.  The first `tap` logs the immediate result from the "backend".
5.  **`delay(minimumDisplayTime)`**: This is the key part. If the backend responded successfully (`next`), `delay` holds that success notification for 750ms before passing it on. **If the backend errored, the error is NOT held**: it reaches `catchError` immediately.
6.  **After the delay (success) or immediately (error):**
    - If successful: The `next` notification proceeds to the `subscribe` block's `next` handler after 750ms. The success message is displayed.
    - If an error occurred: The `error` notification skips the delay and proceeds straight to `catchError`. The error message is displayed right away. (To give errors a minimum display time as well, delay the recovery instead: `catchError(err => of(err).pipe(delay(minimumDisplayTime), ...)`.)
7.  **`finalize`**: This runs _after_ the delayed `next` or the immediate `error` has been processed (or if the stream unsubscribes). It sets `saving` to `false`, hiding the "Saving..." message.
8.  **`takeUntilDestroyed`**: Standard cleanup.

Because of `delay(750)`, even though the backend might respond in 100ms, the success path won't update the UI until _at least_ 750ms have passed, giving the user time to perceive the feedback.

## Common Mistakes

**Assuming errors are delayed.** They are not: `delay` forwards errors immediately and drops any values still waiting. Any "minimum time" or sequencing logic must handle the error path separately.

**Using `delay` to space out emissions.** `delay(1000)` shifts every value by the same offset; the gaps between values stay identical. Spacing values apart is `concatMap((v) => of(v).pipe(delay(1000)))` territory.

**Reaching for `delay` when the trigger should wait, not the values.** To postpone the whole subscription, use `timer(ms).pipe(switchMap(() => source$))`; `delay` subscribes to the source immediately.

## Interview Q&A

??? question "Does delay postpone the subscription or the emissions?"

    The emissions. The source is subscribed (and starts its work, like an HTTP call) immediately; each `next` value is then held for the configured duration on its way downstream.

??? question "Which notifications does delay affect?"

    `next` values are delayed and `complete` waits for the last delayed value. `error` is passed through immediately and cancels pending delayed values, a detail that distinguishes strong candidates.

??? question "How do you delay each value relative to the previous one instead of by a fixed offset?"

    Wrap the per-value delay inside a sequential higher-order operator: `concatMap((v) => of(v).pipe(delay(gap)))` emits values `gap` apart, whereas plain `delay(gap)` shifts the entire original timing by one constant.

## Related

- [timer](../creation/timer.md) to create delayed sources instead of shifting existing ones
- [debounceTime](../filtering/debounceTime.md) for delay-based coalescing of bursts
- [concatMap](../transformation/concatMap.md) for per-value sequential delays
