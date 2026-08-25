---
description: "Pair values from multiple streams by index."
tags:
  - Operators
  - Combination
---

# zip

The `zip()` operator in RxJS is a **combination operator**. Its job is to combine multiple source Observables by waiting for each observable to emit a value at the **same index**, and then it emits an array containing those values paired together.

!!! abstract "At a glance"

    - **Signature:** `zip(a$, b$, ...)`
    - **Use when:** values must be paired strictly by position: 1st with 1st, 2nd with 2nd
    - **Avoid when:** you want the latest values regardless of position (`combineLatest`) or final results (`forkJoin`)
    - **Top gotcha:** zip buffers the faster source while waiting for the slower one; a large rate mismatch grows memory without bound

## Analogy: The Zipper

Think of a clothing zipper. It has two sides (or more, if you imagine a multi-way zipper!). To close the zipper, teeth from _both_ sides must align at the same position. `zip()` works the same way:

1.  It subscribes to all the source Observables you provide.
2.  It waits until the **first** value arrives from **every** source. It then emits these first values together in an array: `[firstValueA, firstValueB, ...]`.
3.  Then, it waits until the **second** value arrives from **every** source. It emits these second values together: `[secondValueA, secondValueB, ...]`.
4.  It continues this process, index by index (0, 1, 2,...).
5.  **Crucially:** If one source Observable completes _before_ another, `zip()` will stop emitting new pairs as soon as it runs out of values from the shorter source to pair with. It needs a value from _all_ sources for a given index to emit.

## Minimal Example

```typescript
import { of, zip } from "rxjs";

zip(of("A", "B", "C"), of(1, 2, 3, 4)).subscribe(console.log);

// ["A", 1]
// ["B", 2]
// ["C", 3]
// (4 is never paired: the letters ran out, so zip completes)
```

## Why Use `zip()`?

You use `zip()` when you have multiple streams and you need to combine their values based on their **emission order or index**. You specifically want the 1st item from stream A paired with the 1st from stream B, the 2nd with the 2nd, and so on.

## Real-World Example: Pairing Related Sequential Data

Imagine you have two real-time data feeds:

1.  `sensorA$` emits temperature readings every second.
2.  `sensorB$` emits humidity readings every second, perfectly synchronized with sensor A.

You want to process these readings as pairs (temperature and humidity for the _same_ timestamp/interval). `zip` is perfect for this.

Another scenario (less common for APIs, more for UI events or other streams): Suppose you want to pair every user click with a corresponding item from another list that gets populated sequentially. The first click pairs with the first item, the second click with the second, etc.

## Code Snippet Example

Let's create a simple Angular component example using `zip`. We'll zip together values from two simple streams: one emitting letters ('A', 'B', 'C') quickly, and another emitting numbers (10, 20, 30, 40) more slowly.

```typescript
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { JsonPipe } from "@angular/common";
import { interval, map, of, take, zip } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: "app-zip-example",
  imports: [JsonPipe],
  template: `
    <h2>RxJS zip() Example</h2>
    <p>Combining letters and numbers based on index:</p>
    <ul>
      @for (pair of zippedResult(); track $index) {
        <li>{{ pair | json }}</li>
      }
    </ul>
    <p>
      Note: The number stream had '40', but the letter stream completed after
      'C', so zip stopped.
    </p>
  `,
  styles: [
    `
      li {
        font-family: monospace;
      }
    `,
  ],
})
export class ZipExampleComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  zippedResult = signal<Array<[string, number]>>([]); // Signal to hold the result

  ngOnInit() {
    // Source 1: Emits 'A', 'B', 'C' one after another immediately
    const letters$ = of("A", "B", "C");

    // Source 2: Emits 10, 20, 30, 40 every 500ms
    const numbers$ = interval(500).pipe(
      map((i) => (i + 1) * 10), // Map index 0, 1, 2, 3 to 10, 20, 30, 40
      take(4), // Only take the first 4 values
    );

    // Zip them together
    zip(letters$, numbers$)
      .pipe(
        // zip emits arrays like [string, number]
        takeUntilDestroyed(this.destroyRef), // Auto-unsubscribe
      )
      .subscribe({
        next: (value) => {
          // Update the signal with the latest pair
          // NOTE: For signals, it's often better to collect all results
          // if the stream completes quickly, or update progressively.
          // Here we'll just append for demonstration.
          this.zippedResult.update((current) => [...current, value]);
          console.log("Zipped value:", value);
        },
        complete: () => {
          console.log("Zip completed because the letters$ stream finished.");
        },
        error: (err) => {
          console.error("Zip error:", err);
        },
      });
  }
}
```

**Explanation of the Code:**

1.  `letters$` emits 'A', 'B', 'C' and then completes.
2.  `numbers$` starts emitting 10 (at 500ms), 20 (at 1000ms), 30 (at 1500ms), 40 (at 2000ms).
3.  `zip` waits:
    - It gets 'A' immediately, but waits for `numbers$` to emit.
    - At 500ms, `numbers$` emits 10. `zip` now has the first value from both ('A', 10) -> Emits `['A', 10]`.
    - It gets 'B' immediately, waits for `numbers$`.
    - At 1000ms, `numbers$` emits 20. `zip` has the second value from both ('B', 20) -> Emits `['B', 20]`.
    - It gets 'C' immediately, waits for `numbers$`.
    - At 1500ms, `numbers$` emits 30. `zip` has the third value from both ('C', 30) -> Emits `['C', 30]`.
4.  `letters$` has now completed. Even though `numbers$` emits 40 at 2000ms, `zip` cannot find a corresponding 4th value from `letters$`, so it stops and completes.

## `zip()` vs. Other Combination Operators

- **`combineLatest`**: Emits an array of the _latest_ values from each source whenever _any_ source emits. Doesn't care about index, just the most recent value from all participants.
- **`forkJoin`**: Waits for _all_ source observables to _complete_, then emits a single array containing the _last_ value emitted by each source. Useful for running parallel one-off tasks (like multiple HTTP requests) and getting all results together at the end.

Use `zip()` specifically when the _order_ and _pairing_ by index (1st with 1st, 2nd with 2nd, etc.) is what you need.

## Common Mistakes

**Ignoring the buffer.** If one source emits 1000 values while the other emits 3, zip holds 997 values in memory waiting for partners. On unbalanced live streams this is an effective memory leak.

**Using zip for "current values".** Pairing by index means you can combine an old value with a new one long after the old state stopped being true. State combination is `combineLatest`'s job.

**Assuming zip keeps going.** The output completes as soon as any source completes and its buffered values are consumed; remaining values from longer sources are dropped.

## Interview Q&A

??? question "What is the core difference between zip and combineLatest?"

    `zip` pairs emissions by index and waits for a partner for each value; `combineLatest` pairs by recency and re-emits on any change. `zip` output count equals the shortest source; `combineLatest` keeps emitting as long as any source lives.

??? question "Why can zip cause memory problems?"

    It must buffer every unmatched value from faster sources until the slower ones catch up. With unbounded rate mismatch the buffer grows forever. `withLatestFrom` or `combineLatest` avoid this by keeping only the latest value.

??? question "When does zip complete?"

    When any input completes **and** its values are fully paired: no further index can ever be completed, so the output completes and unsubscribes from the rest.

## Related

- [combineLatest](combineLatest.md) for recency-based combination
- [forkJoin](forkJoin.md) for one final combined emission
- [withLatestFrom](withLatestFrom.md) for snapshotting other streams on a driver's emission
