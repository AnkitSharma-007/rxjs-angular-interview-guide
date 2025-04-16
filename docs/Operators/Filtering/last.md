# last

The `last()` operator is used to get **only the very last value** emitted by a source Observable that satisfies an optional condition, but only _after_ the source Observable **completes**.

It operates similarly to `first()` but focuses on the end of the stream:

1.  **`last()` (no arguments):** Waits for the source Observable to complete. Once completed, it emits the single, last value that the source emitted. If the source completes without emitting _any_ values, `last()` will emit an `EmptyError`.
2.  **`last(predicateFn)`:** Waits for the source Observable to complete. Once completed, it looks at all the values the source emitted and finds the last one for which the `predicateFn` returned `true`. It emits that single value. If no value satisfied the predicate before completion, `last()` emits an `EmptyError`.
3.  **`last(predicateFn, defaultValue)`:** Same as above, but if no value satisfied the predicate before completion, it emits the `defaultValue` instead of erroring.

## Key Characteristics

- **Waits for Completion:** Critically depends on the source Observable sending a `complete` notification before it can emit a value. It won't work on streams that never complete (like a raw `interval`).
- **Selects Last Value:** Emits only one value – the last that qualifies based on the arguments, determined _after_ the source finishes.
- **Completes Stream:** Completes itself immediately after emitting the single value (or default value/error).
- **Potential Error:** Can throw `EmptyError` if the source completes without emitting suitable values (unless a `defaultValue` is supplied).

## Real-World Example Scenario

Imagine you have an Observable representing a sequence of operations that must finish, like processing steps in a batch job. The stream might emit intermediate status updates, but you only care about the **final result or status message** that is emitted just before the entire process completes.

**Scenario:** Let's simulate a stream emitting scores achieved during different phases of a game round. We only want to get the _final_ score achieved at the end of the round.

## Code Snippet

```typescript
import { Component, OnInit } from "@angular/core";
import { of, last, catchError, EMPTY, throwError } from "rxjs";
import { EmptyError } from "rxjs";

@Component({
  selector: "app-last-demo",
  standalone: true,
  imports: [],
  template: `
    <h4>Last Operator Demo</h4>
    <p>Getting the final score from a completed round. Check console.</p>
    <p>Result: {{ finalScoreStatus }}</p>
  `,
})
export class LastDemoComponent implements OnInit {
  finalScoreStatus = "Waiting for round to complete...";

  ngOnInit(): void {
    const roundScores$ = of(10, 50, 20, 100); // Finite, completes after 100

    console.log(
      `[${new Date().toLocaleTimeString()}] Subscribing to get final score...`
    );

    roundScores$
      .pipe(
        last(), // No predicate, just get the very last value
        catchError((error) => {
          if (error instanceof EmptyError) {
            console.warn(
              `[${new Date().toLocaleTimeString()}] Source completed without emitting values.`
            );
            this.finalScoreStatus = "Round completed with no scores.";
            return EMPTY;
          } else {
            console.error(
              `[${new Date().toLocaleTimeString()}] Stream error:`,
              error
            );
            this.finalScoreStatus = `Error: ${error.message}`;
            return throwError(() => error);
          }
        })
      )
      .subscribe({
        next: (finalScore) => {
          console.log(
            `[${new Date().toLocaleTimeString()}] Final score received: ${finalScore}`
          );
          this.finalScoreStatus = `Final Score: ${finalScore}`;
        },
        complete: () => {
          console.log(
            `[${new Date().toLocaleTimeString()}] Stream completed by last().`
          );
        },
      });
  }
}
```

**Explanation:**

1.  **`roundScores$ = of(10, 50, 20, 100)`**: We create a finite Observable using `of()`. This stream emits 10, 50, 20, 100 and then immediately completes.
2.  **`last()`**: This operator subscribes to `roundScores$`. It internally keeps track of the most recently emitted value. Because `roundScores$` completes right after emitting 100, `last()` knows the stream is finished.
3.  **Emission**: Once `roundScores$` completes, `last()` emits the very last value it saw, which is `100`.
4.  **`catchError(...)`**: Handles the `EmptyError` case if the source (`of()`) had been empty (e.g., `of()`).
5.  **`subscribe({...})`**:
    - The `next` handler receives the single value `100`.
    - The `complete` handler is called right after `next`, confirming the stream finished.

## Summary

`last()` is used when you need the final value emitted by a **completing** Observable stream (optionally matching a condition). It inherently requires waiting for the source to finish before it can determine and emit the last value. Remember it won't work if the source stream never completes.
