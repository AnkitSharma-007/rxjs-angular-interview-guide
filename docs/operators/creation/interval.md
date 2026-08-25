---
description: "Emit sequential numbers on a fixed timer."
tags:
  - Operators
  - Creation
---

# interval

`interval()` is an RxJS **creation operator** that generates an Observable which emits sequential numbers (0, 1, 2, 3, and so on) at a specified, regular time interval (in milliseconds).

Think of it as setting up a metronome that ticks indefinitely, emitting the tick count each time.

!!! abstract "At a glance"

    - **Signature:** `interval(period)`
    - **Use when:** you need a periodic trigger: polling, tickers, heartbeats
    - **Avoid when:** the first emission must fire immediately or after a different delay; that is `timer(delay, period)`
    - **Top gotcha:** it never completes and is cold: every subscriber starts its own infinite timer, so teardown is mandatory

## Key Characteristics

- **Sequential Numbers:** Emits `0`, then `1`, then `2`, ...
- **Timed Emissions:** You specify the delay between emissions (e.g., `interval(1000)` emits every 1 second).
- **Asynchronous:** The emissions happen asynchronously based on the timer you set.
- **Never Completes:** This is important! By default, `interval()` _never_ stops emitting on its own. It will run forever unless you explicitly unsubscribe or use another operator (like `take`) to limit it.
- **Cold Observable:** Each subscription starts its own independent timer. If two parts of your code subscribe to `interval(1000)`, they will each get their own sequence starting from 0.

## Minimal Example

```typescript
import { interval, take } from "rxjs";

interval(500).pipe(take(3)).subscribe(console.log);

// after 500ms:  0   (note: the FIRST value waits one full period)
// after 1000ms: 1
// after 1500ms: 2, then take(3) completes the stream
```

## Real-World Example Scenario

A very common use case in web applications, including Angular, is **polling**. Imagine you need to check a server endpoint repeatedly to see if there's new data available, like:

- Checking for new chat messages every 5 seconds.
- Updating a dashboard with fresh statistics every 30 seconds.
- Checking the status of a long-running background job every 10 seconds.

`interval()` provides the timed trigger for making these checks.

## Code Snippet (Angular Component - Polling Example)

Let's create a component that checks for hypothetical server status updates every 5 seconds (5000 milliseconds). We'll use `interval()` to trigger the check and `HttpClient` to make the request. We _must_ remember to clean up the interval when the component is destroyed.

```typescript
import { Component, inject, signal } from "@angular/core";
import { DatePipe, JsonPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EMPTY, catchError, interval, startWith, switchMap } from "rxjs";

@Component({
  selector: "app-status-poller",
  imports: [DatePipe, JsonPipe],
  template: `
    <h4>Server Status Check</h4>
    <p>Checking every 5 seconds...</p>
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
export class StatusPollerComponent {
  private readonly http = inject(HttpClient);
  private readonly POLLING_INTERVAL_MS = 5000; // 5 seconds

  protected readonly status = signal<unknown | null>(null);
  protected readonly lastChecked = signal<Date | null>(null);
  protected readonly errorMessage = signal("");

  constructor() {
    interval(this.POLLING_INTERVAL_MS)
      .pipe(
        startWith(0), // poll immediately instead of waiting 5s for the first tick
        switchMap(() =>
          this.http.get<unknown>("/api/server/status").pipe(
            // handle per request so one failure doesn't stop the polling loop
            catchError((error) => {
              this.errorMessage.set(
                `Failed to fetch status (${error.statusText || "Unknown Error"})`,
              );
              this.status.set(null);
              return EMPTY; // skip this tick's update, keep polling
            }),
          ),
        ),
        takeUntilDestroyed(), // stops the infinite interval with the component
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

1.  **`interval(5000)`**: Creates the basic timer emitting `0, 1, 2,...` every 5 seconds.
2.  **`startWith(0)`**: We usually want to check _immediately_ when the component loads, not wait for the first interval. (`timer(0, 5000)` is the equivalent single-operator alternative.)
3.  **`switchMap(...)`**: When the interval emits, `switchMap` subscribes to the `http.get()` call. If the interval fires again before the request finishes, the stale request is cancelled and a new one starts.
4.  **`catchError(...)`**: Inside `switchMap`, API errors are converted to `EMPTY`, skipping that tick's update without killing the polling loop.
5.  **`takeUntilDestroyed()`**: The critical cleanup. `interval` never completes on its own; tying the subscription to the component's destruction stops the timer and the network traffic.

## Common Mistakes

**No teardown.** An un-completed, un-unsubscribed `interval` keeps ticking (and polling) after the component is gone. Always pair it with `takeUntilDestroyed`, `takeUntil`, or `take`.

**Expecting an immediate first tick.** The first value arrives after one full period. Use `timer(0, period)` or add `startWith` when "now, then every N" is the requirement.

**Assuming subscribers share one timer.** `interval` is cold: two subscribers get two independent sequences both starting at 0. For one shared ticker, pipe it through [`share`](../../subjects/share.md).

## Interview Q&A

??? question "What is the difference between interval and timer?"

    `interval(1000)` emits after 1s, then every 1s. `timer(0, 1000)` lets you control the initial delay separately (here: immediately, then every 1s), and `timer(5000)` alone emits once after 5s and completes. `timer` is the more flexible superset.

??? question "Does interval ever complete?"

    Never on its own. Completion must be imposed from outside: `take(n)`, `takeUntil(stop$)`, `takeUntilDestroyed()`, or manual unsubscription. Unbounded intervals are one of the most common sources of Angular memory leaks.

??? question "How would you build a polling loop that starts immediately?"

    `timer(0, periodMs).pipe(switchMap(() => this.http.get(...)))` with per-request `catchError` and lifecycle-bound teardown, exactly the pattern in the example above (with `startWith` playing the role of the zero delay).

## Related

- [timer](timer.md) for custom initial delays or one-shot emissions
- [switchMap](../transformation/switchMap.md), the polling companion
- [takeUntil](../filtering/takeUntil.md) for signal-based teardown

## Summary

`interval()` is a fundamental tool for creating streams based on timed intervals, frequently used for polling or triggering periodic actions, but always requiring careful handling of unsubscription to avoid issues.
