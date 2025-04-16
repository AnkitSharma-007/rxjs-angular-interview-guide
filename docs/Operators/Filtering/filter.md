# filter

The `filter()` operator is, as the name suggests, a **filtering operator**. It looks at each value emitted by the source Observable and applies a condition check – called a **predicate function** – to it.

- If the predicate function returns `true` for a value, `filter()` allows that value to pass through to the next operator or subscriber.
- If the predicate function returns `false`, `filter()` simply discards that value, and it's never seen downstream.

It works very much like the `Array.prototype.filter()` method in JavaScript, but operates on values emitted asynchronously over time by an Observable.

## Key Characteristics

- **Conditional Emission:** Only emits values that satisfy the condition defined in the predicate function.
- **Takes a Predicate Function:** You provide a function `filter(predicateFn)` where `predicateFn` takes the source value (and optionally its index) and returns `true` or `false`.
- **Doesn't Modify Values:** It doesn't change the content of the values that pass through; it only decides _if_ they pass.
- **Preserves Relative Order:** The values that do pass maintain their original relative order.
- **Passes Through Errors/Completion:** If the source Observable errors or completes, `filter` passes those notifications along immediately.

## Real-World Example Scenario

It's Tuesday afternoon here in Bengaluru (around 3:00 PM IST). Imagine you have a stream of incoming tasks or notifications in your Angular application. Each task object might have a `priority` property ('high', 'medium', 'low'). You might have different parts of your UI or different logic handlers interested only in tasks of a certain priority.

**Scenario:** Let's say you want to display an urgent notification counter that only increments when a task with `'high'` priority arrives. You can use `filter()` to create a new stream containing only those high-priority tasks.

## Code Snippet (Angular Component - Filtering High-Priority Tasks)

```typescript
import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subject, Subscription } from "rxjs";
import { filter, tap } from "rxjs/operators"; // Import filter

interface Task {
  id: number;
  description: string;
  priority: "high" | "medium" | "low";
}

@Component({
  selector: "app-task-filter-demo",
  template: `
    <h4>Task Filtering Demo</h4>
    <p>Simulating incoming tasks. Check console log and high priority list.</p>
    <button (click)="simulateIncomingTask()" class="btn btn-secondary">
      Simulate New Task
    </button>

    <div class="mt-3">
      <h5>High Priority Tasks Only (Count: {{ highPriorityTaskCount }})</h5>
      <ul class="list-group">
        <li
          *ngFor="let task of highPriorityTasks"
          class="list-group-item list-group-item-danger small"
        >
          ID: {{ task.id }} - {{ task.description }}
        </li>
      </ul>
    </div>
    <div class="mt-3">
      <h5>All Tasks Log:</h5>
      <ul class="list-group">
        <li *ngFor="let task of allTasksLog" class="list-group-item small">
          ID: {{ task.id }} - {{ task.description }} (Priority:
          {{ task.priority }})
        </li>
      </ul>
    </div>
  `,
})
export class TaskFilterDemoComponent implements OnInit, OnDestroy {
  highPriorityTaskCount = 0;
  highPriorityTasks: Task[] = [];
  allTasksLog: Task[] = [];

  // Use a Subject to simulate a stream of incoming tasks
  private taskSubject = new Subject<Task>();
  private taskSubscription: Subscription | undefined;
  private taskIdCounter = 0;

  ngOnInit(): void {
    // Subscribe to the task stream
    this.taskSubscription = this.taskSubject
      .pipe(
        tap((task) => {
          // Log every task that comes in *before* filtering
          console.log(
            `[${new Date().toLocaleTimeString()}] Received Task: ID=${
              task.id
            }, Prio=${task.priority}`
          );
          this.allTasksLog.push(task);
          if (this.allTasksLog.length > 10) this.allTasksLog.shift(); // Keep log short
        }),
        // Apply the filter operator
        filter((task: Task) => {
          // This is the predicate function.
          // It returns true only if the task's priority is 'high'.
          const shouldPass = task.priority === "high";
          console.log(
            `   Filtering Task ID ${task.id} (Prio: ${task.priority}). Should pass? ${shouldPass}`
          );
          return shouldPass;
        }),
        // The rest of the pipe only sees tasks that passed the filter
        tap((highPrioTask) => {
          console.log(`      -> Task ID ${highPrioTask.id} passed the filter!`);
        })
      )
      .subscribe({
        next: (highPriorityTask: Task) => {
          // This 'next' handler only receives tasks where priority === 'high'
          this.highPriorityTaskCount++;
          this.highPriorityTasks.push(highPriorityTask);
          if (this.highPriorityTasks.length > 5) this.highPriorityTasks.shift(); // Keep list short
        },
        error: (err) => console.error("Task stream error:", err),
        // complete: () => console.log('Task stream completed') // Only if subject completes
      });
  }

  simulateIncomingTask(): void {
    this.taskIdCounter++;
    const priorities: Array<"high" | "medium" | "low"> = [
      "low",
      "medium",
      "high",
    ];
    const randomPriority =
      priorities[Math.floor(Math.random() * priorities.length)];

    const newTask: Task = {
      id: this.taskIdCounter,
      description: `Simulated task number ${this.taskIdCounter}`,
      priority: randomPriority,
    };
    console.log(
      `------------------\nSimulating: Pushing task ${newTask.id} with priority ${newTask.priority}`
    );
    this.taskSubject.next(newTask); // Push the new task onto the stream
  }

  ngOnDestroy(): void {
    if (this.taskSubscription) {
      this.taskSubscription.unsubscribe();
    }
    this.taskSubject.complete();
  }
}
```

**Explanation:**

1.  **`Subject<Task>`**: We use a Subject to mimic an Observable stream where `Task` objects arrive over time (triggered by the button click).
2.  **`tap(...)` (before filter)**: We use `tap` to log every task that enters the pipe, _before_ it hits the filter, so we can see everything that arrives.
3.  **`filter((task: Task) => task.priority === 'high')`**: This is the core.
    - The `filter` operator receives each `Task` object emitted by the `taskSubject`.
    - The predicate function `(task: Task) => task.priority === 'high'` checks if the `priority` property of the task is strictly equal to `'high'`.
    - If it is `true`, the `task` object is passed further down the pipe.
    - If it is `false` (i.e., priority is 'medium' or 'low'), the `task` object is discarded by `filter`.
4.  **`tap(...)` (after filter)**: We log again here to clearly see which tasks made it _through_ the filter.
5.  **`subscribe({ next: ... })`**: The `next` handler will _only_ be executed for tasks that passed the filter (those with 'high' priority). We update the count and the list based on these filtered tasks.

## Summary

`filter()` acts as a gatekeeper for your Observable streams, allowing only the data that meets your specific criteria to proceed, making it essential for selecting relevant information from potentially noisy streams.
