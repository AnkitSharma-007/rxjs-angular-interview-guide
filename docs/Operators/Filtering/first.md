# first

The `first()` operator is used to get **only the first value** emitted by a source Observable that meets an optional condition. After emitting that single value, it immediately **completes** the stream.

It can be used in a few ways:

1.  **`first()` (no arguments):** Emits the very first value from the source, then completes. If the source completes without emitting _any_ values, `first()` will emit an `EmptyError`.
2.  **`first(predicateFn)`:** Emits the first value from the source for which the provided `predicateFn` function returns `true`, then completes. If the source completes before any value satisfies the predicate, `first()` will emit an `EmptyError`.
3.  **`first(predicateFn, defaultValue)`:** Same as above, but if the source completes before any value satisfies the predicate, it emits the provided `defaultValue` instead of erroring, and then completes.

## Key Characteristics

- **Selects First Value:** Emits only one value – the first that qualifies based on the arguments.
- **Completes Stream:** Immediately completes after emitting the single value (or default value/error).
- **Unsubscribes from Source:** Cleans up the source subscription upon completion or error.
- **Potential Error:** Can throw `EmptyError` if no suitable value is found before the source completes (unless a `defaultValue` is supplied).

## Real-World Example Scenario

Imagine your Angular application needs to load some initial configuration data when it starts. This data might be available via an Observable (perhaps from a service using `ReplaySubject(1)` or `BehaviorSubject`). You only care about getting that _first available configuration value_ to initialize your component, even if the source Observable might emit updates later. `first()` is ideal for grabbing that initial emission and then completing the stream cleanly.

**Scenario:** Let's simulate a stream emitting user status updates ('pending', 'active', 'inactive'). We only want to know the _first_ time the user becomes 'active'.

## Code Snippet

```typescript
import { Component, OnInit } from "@angular/core";
import {
  of,
  first,
  catchError,
  EMPTY,
  throwError,
  timer,
  map,
  concat,
} from "rxjs";
import { EmptyError } from "rxjs";

@Component({
  selector: "app-first-demo",
  standalone: true,
  imports: [],
  template: `
    <h4>First Operator Demo</h4>
    <p>Looking for the first 'active' status. Check console.</p>
    <p>Result: {{ resultStatus }}</p>
  `,
})
export class FirstDemoComponent implements OnInit {
  resultStatus = "Waiting...";

  ngOnInit(): void {
    const statusUpdates$ = concat(
      timer(500).pipe(map(() => "pending")),
      timer(1000).pipe(map(() => "pending")),
      timer(1500).pipe(map(() => "active")), // First 'active' here
      timer(2000).pipe(map(() => "pending")),
      timer(2500).pipe(map(() => "inactive"))
    );

    console.log(
      `[${new Date().toLocaleTimeString()}] Subscribing to find first 'active' status...`
    );

    statusUpdates$
      .pipe(
        first((status) => status === "active"),
        catchError((error) => {
          if (error instanceof EmptyError) {
            console.warn(
              `[${new Date().toLocaleTimeString()}] No 'active' status found before stream completed.`
            );
            this.resultStatus = "No active status found.";
            return EMPTY;
          } else {
            console.error(
              `[${new Date().toLocaleTimeString()}] Stream error:`,
              error
            );
            this.resultStatus = `Error: ${error.message}`;
            return throwError(() => error);
          }
        })
      )
      .subscribe({
        next: (activeStatus) => {
          console.log(
            `[${new Date().toLocaleTimeString()}] Found first active status: ${activeStatus}`
          );
          this.resultStatus = `First active status: ${activeStatus}`;
        },
        complete: () => {
          console.log(
            `[${new Date().toLocaleTimeString()}] Stream completed by first().`
          );
          // Note: resultStatus might already be set by next or catchError
          if (this.resultStatus === "Waiting...") {
            this.resultStatus =
              "Stream completed (likely handled by catchError/default)";
          }
        },
      });
  }
}
```

**Explanation:**

1.  **`statusUpdates$`**: We simulate a stream emitting different status strings over time using `concat` and `timer`.
2.  **`first(status => status === 'active')`**: This operator listens to `statusUpdates$`.
    - It ignores 'pending'.
    - When 'active' arrives, `first()` emits 'active'.
    - Immediately after emitting 'active', it sends the `complete` signal and unsubscribes from `statusUpdates$`. The subsequent 'pending' and 'inactive' emissions are never processed by this subscription.
3.  **`catchError(...)`**: This handles the `EmptyError` that `first()` would throw if the `statusUpdates$` completed _before_ emitting 'active'. In this example, 'active' is found, so this specific error path isn't taken.
4.  **`subscribe({...})`**:
    - The `next` handler receives the single value 'active'.
    - The `complete` handler is called right after `next`, confirming the stream finished.

## Summary

`first()` is used when you need exactly one value from the beginning of a stream (optionally matching a condition) and want the stream to complete immediately afterward. It's concise for getting initial values or the first occurrence of a specific event. Remember its potential to throw `EmptyError` if no qualifying value is emitted before the source completes.
