---
description: "Share one subscription to a source Observable among all subscribers."
tags:
  - Multicasting
---

# share

Like `shareReplay`, the `share` operator is used to share a _single_ subscription to an underlying source Observable among multiple downstream subscribers. This prevents the source Observable's logic (e.g., setting up an interval, making a connection) from executing multiple times.

However, `share` behaves like it's using a plain `Subject` internally for multicasting. This means:

1.  **Shares a Single Subscription:** It subscribes to the source Observable only when the _first_ subscriber arrives.
2.  **Multicasts Live Values:** It pushes values from the source to all _currently active_ subscribers.
3.  **No Replay:** If a subscriber joins _after_ the source has already emitted some values, that new subscriber **will not** receive those past values. They will only get emissions that happen _after_ they subscribed.
4.  **Reference Counting & Resets:** `share()` tracks its subscribers and unsubscribes from the source when the count drops to zero (`resetOnRefCountZero: true`, the default). It also resets when the source **completes or errors** (`resetOnComplete: true`, `resetOnError: true`), so a subscriber arriving after completion re-executes the source instead of joining a finished one. If a new subscriber arrives later, it re-subscribes to the source, potentially restarting it.

!!! abstract "At a glance"

    - **Signature:** `share(config?)` with options like `connector`, `resetOnComplete`, `resetOnRefCountZero`
    - **Use when:** multicasting live streams where history is irrelevant: timers, WebSocket events, DOM streams
    - **Avoid when:** late subscribers need past values, especially cached HTTP results (use `shareReplay`)
    - **Top gotcha:** when the last subscriber leaves (or the source completes), `share` resets by default; the next subscriber restarts the source from scratch

## Analogy

Think of a **live conference call or radio talk show without any recording.**

- **The Show/Call (Source Observable):** The conversation happening in real-time.
- **The Broadcast System (`share`):** Connects to the live show _once_ when the first listener joins.
- **Listeners (Subscribers):** People joining the call/tuning in.
  - Everyone currently listening hears the _same thing at the same time_.
  - If you join late, you **missed the beginning**. You only hear the conversation from the moment you joined onwards. There's no way to hear what was said before you connected.
  - If everyone hangs up/tunes out, the broadcast system disconnects from the show. If someone calls in again later, it reconnects, and the show might start fresh (depending on the source).

## Why Use `share` (and when _not_ to)?

### Use Cases:

- Sharing Observables where past values are irrelevant or shouldn't be replayed (e.g., live event streams, certain WebSocket scenarios where only future messages matter).
- Sharing "hot" Observables or Observables with side effects that should only occur once while there are active listeners (e.g., setting up an interval-based check that runs only when needed).

### When NOT to Use

- **HTTP Requests (usually):** For typical `HttpClient` GET requests, you almost always want the result cached and replayed. Use `shareReplay({ bufferSize: 1, refCount: true })` instead. Using `share` would mean that if a second component subscribes slightly after the first, and the HTTP request has already completed, the second component might get _nothing_ (if the source completes quickly).
- **State Management:** You typically want the current state value replayed, making `BehaviorSubject` or `shareReplay({ bufferSize: 1, ... })` more suitable.

## Minimal Example

```typescript
import { interval, share, take } from "rxjs";

const shared = interval(1000).pipe(take(4), share());

shared.subscribe((v) => console.log(`A: ${v}`)); // first subscriber starts the source

setTimeout(() => {
  shared.subscribe((v) => console.log(`B: ${v}`)); // joins live: 0 and 1 are gone
}, 2500);

// A: 0
// A: 1
// A: 2   B: 2
// A: 3   B: 3
```

## Real-World Example: Shared Interval Timer for Periodic UI Updates

Imagine you want a timer that ticks every few seconds, and multiple components need to react to these ticks (e.g., to refresh some status indicator). You only want _one_ actual `interval` timer running in the background, shared among them. New components subscribing should just sync up with the _next_ tick, not get past ticks.

**Code Snippets:**

**1. Shared Timer Service (`timer.service.ts`)**

```typescript
import { Injectable } from "@angular/core";
import { Observable, interval, share, tap, map } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class SharedTimerService {
  // The shared timer observable
  readonly sharedTicks$: Observable<number>;

  constructor() {
    // Create ONE interval timer
    this.sharedTicks$ = interval(2000).pipe(
      // Emit every 2 seconds
      tap((tick) =>
        console.log(
          `%c --- Source Interval Emitted: ${tick} --- `,
          "background: #eee; color: #999",
        ),
      ),
      // --- Key Operator ---
      // Share this single interval subscription among all subscribers.
      // No replay for late subscribers.
      share(),
      // --------------------
      // Note: share() multicasts through an internal Subject and manages the
      // source subscription by reference counting. The behavior is configurable:
      // share({ connector, resetOnError, resetOnComplete, resetOnRefCountZero })
    );
  }
}
```

**2. Component Displaying Ticks**

```typescript
import { Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { SharedTimerService } from "./timer.service"; // Adjust path

@Component({
  selector: "app-tick-display-a",
  template: `
    <div class="display-box">
      <h4>Tick Display A</h4>
      <p>Started Subscribing Immediately</p>
      <p>Last Tick Received: {{ lastTick() }}</p>
    </div>
  `,
  styles: [
    ".display-box { border: 1px solid purple; padding: 10px; margin: 10px; }",
  ],
})
export class TickDisplayAComponent {
  private readonly timerService = inject(SharedTimerService);

  protected readonly lastTick = signal<number | string>("Waiting...");

  constructor() {
    console.log("TickDisplayA: Subscribing to sharedTicks$");
    this.timerService.sharedTicks$
      .pipe(takeUntilDestroyed())
      .subscribe((tickValue) => {
        console.log(`TickDisplayA: Received tick ${tickValue}`);
        this.lastTick.set(tickValue);
      });
  }
}
```

