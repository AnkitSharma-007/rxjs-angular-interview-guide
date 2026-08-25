---
description: "Only pass values that satisfy a predicate."
tags:
  - Operators
  - Filtering
---

# filter

The `filter()` operator is, as the name suggests, a **filtering operator**. It looks at each value emitted by the source Observable and applies a condition check – called a **predicate function** – to it.

- If the predicate function returns `true` for a value, `filter()` allows that value to pass through to the next operator or subscriber.
- If the predicate function returns `false`, `filter()` simply discards that value, and it's never seen downstream.

It works very much like the `Array.prototype.filter()` method in JavaScript, but operates on values emitted asynchronously over time by an Observable.

!!! abstract "At a glance"

    - **Signature:** `filter(predicate: (value, index) => boolean)`
    - **Use when:** discarding emissions that downstream logic should never see: wrong priority, null payloads, unwanted event types
    - **Avoid when:** you want to stop after the first match (`first`/`find` complete for you) or transform values (`map`)
    - **Top gotcha:** `filter` never completes a stream; if nothing matches, the stream is simply silent, not done

## Key Characteristics

- **Conditional Emission:** Only emits values that satisfy the condition defined in the predicate function.
- **Takes a Predicate Function:** You provide a function `filter(predicateFn)` where `predicateFn` takes the source value (and optionally its index) and returns `true` or `false`.
- **Doesn't Modify Values:** It doesn't change the content of the values that pass through; it only decides _if_ they pass.
- **Preserves Relative Order:** The values that do pass maintain their original relative order.
- **Passes Through Errors/Completion:** If the source Observable errors or completes, `filter` passes those notifications along immediately.

## Minimal Example

```typescript
import { from, filter } from "rxjs";

from([1, 2, 3, 4, 5, 6])
  .pipe(filter((n) => n % 2 === 0))
  .subscribe(console.log);

// 2, 4, 6
```

## Real-World Example Scenario

Imagine you have a stream of incoming tasks or notifications in your Angular application. Each task object might have a `priority` property ('high', 'medium', 'low'). You might have different parts of your UI or different logic handlers interested only in tasks of a certain priority.

**Scenario:** Let's say you want to display an urgent notification counter that only increments when a task with `'high'` priority arrives. You can use `filter()` to create a new stream containing only those high-priority tasks.

## Code Snippet (Angular Component - Filtering High-Priority Tasks)

```typescript
import { Component, signal } from "@angular/core";
import { Subject, filter } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

interface Task {
  id: number;
  description: string;
  priority: "high" | "medium" | "low";
}

@Component({
  selector: "app-task-filter-demo",
  template: `
    <button (click)="simulateIncomingTask()">Simulate New Task</button>

    <h5>High priority only ({{ highPriorityTasks().length }})</h5>
    <ul>
      @for (task of highPriorityTasks(); track task.id) {
        <li>ID: {{ task.id }} - {{ task.description }}</li>
      }
    </ul>
  `,
})
export class TaskFilterDemoComponent {
  private readonly tasks$ = new Subject<Task>();
  private taskIdCounter = 0;

  protected readonly highPriorityTasks = signal<Task[]>([]);

  constructor() {
    this.tasks$
      .pipe(
        // only high-priority tasks pass; the rest are discarded here
        filter((task) => task.priority === "high"),
        takeUntilDestroyed(),
      )
      .subscribe((task) =>
        this.highPriorityTasks.update((list) => [...list.slice(-4), task]),
      );
  }

  simulateIncomingTask(): void {
    const priorities = ["low", "medium", "high"] as const;
    this.tasks$.next({
      id: ++this.taskIdCounter,
      description: `Simulated task number ${this.taskIdCounter}`,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
    });
  }
}
```

**Explanation:**

1.  **`Subject<Task>`**: Mimics an Observable stream where `Task` objects arrive over time (triggered by the button click).
2.  **`filter((task) => task.priority === "high")`**: The predicate runs for every task. Only tasks returning `true` continue downstream; medium and low priority tasks are discarded and the subscriber never sees them.
3.  **`subscribe(...)`**: Runs only for high-priority tasks and appends them to the signal that drives the template.
4.  **`takeUntilDestroyed()`**: Ends the subscription when the component is destroyed, since the Subject itself never completes.

## Common Mistakes

**Filtering without narrowing the type.** `filter((x) => x !== null)` still leaves `T | null` in TypeScript. Use a type-guard predicate, `filter((x): x is T => x !== null)`, so downstream operators get the narrowed type.

**Using `filter(Boolean)` carelessly.** It removes `null` and `undefined`, but also `0`, `""`, and `false`. If those are valid values, write the explicit predicate.

**Waiting for completion that never comes.** A stream whose values are all filtered out does not complete; it just never emits. Completion still depends on the source (or operators like `take`).

## Interview Q&A

??? question "How does RxJS filter differ from Array.prototype.filter?"

    Same idea, different domain: `Array.filter` synchronously produces a new array from existing items; RxJS `filter` decides per emission, over time, whether a value continues down the stream. There is no collection to return, only pass or discard as values arrive.

??? question "How do you keep TypeScript types accurate through a filter?"

    Give the predicate a type-guard signature: `filter((value): value is User => value !== null)`. RxJS's typings then narrow the output Observable's type from `User | null` to `User`.

??? question "What is the difference between filter and find in RxJS?"

    `filter` lets every matching value through and never terminates the stream itself. [`find`](find.md) emits only the first match and then completes, unsubscribing from the source.

## Related

- [find](find.md) and [first](first.md) to stop after the first match
- [distinctUntilChanged](distinctUntilChanged.md) to drop repeats instead of non-matches
- [map](../transformation/map.md) to transform what passes through

## Summary

`filter()` acts as a gatekeeper for your Observable streams, allowing only the data that meets your specific criteria to proceed, making it essential for selecting relevant information from potentially noisy streams.
