---
description: "Collect emissions into arrays and release them in batches: by notifier, by time window, or by count."
tags:
  - Operators
  - Transformation
---

# buffer, bufferTime & bufferCount

The buffer family collects source emissions into an **array** and emits the whole batch at once when a release condition fires. The three common variants differ only in what triggers the release:

- **`buffer(notifier$)`**: release when another Observable emits
- **`bufferTime(ms)`**: release on a fixed clock
- **`bufferCount(n)`**: release every `n` values

Unlike the timing operators (`debounceTime`, `sampleTime`), nothing is dropped: every source value ends up in exactly one batch (or several, with overlapping buffers).

!!! abstract "At a glance"

    - **Signatures:** `buffer(notifier$)`, `bufferTime(span, creationInterval?, maxSize?)`, `bufferCount(size, startEvery?)`
    - **Use when:** values should be processed in batches rather than one by one: bulk API writes, analytics batching, grouping rapid events
    - **Avoid when:** only the latest value matters (`sampleTime`, `auditTime`) or values need individual handling
    - **Top gotcha:** `bufferTime` emits **empty arrays** on quiet windows; filter them out before acting on each batch

## How each variant works

**`buffer(notifier$)`** stores values until `notifier$` emits, then releases the batch. When the source completes, any remaining buffered values are flushed as a final (possibly shorter) array before completion.

**`bufferTime(span)`** releases a batch every `span` milliseconds on its own clock, whether or not anything arrived. An optional `maxBufferSize` argument releases early when the buffer fills up, giving "every N ms **or** every X values, whichever comes first".

**`bufferCount(size, startEvery?)`** releases after every `size` values. With `startEvery` smaller than `size` you get overlapping sliding windows; at completion, partial buffers are emitted rather than lost.

## Minimal Example

```typescript
import { of, bufferCount, interval, take, buffer, timer } from "rxjs";

of(0, 1, 2, 3, 4, 5, 6, 7).pipe(bufferCount(3)).subscribe(console.log);
// [0, 1, 2]
// [3, 4, 5]
// [6, 7]      <- partial final batch, flushed at completion

interval(100)
  .pipe(take(5), buffer(timer(230, 1000)))
  .subscribe(console.log);
// [0, 1]      <- released when the notifier fired at t=230
// [2, 3, 4]   <- flushed when the source completed
```

## Angular Example: Batching Analytics Events

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  Subject,
  EMPTY,
  bufferTime,
  filter,
  concatMap,
  retry,
  catchError,
} from "rxjs";

interface TrackedEvent {
  name: string;
  at: number;
}

@Injectable({ providedIn: "root" })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly events$ = new Subject<TrackedEvent>();

  constructor() {
    this.events$
      .pipe(
        // release a batch every 5s, or immediately once 20 events pile up
        bufferTime(5000, undefined, 20),
        // quiet windows produce empty arrays; skip them
        filter((batch) => batch.length > 0),
        // send batches in order so the backend sees a consistent timeline;
        // a failed batch is retried, then dropped, so one bad request
        // cannot error the pipeline and kill all future batching
        concatMap((batch) =>
          this.http.post("/api/analytics", { batch }).pipe(
            retry({ count: 2, delay: 1000 }),
            catchError(() => EMPTY),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  track(name: string): void {
    this.events$.next({ name, at: Date.now() });
  }
}
```

**How it works:** individual `track()` calls would mean one HTTP request per click. `bufferTime(5000, undefined, 20)` groups them into at most one request per 5 seconds, releasing early if a burst fills 20 events. The `filter` is essential: without it, every quiet 5-second window would post an empty batch. The error handling inside `concatMap` matters just as much: without it, one failed POST would error the whole subscription and silently stop analytics for the rest of the session.

## Common Mistakes

**Forgetting the empty arrays.** `bufferTime` ticks regardless of activity. Any side effect keyed on "a batch arrived" fires on silence too unless you `filter(b => b.length > 0)` first.

**Unbounded buffering of a fast source.** `buffer(notifier$)` with a notifier that rarely fires accumulates values in memory without limit. For high-volume streams, prefer `bufferTime` with `maxBufferSize` or `bufferCount` so the buffer has a hard cap.

**Using buffers when you only need the latest value.** If intermediate values are disposable, buffering them just to read `batch.at(-1)` wastes memory; that is [`sampleTime`](../filtering/sampleTime.md) or [`auditTime`](../filtering/auditTime.md).

## Interview Q&A

??? question "buffer vs sample in one line?"

    Buffering keeps **every** value and emits them grouped in arrays; sampling keeps only the **latest** value and discards the rest. Choose by asking whether dropped values are acceptable.

??? question "What happens to buffered values when the source completes?"

    They are not lost: `buffer`, `bufferTime`, and `bufferCount` all flush the current partial buffer as a final emission before completing. That is why `bufferCount(3)` on 8 values ends with a 2-element array.

??? question "How would you get overlapping windows?"

    `bufferCount(size, startEvery)` with `startEvery < size`: `bufferCount(3, 1)` emits `[0,1,2]`, `[1,2,3]`, `[2,3,4]`, a sliding window over the stream. For the two-value special case, [`pairwise`](pairwise.md) is the idiomatic shortcut.

??? question "Are there other members of the family?"

    Yes: `bufferToggle(open$, closeSelector)` for windows with independent open and close signals, and `bufferWhen(closingSelector)` where each window's close condition is computed dynamically. The `window*` operators are the same idea but emit nested Observables instead of arrays.

## Related

- [pairwise](pairwise.md), a sliding buffer of exactly two values
- [sampleTime](../filtering/sampleTime.md) and [auditTime](../filtering/auditTime.md) when only the latest value matters
- [concatMap](concatMap.md) for processing released batches in order
