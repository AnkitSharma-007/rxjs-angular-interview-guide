---
description: "Accumulate every value and emit only the final result at completion: scan's finish-line sibling."
tags:
  - Operators
  - Transformation
---

# reduce

`reduce()` folds an entire stream into a **single value**. Like JavaScript's `Array.prototype.reduce`, it runs an accumulator function over every emission, but it stays silent the whole time and emits exactly once: the final accumulated result, at the moment the source **completes**.

If [`scan`](scan.md) is a running total shown live, `reduce` is the total printed at the bottom of the receipt.

!!! abstract "At a glance"

    - **Signature:** `reduce(accumulator, seed?)`
    - **Use when:** a finite stream should collapse into one summary value: totals, counts, aggregated reports
    - **Avoid when:** the source never completes (nothing will ever be emitted) or you need intermediate values (`scan`)
    - **Top gotcha:** on an infinite stream, `reduce` emits nothing, forever, with no warning

## How it works

1. Every source value is folded into the accumulator: `acc = accumulator(acc, value)`.
2. Nothing is emitted while the source is live.
3. When the source completes, the final accumulator value is emitted, then the result completes.

`reduce(fn, seed)` behaves like `scan(fn, seed)` followed by taking only the last value. Two seed details worth knowing:

- **With a seed**, an empty source still emits the seed at completion.
- **Without a seed**, the first value becomes the initial accumulator, and an empty source completes **without emitting anything**. Unlike `Array.prototype.reduce`, there is no error; the silence is easy to miss.

## Minimal Example

```typescript
import { of, reduce, scan } from "rxjs";

const bill$ = of(120, 45, 30);

bill$.pipe(scan((total, item) => total + item, 0)).subscribe(console.log);
// 120, 165, 195   (running total, live)

bill$.pipe(reduce((total, item) => total + item, 0)).subscribe(console.log);
// 195             (only the final total, at completion)
```

## Angular Example: Batch Upload Summary

```typescript
import { Component, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { from, concatMap, map, catchError, of, reduce } from "rxjs";

interface BatchReport {
  succeeded: number;
  failed: number;
}

@Component({
  selector: "app-bulk-upload",
  template: `
    <button (click)="uploadAll()">Upload all</button>
    @if (report(); as report) {
      <p>Done: {{ report.succeeded }} uploaded, {{ report.failed }} failed.</p>
    }
  `,
})
export class BulkUploadComponent {
  private readonly http = inject(HttpClient);

  protected readonly report = signal<BatchReport | undefined>(undefined);

  protected files: File[] = [];

  protected uploadAll(): void {
    from(this.files)
      .pipe(
        // one at a time; each upload resolves to a success flag
        concatMap((file) =>
          this.http.post("/api/upload", toFormData(file)).pipe(
            map(() => true),
            catchError(() => of(false)),
          ),
        ),
        // fold all flags into one summary, emitted when the batch finishes
        reduce(
          (acc, ok): BatchReport =>
            ok
              ? { ...acc, succeeded: acc.succeeded + 1 }
              : { ...acc, failed: acc.failed + 1 },
          { succeeded: 0, failed: 0 },
        ),
      )
      .subscribe((report) => this.report.set(report));
  }
}

function toFormData(file: File): FormData {
  const data = new FormData();
  data.append("file", file);
  return data;
}
```

**How it works:** `from(this.files)` is finite, so completion is guaranteed. `concatMap` uploads sequentially, `catchError` converts each failure into a `false` instead of killing the batch, and `reduce` emits a single report exactly when the last upload settles. Swap `reduce` for `scan` and you would get a live progress report after every file instead.

## Common Mistakes

**Using it on a stream that never completes.** `reduce` on `valueChanges`, a `Subject`, or router events emits nothing until completion, which never comes. For running aggregates on live streams, use `scan`.

**Forgetting the seed.** Without a seed, an empty source produces no emission and no error, so downstream code silently never runs. With a seed, you always get exactly one value. Prefer an explicit seed unless you have a reason not to.

**Rebuilding `toArray` or `count` by hand.** `reduce((acc, v) => [...acc, v], [])` is exactly `toArray()`, and `reduce((n) => n + 1, 0)` is `count()`. Reach for the named operator when one exists; it documents intent.

## Interview Q&A

??? question "reduce vs scan?"

    Same accumulator logic, different emission policy: `scan` emits every intermediate accumulation as values arrive, `reduce` emits only the final one at completion. Consequence: `scan` is safe on infinite streams, `reduce` is only meaningful on finite ones.

??? question "What does reduce emit for an empty source?"

    With a seed: the seed, once, at completion. Without a seed: nothing at all, and unlike `Array.prototype.reduce` it does not throw. That silent no-emission path is a classic source of "my subscribe never fired" bugs.

??? question "When would reduce actually appear in Angular code?"

    Anywhere a finite pipeline should end in one summary: totalling results of a sequential batch (`from` + `concatMap`), aggregating a paginated crawl that completes, or computing stats over `forkJoin`-style finite work. If the stream is component state or user events, it is infinite and reduce is the wrong tool.

## Related

- [scan](scan.md), the same fold with live intermediate emissions
- [concatMap](concatMap.md) for the sequential batches reduce typically summarizes
- [last](../filtering/last.md), which shares the emit-only-at-completion behavior
