---
description: "Interleave several streams into one, first come, first served."
tags:
  - Operators
  - Combination
---

# merge

`merge()` subscribes to all the source Observables at once and forwards **every value from any of them** into a single output stream, in whatever order the values happen to arrive. Nothing is paired, buffered, or cancelled; it is a plain interleaving.

!!! abstract "At a glance"

    - **Signature:** `merge(a$, b$, ..., concurrent?)`
    - **Use when:** several independent triggers should feed one pipeline: refresh button + timer + route change
    - **Avoid when:** you need latest-value pairing (`combineLatest`) or strict source order (`concat`)
    - **Top gotcha:** an error in **any** source errors the merged stream; completion requires **all** sources to complete

## Minimal Example

```typescript
import { interval, map, merge, take } from "rxjs";

const slow$ = interval(1000).pipe(
  take(2),
  map((i) => `slow ${i}`),
);
const fast$ = interval(400).pipe(
  take(3),
  map((i) => `fast ${i}`),
);

merge(slow$, fast$).subscribe(console.log);

// fast 0   (400ms)
// fast 1   (800ms)
// slow 0   (1000ms)
// fast 2   (1200ms)
// slow 1   (2000ms) -> then complete (both sources done)
```

## Angular Example: Many Reasons, One Reload

A list should reload when the user clicks refresh, **or** every 60 seconds, **or** when filters change. One pipeline, three triggers:

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject, interval, map, merge, startWith, switchMap } from "rxjs";

@Component({
  selector: "app-order-list",
  imports: [ReactiveFormsModule],
  template: `
    <input [formControl]="filterControl" placeholder="Filter orders..." />
    <button (click)="refresh$.next()">Refresh</button>
    <ul>
      @for (order of orders(); track order) {
        <li>{{ order }}</li>
      }
    </ul>
  `,
})
export class OrderListComponent {
  private readonly http = inject(HttpClient);

  protected readonly filterControl = new FormControl("", { nonNullable: true });
  protected readonly refresh$ = new Subject<void>();

  protected readonly orders = toSignal(
    merge(
      this.refresh$, // manual trigger
      interval(60_000), // periodic trigger
      this.filterControl.valueChanges, // filter change trigger
    ).pipe(
      startWith(void 0), // initial load
      map(() => this.filterControl.value),
      switchMap((filter) =>
        this.http.get<string[]>("/api/orders", { params: { filter } }),
      ),
    ),
    { initialValue: [] },
  );
}
```

**How it works:** each trigger type stays independent and simple; `merge` funnels them into one stream, and `switchMap` guarantees only the latest reload wins. This "merge the reasons, switch on the work" shape is a staple of well-factored Angular data loading.

## Common Mistakes

**Confusing `merge` with `mergeMap`.** `merge` is a creation/combination function joining existing streams; `mergeMap` maps each value of one stream to inner streams. Related names, different jobs.

**Expecting completion when one source completes.** The merged stream completes only after **every** input completes. One infinite source (an `interval`) keeps the output alive forever.

**Ignoring error propagation.** Any source erroring kills the whole merged stream. Attach `catchError` per source if the others must survive a failure.

## Interview Q&A

??? question "merge vs combineLatest: when does each fit?"

    `merge` forwards raw values as they arrive; sources stay independent and you usually do not care which one fired. `combineLatest` synthesizes tuples of the latest value from every source; you care about combined state. Trigger fan-in wants `merge`; state derivation wants `combineLatest`.

??? question "What is the optional concurrent argument?"

    `merge(a$, b$, c$, 2)` subscribes to at most two sources at a time, subscribing to the next only when one completes, the same concurrency mechanism as `mergeMap`'s second argument.

??? question "How does merge behave with hot vs cold inputs?"

    It just subscribes to each input once. Cold inputs each start a fresh execution at merge-subscribe time; hot inputs are joined mid-stream. Merge adds no sharing of its own.

## Related

- [concat](concat.md) for sequential instead of interleaved joining
- [mergeMap](../transformation/mergeMap.md), the higher-order relative
- [combineLatest](combineLatest.md) for latest-value combination
