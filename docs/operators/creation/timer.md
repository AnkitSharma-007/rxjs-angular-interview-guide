---
description: "Emit after a delay, then optionally keep emitting at a fixed interval."
tags:
  - Operators
  - Creation
---

# timer

`timer()` is an RxJS **creation operator** that creates an Observable which emits values after a specified delay, and can optionally continue emitting values at regular intervals thereafter.

It behaves differently based on the arguments you provide:

1.  **`timer(dueTime)`:**
    - Waits for the specified `dueTime` (in milliseconds, or a `Date`).
    - Emits a single value: `0`.
    - Immediately **completes**.

2.  **`timer(initialDelay, period)`:**
    - Waits for the specified `initialDelay` (in milliseconds).
    - Emits the first value: `0`.
    - Then, waits for `period` milliseconds.
    - Emits the next value: `1`.
    - Continues emitting sequential numbers (`2`, `3`, ...) every `period` milliseconds.
    - This form **never completes** on its own (just like `interval`).

!!! abstract "At a glance"

    - **Signature:** `timer(dueTime)` for one delayed emission, `timer(initialDelay, period)` for recurring emissions
    - **Use when:** delayed one-shot actions, or polling with a custom start delay (including `timer(0, n)` for start-now polling)
    - **Avoid when:** a plain fixed cadence is all you need and `interval` reads clearer
    - **Top gotcha:** the single-argument form completes after one value; the two-argument form never completes and needs teardown

## Key Characteristics

- **Asynchronous:** Emissions happen after specified delays.
- **Completion:**
  - Completes after one emission (`0`) if only `dueTime` is provided.
  - Never completes if `period` is also provided.
- **Initial Delay:** The second form allows a specific delay before the _first_ emission, which is different from `interval` (where the first emission occurs after the _first period_).
- **Cold Observable:** Each subscription starts its own independent timer.

## Difference from `interval()`

- `interval(1000)`: Waits 1000ms, emits `0`, waits 1000ms, emits `1`, ...
- `timer(1000)`: Waits 1000ms, emits `0`, completes.
- `timer(0, 1000)`: Waits 0ms (emits `0` immediately), waits 1000ms, emits `1`, waits 1000ms, emits `2`, ... (Starts immediately, then intervals).
- `timer(5000, 1000)`: Waits 5000ms, emits `0`, waits 1000ms, emits `1`, waits 1000ms, emits `2`, ... (Initial delay before starting intervals).

## Minimal Example

```typescript
import { timer } from "rxjs";

timer(2000).subscribe({
  next: console.log,
  complete: () => console.log("complete"),
});
// after 2s: 0, complete

timer(0, 1000).subscribe(console.log);
// immediately: 0, then 1, 2, 3... every second (never completes)
```

## Real-World Example Scenarios

1.  **`timer(dueTime)` Scenario: Delayed Action / Welcome Message**
    - Imagine you want to show a "Need help?" tooltip or a welcome message in your Angular app, but only _after_ the user has been on the page for, say, 3 seconds, giving them time to look around first. You only want this message to appear once.

2.  **`timer(initialDelay, period)` Scenario: Delayed Polling**
    - Similar to the `interval` polling example, but maybe you don't want to start checking the server status _immediately_ on component load. Perhaps you want to wait 5 seconds for initial setup/rendering to finish, and _then_ start checking every 10 seconds.

**Code Snippet 1 (Using `timer(dueTime)` - Delayed Message):**

```typescript
import { Component, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { timer } from "rxjs";

@Component({
  selector: "app-delayed-message",
  template: `
    <h4>Welcome!</h4>
    @if (showHelpMessage()) {
      <div class="tooltip-message">
        Looks like you've been here a few seconds. Need any help?
      </div>
    }
  `,
})
export class DelayedMessageComponent {
  protected readonly showHelpMessage = signal(false);

  constructor() {
    // emits 0 once after 3s, then completes;
    // takeUntilDestroyed covers early navigation away
    timer(3000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.showHelpMessage.set(true));
  }
}
```

**Code Snippet 2 (Using `timer(initialDelay, period)` - Delayed Polling):**