**3. Another Component Displaying Ticks - Subscribes Late**

```typescript
import { Component, inject, signal, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { SharedTimerService } from "./timer.service"; // Adjust path

@Component({
  selector: "app-tick-display-b",
  template: `
    <div class="display-box" style="border-color: teal;">
      <h4>Tick Display B</h4>
      <p>Started Subscribing After 5 Seconds</p>
      <p>Last Tick Received: {{ lastTick() }}</p>
    </div>
  `,
  styles: [
    ".display-box { border: 1px solid purple; padding: 10px; margin: 10px; }",
  ],
})
export class TickDisplayBComponent {
  private readonly timerService = inject(SharedTimerService);
  // the setTimeout callback is NOT an injection context,
  // so takeUntilDestroyed needs an explicit DestroyRef there
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lastTick = signal<number | string>("Waiting...");

  constructor() {
    // Simulate this component loading or deciding to subscribe later
    setTimeout(() => {
      console.log("TickDisplayB: Subscribing to sharedTicks$ (after delay)");
      this.timerService.sharedTicks$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((tickValue) => {
          // *** Key Point ***
          // This will likely NOT receive tick 0 or 1, because it subscribed late.
          // It will receive the next tick emitted by the *already running* interval.
          console.log(`TickDisplayB: Received tick ${tickValue}`);
          this.lastTick.set(tickValue);
        });
    }, 5000); // Subscribe after 5 seconds
  }
}
```

**4. App Component**

```typescript
import { Component } from "@angular/core";
import { TickDisplayAComponent } from "./tick-display-a.component"; // Adjust path
import { TickDisplayBComponent } from "./tick-display-b.component"; // Adjust path

@Component({
  selector: "app-root",
  imports: [TickDisplayAComponent, TickDisplayBComponent], // Import components
  template: `
    <h1>RxJS share Demo</h1>
    <app-tick-display-a></app-tick-display-a>
    <app-tick-display-b></app-tick-display-b>
  `,
})
export class AppComponent {}
```

**Explanation:**

1.  `SharedTimerService` creates an `interval(2000)` Observable and applies `share()` to it, storing the result in `sharedTicks$`.
2.  `TickDisplayAComponent` subscribes immediately in its constructor. This is the first subscription. `share` subscribes to the source `interval`, which starts emitting 0, 1, 2... every 2 seconds. Component A receives all these ticks.
3.  `TickDisplayBComponent` waits 5 seconds before subscribing.
4.  When Component B subscribes, the source `interval` (shared via `share`) is already running and might have already emitted ticks 0 and 1.
5.  Component B **will not** receive ticks 0 and 1. Its subscription will start receiving ticks from the _next_ emission of the shared interval (likely tick 2 or 3, depending on timing).
6.  Both components receive subsequent ticks (3, 4, 5...) simultaneously as they are emitted by the single, shared interval.
7.  If both components are destroyed, their subscriptions (managed by `takeUntilDestroyed`) end. `share` sees the subscriber count is zero and unsubscribes from the source `interval`, stopping it.

This demonstrates how `share` provides a way to execute a source Observable once and multicast its _live_ values, without the buffering and replay behaviour of `shareReplay`.

## Common Mistakes

**Using `share()` to cache HTTP requests.** An HTTP source completes after one emission, and `share` resets on completion by default. A component subscribing after completion triggers a brand-new request, and one subscribing between requests may see nothing. Caching is [`shareReplay`](shareReplay.md)'s job.

**Expecting late subscribers to catch up.** `share` has no buffer. If a subscriber must always receive the latest value on arrival, use `shareReplay({ bufferSize: 1, refCount: true })` or a `BehaviorSubject`.

**Not knowing the reset options.** `share({ resetOnRefCountZero: false })` keeps the source alive after the last unsubscribe, and `resetOnComplete`/`resetOnError` control restart-after-terminal behavior. Interviewers often probe whether you know `share` is configurable.

## Interview Q&A

??? question "What is the difference between share and shareReplay?"

    Both multicast one source subscription to many subscribers. `share` delivers only live values; `shareReplay` also buffers the last N values and hands them to late subscribers. `share` resets by default when subscribers drop to zero or the source terminates; `shareReplay`'s lifecycle depends on its `refCount` option.

??? question "What happens when the subscriber count of share() drops to zero?"

    By default the operator unsubscribes from the source and resets its internal Subject. The next subscriber causes a fresh subscription, restarting the source (a new interval starts at 0, a new HTTP request fires). `resetOnRefCountZero: false` opts out of this.

??? question "Why is a fromEvent stream usually not wrapped in share?"

    `fromEvent` is already hot: the DOM event source exists independently, and each subscription just adds a listener. `share` matters for cold sources with expensive setup (intervals, sockets, HTTP) where you want exactly one execution.

## Related

- [shareReplay](shareReplay.md) for multicasting plus caching
- [Subject](subject.md), the primitive share multicasts through
- [Hot Observables](../learn/hot-observables.md) for the underlying hot/cold model
