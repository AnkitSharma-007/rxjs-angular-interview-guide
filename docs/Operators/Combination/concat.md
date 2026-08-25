---
description: "Run streams one after another: each must complete before the next starts."
tags:
  - Operators
  - Combination
---

# concat

`concat()` subscribes to its source Observables **strictly one at a time, in the order given**. It emits everything from the first source; only when that source **completes** does it subscribe to the second, and so on.

!!! abstract "At a glance"

    - **Signature:** `concat(a$, b$, ...)`
    - **Use when:** sequences must run in order: cached value then fresh data, intro animation then content
    - **Avoid when:** sources are independent and can interleave (`merge`)
    - **Top gotcha:** a source that never completes blocks every source after it, forever

## Minimal Example

```typescript
import { concat, of } from "rxjs";

concat(of(1, 2), of(3, 4)).subscribe({
  next: console.log,
  complete: () => console.log("done"),
});

// 1, 2, 3, 4, done   (second source starts only after the first completes)
```

## Angular Example: Cache-Then-Network

Show cached data instantly, then replace it with fresh data from the API, in one stream:

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { concat, of, tap } from "rxjs";

interface Dashboard {
  revenue: number;
  fromCache?: boolean;
}

@Component({
  selector: "app-dashboard",
  template: `
    @if (data(); as d) {
      <p>Revenue: {{ d.revenue }} {{ d.fromCache ? "(cached)" : "" }}</p>
    } @else {
      <p>Loading...</p>
    }
  `,
})
export class DashboardComponent {
  private readonly http = inject(HttpClient);
  private readonly cache = this.readCache();

  protected readonly data = toSignal(
    concat(
      // 1st: emit the cached snapshot (of() completes immediately)
      of(this.cache).pipe(tap(() => console.log("served from cache"))),
      // 2nd: starts only after the cache emission completes
      this.http.get<Dashboard>("/api/dashboard"),
    ),
    { initialValue: null },
  );

  private readCache(): Dashboard {
    return { revenue: 0, fromCache: true }; // e.g. from localStorage
  }
}
```

**How it works:** the template renders the cached value on the first change-detection pass, then re-renders when the HTTP response replaces it. Because `of()` completes instantly and `HttpClient` completes after one emission, the whole stream completes cleanly.

## Common Mistakes

**Putting a non-completing stream first.** `concat(subject$, http$)` never reaches the HTTP call, because the Subject never completes. Every source before the last must be finite.

**Expecting later sources to be "recorded" while waiting.** Cold sources are simply not subscribed yet, so nothing is lost. But a **hot** source placed later is joined live when its turn comes; anything it emitted earlier is gone.

**Confusing `concat` with `concatMap`.** `concat` glues existing Observables together once; `concatMap` maps **each value** of a source to an inner Observable and queues them. Sequential gluing vs sequential mapping.

## Interview Q&A

??? question "concat vs merge in one sentence each?"

    `concat`: one source at a time, in order, each must complete before the next begins. `merge`: all sources at once, values interleaved by arrival time.

??? question "How would you implement cache-then-network with RxJS?"

    `concat(of(cachedValue), http.get(url))`: the cached value renders immediately, the network value replaces it when it arrives, and ordering is guaranteed because `of` completes before the request begins. Add `distinctUntilChanged` if identical values should not re-render.

??? question "What happens if the first source errors?"

    The error propagates immediately and the remaining sources are never subscribed. Per-source `catchError` (mapping to a fallback that completes) keeps the sequence going.

## Related

- [merge](merge.md) for parallel interleaving
- [concatMap](../transformation/concatMap.md), the per-value sequential relative
- [startWith](startWith.md), which is essentially a tiny concat with a synchronous first value
