---
description: "The HTTP request patterns every Angular interview tests: state handling, sequencing, parallelism, cancellation, and resilience."
tags:
  - Angular
---

# HttpClient Patterns

`HttpClient` returns cold, single-emission Observables that complete after the response. That one sentence powers every pattern on this page, and most HTTP interview questions.

## Pattern 1: Loading / Error / Success State

Model the view state explicitly and drive it from one pipeline:

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { catchError, map, of, startWith } from "rxjs";

type State<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; data: T };

@Component({
  selector: "app-products",
  template: `
    @let s = state();
    @switch (s.status) {
      @case ("loading") {
        <p>Loading...</p>
      }
      @case ("error") {
        <p>Could not load products.</p>
      }
      @case ("loaded") {
        <p>{{ s.data.length }} products</p>
      }
    }
  `,
})
export class ProductsComponent {
  private readonly http = inject(HttpClient);

  protected readonly state = toSignal(
    this.http.get<string[]>("/api/products").pipe(
      map((data): State<string[]> => ({ status: "loaded", data })),
      catchError(() => of<State<string[]>>({ status: "error" })),
      startWith<State<string[]>>({ status: "loading" }),
    ),
    { requireSync: true },
  );
}
```

One stream, no boolean flag drift, exhaustive template handling. The pieces are explained on [startWith](../operators/combination/startWith.md) and [catchError](../operators/error-handling/catchError.md). For the narrow "fetch on param change with loading/error state" case, Angular's `httpResource` now provides this state machine out of the box; when that is enough, and when it is not, is covered on [RxJS or the Resource API?](rxjs-vs-resource.md)

## Pattern 2: Sequential (Dependent) Requests

When request B needs data from request A, chain with [`switchMap`](../operators/transformation/switchMap.md):

```typescript
readonly orders$ = this.route.paramMap.pipe(
  map((params) => params.get("userId")!),
  switchMap((userId) => this.http.get<User>(`/api/users/${userId}`)),
  switchMap((user) => this.http.get<Order[]>(`/api/orders`, { params: { customerId: user.customerId } }))
);
```

Each step cancels cleanly if the route changes mid-chain. Nested subscribes are the anti-pattern this replaces.

## Pattern 3: Parallel Requests

Independent requests should not wait for each other. [`forkJoin`](../operators/combination/forkJoin.md) runs them concurrently and emits once with all final results:

```typescript
readonly dashboard$ = forkJoin({
  profile: this.http.get<Profile>("/api/profile").pipe(catchError(() => of(null))),
  stats: this.http.get<Stats>("/api/stats").pipe(catchError(() => of(null))),
  news: this.http.get<News[]>("/api/news").pipe(catchError(() => of([]))),
});
```

Per-request `catchError` keeps one failure from discarding the other responses. For "results as they arrive" instead of "all at once", use [`mergeMap`](../operators/transformation/mergeMap.md) over the request list.

## Pattern 4: Cancellation

Unsubscribing from an `HttpClient` stream **aborts the underlying request**. You rarely call `unsubscribe` yourself; operators do it:

- `switchMap` cancels the stale request when a new trigger arrives (typeahead, route changes, refresh).
- `takeUntilDestroyed()` aborts in-flight requests when the user navigates away.
- [`exhaustMap`](../operators/transformation/exhaustMap.md) prevents duplicate requests instead of cancelling (submit buttons).

The triple-click-save scenario, which operator fires how many requests, is covered in the [mapping comparison](../comparisons/switchMap-mergeMap-concatMap.md).

## Pattern 5: Resilience (Timeout + Retry + Fallback)

The hardened request pipeline, in canonical order:

```typescript
readonly config$ = this.http.get<Config>("/api/config").pipe(
  timeout(5000), // each attempt gets 5s
  retry({
    count: 2,
    delay: (error, retryCount) =>
      isTransient(error) ? timer(500 * retryCount) : throwError(() => error),
  }),
  catchError(() => of(DEFAULT_CONFIG)) // final fallback
);
```

Order matters and is a classic question: [`timeout`](../operators/utility/timeout.md) inside so each retry attempt is bounded, [`retry`](../operators/error-handling/retry.md) before `catchError` so it sees raw errors, [`catchError`](../operators/error-handling/catchError.md) last as the safety net.

## Pattern 6: Share One Request Among Many Consumers

Cold means each subscriber re-runs the request. Cache deliberately:

```typescript
readonly currentUser$ = this.http.get<User>("/api/me").pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
```

Staleness, refresh triggers, and the completion caveat are on [shareReplay](../subjects/shareReplay.md).

## Common Mistakes

**Boolean flag soup.** `loading`, `error`, `data` as three independent properties drift out of sync on edge cases. A single discriminated-union state (Pattern 1) cannot represent impossible combinations.

**`forkJoin` with a source that never completes.** It waits for completion; one stray Subject input means it never emits. HTTP calls are safe inputs; live streams are not.

**Retrying everything.** A 400/404 will fail identically on every attempt. Gate the retry on error type, as in Pattern 5, and never retry non-idempotent writes blindly.

## Interview Q&A

??? question "How do you fetch data that depends on a previous response?"

    Chain `switchMap`s: route param → user → user's orders. Each stage maps a value to the next request, cancellation flows through the whole chain, and one `catchError` at the appropriate level handles failures. The wrong answer is nested subscribes.

??? question "Three API calls must all finish before rendering. What do you use and what is the failure mode?"

    `forkJoin` (dictionary form for named results). Failure mode one: any uncaught error kills the join, so catch per request. Failure mode two: a non-completing input means it never emits. `combineLatest` is the alternative when sources keep emitting.

??? question "Does Angular cancel HTTP requests when a component is destroyed?"

    Not by itself. Cancellation happens when the subscription is torn down: via `switchMap` replacing it, `takeUntilDestroyed`/async pipe on destroy, or manual unsubscribe. Unsubscribing an in-flight `HttpClient` request aborts it at the network layer.

## Related

- [Signals & RxJS Interop](signals-interop.md) for delivering these streams to templates
- [switchMap vs mergeMap vs concatMap vs exhaustMap](../comparisons/switchMap-mergeMap-concatMap.md) for the concurrency decision
- [Memory Leaks](memory-leaks.md) for the cleanup side of HTTP pipelines
