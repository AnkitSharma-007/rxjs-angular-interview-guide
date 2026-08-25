---
description: "A Subject that replays recent history to late subscribers."
tags:
  - Subjects
---

# ReplaySubject

Think of a `ReplaySubject` as a `Subject` that **records** a history of the values that have passed through it. When a new Observer subscribes, the `ReplaySubject` immediately sends ("replays") a specified number of the most recent values from its recording to that new subscriber.

!!! abstract "At a glance"

    - **Signature:** `new ReplaySubject<T>(bufferSize?, windowTime?)`
    - **Use when:** late subscribers need recent history: activity feeds, notifications, catch-up context
    - **Avoid when:** only the single current state matters (use `BehaviorSubject`) or history can grow unbounded
    - **Top gotcha:** the default `bufferSize` is `Infinity`; a bare `new ReplaySubject()` retains every value ever emitted

## Key Features

1.  **Records Values:** It keeps a buffer of the last `n` values that were emitted via `next()`.
2.  **Replays on Subscription:** New subscribers immediately receive the buffered values (up to the specified buffer size) in the order they were originally emitted.
3.  **Configurable Buffer:** You specify the buffer size when creating it (e.g., `new ReplaySubject<string>(3)` will store and replay the last 3 values).
4.  **Optional Time Window:** You can also specify a `windowTime` (in milliseconds) along with the buffer size. This makes it replay values that were emitted within that time window _and_ are within the buffer size limit.
5.  **No Initial Value Required:** Unlike `BehaviorSubject`, it doesn't need a starting value.
6.  **Multicasting:** Like all Subjects, it pushes new values (`next()`) to all _current_ subscribers simultaneously after the initial replay.

### Analogy

Imagine a **meeting recorder or a chat log:**

- When someone speaks (`next()` is called), the recorder captures it.
- It keeps a log of the recent conversation (the **buffer**).
- If someone joins the meeting late (**subscribes**), they can quickly catch up by listening to the recording of the last few minutes/points (**the replay**). They get the context they missed.
- After catching up, they hear the live conversation (`next()` emissions) along with everyone else.

## Why Use a `ReplaySubject`?

1.  **Caching Recent Events:** When you need to ensure that consumers who subscribe later still get access to the most recent few events or data points, not just the single latest one (like `BehaviorSubject`) or none (like `Subject`).
2.  **Late Subscribers Needing Context:** Useful in scenarios like:
    - A log of recent user actions.
    - A stream of notifications where seeing the last few is important.
    - Data streams where events happen quickly, and a subscriber might miss some if they aren't connected constantly.

## Minimal Example

```typescript
import { ReplaySubject } from "rxjs";

const recent = new ReplaySubject<number>(2); // keep the last 2 values

recent.next(1);
recent.next(2);
recent.next(3); // 1 falls out of the buffer

recent.subscribe((v) => console.log(`A: ${v}`));
// A: 2   <- replayed
// A: 3   <- replayed

recent.next(4); // A: 4 (live emission)
```

## Real-World Example: Recent Activity Log Service

Let's create a service that logs recent significant actions within the application (e.g., "Item Added", "Settings Saved"). We want components that display this log to show the last 5 actions, even if the component loads after those actions have occurred.

## Code Snippets

**1. Activity Log Service (`activity-log.service.ts`)**

```typescript
import { Injectable } from "@angular/core";
import { ReplaySubject, Observable } from "rxjs";

export interface LogEntry {
  message: string;
  timestamp: Date;
}

@Injectable({
  providedIn: "root",
})
export class ActivityLogService {
  // 1. Define the buffer size: Store the last 5 log entries.
  // Public so consumers can display the window size.
  readonly logBufferSize = 5;

  // 2. Create the ReplaySubject with the specified buffer size.
  // Private to control who can add logs.
  private logSubject = new ReplaySubject<LogEntry>(this.logBufferSize);

  // 3. Expose the log entries as an Observable.
  logEntries$: Observable<LogEntry> = this.logSubject.asObservable();

  // Method for other parts of the app to add log entries
  addLog(message: string): void {
    const newEntry: LogEntry = {
      message: message,
      timestamp: new Date(),
    };
    console.log(`ActivityLogService: Adding log - "${message}"`);
    // 4. Push the new log entry into the ReplaySubject.
    // It gets stored in the buffer and sent to current subscribers.
    this.logSubject.next(newEntry);
  }
}
```

