---
description: "Keep taking values while a condition holds, then complete."
tags:
  - Operators
  - Filtering
---

# takeWhile

`takeWhile()` mirrors the source **as long as each value satisfies a predicate**. The first value that fails the test completes the stream and unsubscribes from the source. With `inclusive: true`, that failing value is emitted before completion.

!!! abstract "At a glance"

    - **Signature:** `takeWhile(predicate, inclusive = false)`
    - **Use when:** a stream should end based on the **data itself**: poll while status is "processing", read while values are valid
    - **Avoid when:** the stop signal is external (`takeUntil`) or a fixed count (`take`)
    - **Top gotcha:** by default the terminating value is **not** emitted; polling loops usually need `inclusive: true` to see the final status

## Minimal Example

```typescript
import { from, takeWhile } from "rxjs";

from([2, 4, 6, 7, 8])
  .pipe(takeWhile((n) => n % 2 === 0))
  .subscribe({
    next: console.log,
    complete: () => console.log("done"),
  });

// 2, 4, 6, done   (7 fails the test: stream completes, 8 is never seen)
// with takeWhile(predicate, true) the output would include 7
```

## Angular Example: Polling Until a Job Finishes

Poll a long-running export job every 2 seconds, stop as soon as it leaves the "processing" state, and keep the final status:

```typescript
import { Component, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { switchMap, takeWhile, timer } from "rxjs";

interface JobStatus {
  state: "processing" | "done" | "failed";
  progress: number;
}

@Component({
  selector: "app-export-status",
  template: `
    @if (status(); as s) {
      <p>{{ s.state }} - {{ s.progress }}%</p>
    }
  `,
})
export class ExportStatusComponent {
  private readonly http = inject(HttpClient);
  protected readonly status = signal<JobStatus | null>(null);

  constructor() {
    timer(0, 2000)
      .pipe(
        switchMap(() => this.http.get<JobStatus>("/api/export/status")),
        // keep polling while processing; inclusive:true also emits
        // the final "done"/"failed" status before completing
        takeWhile((s) => s.state === "processing", true),
        takeUntilDestroyed(), // safety net if the user navigates away mid-poll
      )
      .subscribe((s) => this.status.set(s));
  }
}
```

**How it works:** the poll is a `timer` + `switchMap` loop; `takeWhile(..., true)` turns a business condition into stream completion, which cancels the timer via teardown. Without `inclusive: true`, the UI would stop at the last "processing" tick and never show "done".

## Common Mistakes

**Forgetting `inclusive: true`.** The default excludes the value that ends the stream, which is usually the one you care about (the terminal job status, the boundary reading).

**Using `takeWhile` as a filter.** `filter` skips non-matching values and keeps listening; `takeWhile` **ends the stream permanently** at the first non-match. `takeWhile((x) => x.enabled)` on a toggling stream is a classic accidental-completion bug.

**Choosing it for lifecycle teardown.** `takeWhile(() => this.alive)` only checks the flag when the source emits, so a silent stream lingers. Lifecycle cleanup belongs to `takeUntil`/`takeUntilDestroyed`, which act on an external signal immediately.

## Interview Q&A

??? question "takeWhile vs filter: what is the key behavioral difference?"

    `filter` is a gate: it drops non-matching values and the stream continues. `takeWhile` is a terminator: the first non-matching value completes the stream and unsubscribes from the source. One skips; the other stops.

??? question "takeWhile vs takeUntil: how do you choose?"

    By where the stop condition lives. In the **data** (poll while status is processing): `takeWhile`. In an **external event** (component destroyed, cancel clicked): `takeUntil(notifier$)`. They also pair nicely, as in the polling example.

??? question "Why is takeWhile(() => this.alive) considered an anti-pattern for unsubscribing?"

    The predicate is only evaluated when the source emits. A stream that goes quiet after the component dies keeps its subscription (and the captured component) alive indefinitely. `takeUntilDestroyed`/`takeUntil` complete immediately on the signal, regardless of source activity.

## Related

- [take](take.md) and [takeUntil](takeUntil.md), the count- and signal-based siblings
- [filter](filter.md) for skipping without completing
- [timer](../creation/timer.md) + [switchMap](../transformation/switchMap.md), the polling combo above