Let's adapt the polling example to wait 5 seconds initially, then poll every 10 seconds.

```typescript
import { Component, inject, signal } from "@angular/core";
import { DatePipe, JsonPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EMPTY, catchError, switchMap, timer } from "rxjs";

@Component({
  selector: "app-delayed-poller",
  imports: [DatePipe, JsonPipe],
  template: `
    <h4>Delayed Server Status Check</h4>
    <p>Waiting 5s initially, then checking every 10s...</p>
    @if (status(); as current) {
      <div>
        <strong>Last Status:</strong> {{ current | json }}
        <br />
        <em>Last Checked: {{ lastChecked() | date: "mediumTime" }}</em>
      </div>
    }
    @if (errorMessage()) {
      <div><strong>Error:</strong> {{ errorMessage() }}</div>
    }
  `,
})
export class DelayedPollerComponent {
  private readonly http = inject(HttpClient);
  private readonly INITIAL_DELAY_MS = 5000; // 5 seconds
  private readonly POLLING_PERIOD_MS = 10000; // 10 seconds

  protected readonly status = signal<unknown | null>(null);
  protected readonly lastChecked = signal<Date | null>(null);
  protected readonly errorMessage = signal("");

  constructor() {
    // waits 5s, emits 0, then emits 1, 2,... every 10s
    timer(this.INITIAL_DELAY_MS, this.POLLING_PERIOD_MS)
      .pipe(
        switchMap(() =>
          this.http.get<unknown>("/api/server/status").pipe(
            catchError((error) => {
              this.errorMessage.set(
                `Failed to fetch status (${error.statusText || "Unknown Error"})`,
              );
              this.status.set(null);
              return EMPTY; // skip this cycle, keep polling
            }),
          ),
        ),
        takeUntilDestroyed(), // required: this timer variant never completes
      )
      .subscribe((statusData) => {
        this.status.set(statusData);
        this.lastChecked.set(new Date());
        this.errorMessage.set("");
      });
  }
}
```

**Explanation:**

- **Example 1:** `timer(3000)` waits 3 seconds, emits `0`, completes. Useful for one-off delayed actions.
- **Example 2:** `timer(5000, 10000)` waits 5 seconds, emits `0`, then continues emitting `1, 2, ...` at 10-second intervals. Because this variant never completes, `takeUntilDestroyed()` ties the polling loop to the component's lifetime.

## Common Mistakes

**Forgetting which form completes.** `timer(n)` is one-shot and self-completing; `timer(n, p)` is infinite. Mixing them up either kills a polling loop after one round or leaks a timer forever.

**Reimplementing `timer(0, n)` with extra operators.** `interval(n).pipe(startWith(-1))` and friends work, but `timer(0, n)` says "start now, repeat every n" in one call.

**Using `timer` for per-emission delays.** Shifting an existing stream's values is [`delay`](../utility/delay.md)'s job; `timer` creates a new source.

## Interview Q&A

??? question "What are the differences between timer and interval?"

    `interval(n)` always waits one period before the first value and repeats forever. `timer` decouples the first emission from the cadence: `timer(0, n)` starts immediately, `timer(d)` fires once after `d` and completes. Everything `interval` does, `timer` can express.

??? question "How would you implement a one-time delayed action that is safe if the component dies first?"

    `timer(delay).pipe(takeUntilDestroyed()).subscribe(...)`. The timer self-completes after firing, and the interop operator guards the window before it fires, both paths end the subscription cleanly.

??? question "Can timer take a Date?"

    Yes: `timer(new Date(targetTime))` emits when the wall clock reaches the date, useful for scheduled UI events like session-expiry warnings.

## Related

- [interval](interval.md) for plain fixed-cadence ticking
- [delay](../utility/delay.md) to shift an existing stream instead of creating one
- [debounceTime](../filtering/debounceTime.md), which uses the same timer concept reactively

## Summary

`timer()` provides more flexibility than `interval()` for controlling _when_ emissions start, offering both a one-shot delay (`timer(dueTime)`) and a recurring emission with an initial offset (`timer(initialDelay, period)`). Remember to unsubscribe from the recurring variant!