**2. Action Simulator Component - Adds Logs**

```typescript
import { Component, inject } from "@angular/core";
import { ActivityLogService } from "./activity-log.service"; // Adjust path

@Component({
  selector: "app-action-simulator",
  template: `
    <div>
      <h4>Simulate Actions</h4>
      <button (click)="simulateAdd()">Add Item</button>
      <button (click)="simulateSave()">Save Settings</button>
      <button (click)="simulateDelete()">Delete User</button>
    </div>
  `,
  styles: [
    "div { margin-bottom: 15px; padding: 10px; border: 1px dashed green; }",
  ],
})
export class ActionSimulatorComponent {
  private logService = inject(ActivityLogService);
  private itemCounter = 0;

  simulateAdd(): void {
    this.itemCounter++;
    this.logService.addLog(`Item #${this.itemCounter} added to cart.`);
  }

  simulateSave(): void {
    this.logService.addLog("User preferences saved successfully.");
  }

  simulateDelete(): void {
    this.logService.addLog("User account marked for deletion.");
  }
}
```

**3. Activity Log Display Component - Shows Logs**

```typescript
import {
  Component,
  inject,
  signal,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivityLogService, LogEntry } from "./activity-log.service"; // Adjust path

@Component({
  selector: "app-activity-display",
  imports: [DatePipe],
  template: `
    <div class="log-display">
      <h4>Recent Activity Log (Last {{ bufferSize }})</h4>
      @if (logMessages().length > 0) {
        <ul>
          @for (entry of logMessages(); track entry.timestamp) {
            <li>
              [{{ entry.timestamp | date: "mediumTime" }}] {{ entry.message }}
            </li>
          }
        </ul>
      } @else {
        <p>No activity logged yet.</p>
      }
    </div>
  `,
  styles: [
    `
      .log-display {
        border: 1px solid orange;
        padding: 10px;
        margin-top: 10px;
        min-height: 150px;
      }
      ul {
        list-style: none;
        padding-left: 0;
      }
      li {
        margin-bottom: 5px;
        font-size: 0.9em;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityDisplayComponent implements OnInit {
  private logService = inject(ActivityLogService);
  private destroyRef = inject(DestroyRef);

  // Expose buffer size to template (public readonly field on the service)
  bufferSize = this.logService.logBufferSize;

  // Use a signal to hold the logs for the template
  logMessages = signal<LogEntry[]>([]);

  ngOnInit(): void {
    // Subscribe to the log entries from the service
    this.logService.logEntries$
      .pipe(
        // Automatically unsubscribe when the component is destroyed
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((entry) => {
        // *** Key Point ***
        // When this component subscribes, it might immediately receive
        // up to 'logBufferSize' (5) entries if they were already added
        // to the ReplaySubject BEFORE this component loaded/subscribed.
        console.log(
          `ActivityDisplayComponent received log: "${entry.message}"`,
        );

        // Update the signal. Add new entry to the end.
        // ReplaySubject emits buffered items one by one, then live ones.
        // We just append each one as it arrives.
        this.logMessages.update((currentLogs) => [...currentLogs, entry]);

        // Optional: Trim the array in the component if you strictly want only 'bufferSize' items VISIBLE
        // This might be needed if the ReplaySubject's buffer gets cleared/changed,
        // though usually you'd just display what the ReplaySubject sends.
        // this.logMessages.update(currentLogs => currentLogs.slice(-this.bufferSize));
      });
  }
}
```

**4. App Component**

```typescript
import { Component, inject } from "@angular/core";
import { ActionSimulatorComponent } from "./action-simulator.component"; // Adjust path
import { ActivityDisplayComponent } from "./activity-display.component"; // Adjust path
import { ActivityLogService } from "./activity-log.service"; // Adjust path

@Component({
  selector: "app-root",
  imports: [ActionSimulatorComponent, ActivityDisplayComponent], // Import components
  template: `
    <h1>RxJS ReplaySubject Demo</h1>
    <button (click)="addLogDirectly()">Add Log (Directly)</button>
    <hr />
    <app-action-simulator></app-action-simulator>
    <hr />
    <app-activity-display></app-activity-display>
    <!-- Add another display later to show replay -->
    <!-- <app-activity-display></app-activity-display> -->
  `,
})
export class AppComponent {
  // Inject service just to add an initial log for testing replay
  private logService = inject(ActivityLogService);

  constructor() {
    // Add a log entry *before* any components might fully initialize
    this.logService.addLog("Application session started.");
  }

  addLogDirectly(): void {
    this.logService.addLog("Direct Log Button Clicked.");
  }
}
```

**Explanation:**

1.  `ActivityLogService` creates a `ReplaySubject` configured to buffer the last 5 (`logBufferSize`) `LogEntry` objects.
2.  When `addLog` is called (by `ActionSimulatorComponent` or directly), the new `LogEntry` is pushed into the `logSubject`. It's stored in the buffer (replacing the oldest if the buffer is full) and sent to any _currently subscribed_ components.
3.  When `ActivityDisplayComponent` initializes (`ngOnInit`), it subscribes to `logService.logEntries$`.
4.  **Crucially:** The `ReplaySubject` immediately replays its buffered messages (up to 5 of the most recent ones, including the "Application session started." log added in the `AppComponent` constructor) to the new subscription in `ActivityDisplayComponent`. The component doesn't start with an empty list; it gets the recent history right away.
5.  As new logs are added via `addLog`, they are pushed live to the `ActivityDisplayComponent`'s subscription and added to its display.

If you were to add a second instance of `ActivityDisplayComponent` to the `AppComponent` template later (e.g., after a few logs have already been added), that second instance would _also_ immediately receive the same buffered history upon subscribing, demonstrating the replay functionality for late subscribers.

## Common Mistakes

**Forgetting the buffer is infinite by default.** `new ReplaySubject()` keeps every value forever. Always pass an explicit `bufferSize` (usually `1` or a small number) unless you truly want full history.

**Relying on `windowTime` alone for memory safety.** The time window only evicts values when emissions or subscriptions occur, and it works together with `bufferSize`. For predictable memory use, set both: `new ReplaySubject(100, 60_000)`.

**Assuming it behaves like BehaviorSubject after completion.** A completed `ReplaySubject` still replays its buffer to new subscribers before completing them; a completed `BehaviorSubject` emits nothing but the completion. This subtle difference shows up in caching scenarios.

## Interview Q&A

??? question "What is the difference between ReplaySubject(1) and BehaviorSubject?"

    `BehaviorSubject` demands an initial value, exposes `getValue()`, and after completion emits only complete. `ReplaySubject(1)` starts silent until the first `next`, has no synchronous getter, and even after completion replays the last buffered value to new subscribers. Choose by whether an initial value and synchronous access make sense.

??? question "What do the two constructor arguments of ReplaySubject control?"

    `bufferSize` caps how many recent values are kept; `windowTime` caps how old a buffered value may be (in milliseconds). A value is replayed only if it satisfies both limits.

??? question "How does shareReplay relate to ReplaySubject?"

    [`shareReplay`](shareReplay.md) uses a `ReplaySubject` internally: it multicasts a source Observable through one and replays the buffer to late subscribers. Understanding the Subject explains the operator's caching behavior, including replay-after-completion.

## Related

- [BehaviorSubject](behaviorSubject.md) for single current-value state
- [shareReplay](shareReplay.md), the operator built on this Subject
- [Subject vs BehaviorSubject vs ReplaySubject](../comparisons/subject-behaviorSubject-replaySubject.md) for the side-by-side table
