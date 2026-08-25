---
description: "Route params, router events, and why component reuse makes switchMap mandatory."
tags:
  - Angular
---

# Router & RxJS

The router speaks RxJS in two places: **`ActivatedRoute`** exposes the current route's params, query params, and data as Observables, and **`Router.events`** streams the navigation lifecycle. Both power patterns interviews return to constantly, because they hide a component-reuse subtlety that breaks naive code.

!!! abstract "At a glance"

    - **`route.paramMap` / `queryParamMap` / `data`:** long-lived streams that emit again when the params change **without recreating the component**
    - **`router.events`:** an app-lived stream of navigation events; filter for the ones you need
    - **Top gotcha:** navigating from `/users/1` to `/users/2` **reuses** the component instance; code that fetches once in `ngOnInit` shows stale data

## The Canonical Pattern: paramMap + switchMap

```typescript
import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map, switchMap } from "rxjs";

@Component({
  selector: "app-user-detail",
  template: `
    @if (user(); as u) {
      <h2>{{ u.name }}</h2>
    } @else {
      <p>Loading...</p>
    }
  `,
})
export class UserDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  protected readonly user = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get("id")),
      filter((id): id is string => id !== null),
      // new id -> new request; stale in-flight request cancelled
      switchMap((id) => this.http.get<{ name: string }>(`/api/users/${id}`)),
    ),
  );
}
```

Why this exact shape:

1. **`paramMap` is a stream, not a snapshot.** When the user navigates from `/users/1` to `/users/2`, Angular reuses the component and pushes a new param map. A one-shot `route.snapshot.paramMap` read in `ngOnInit` misses the change entirely, the single most common router bug.
2. **[`switchMap`](../operators/transformation/switchMap.md)** cancels the request for user 1 if the user navigates to user 2 before it lands: no stale-response race.
3. **`toSignal`** hands the result to the template and cleans up on destroy.

## Router Events: Global Loading Indicator

`Router.events` emits every lifecycle event; filter down to what you need:

```typescript
import { Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { filter, map } from "rxjs";

@Component({
  selector: "app-loading-bar",
  template: `@if (navigating()) {
    <div class="loading-bar"></div>
  }`,
})
export class LoadingBarComponent {
  private readonly router = inject(Router);

  protected readonly navigating = toSignal(
    this.router.events.pipe(
      filter(
        (e) =>
          e instanceof NavigationStart ||
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError,
      ),
      map((e) => e instanceof NavigationStart), // true while a navigation is running
    ),
    { initialValue: false },
  );
}
```

## One Lifecycle Nuance Worth Knowing

- **`ActivatedRoute` streams** (`paramMap`, `data`, ...) are scoped to the route: Angular completes them when the route is destroyed, so they rarely leak by themselves. (Chained work like the HTTP call above still benefits from `toSignal`/`takeUntilDestroyed` cleanup.)
- **`Router.events`** belongs to the app-lived `Router` service and **never completes**. Subscriptions to it from components absolutely need [teardown](memory-leaks.md).

## Common Mistakes

**Reading `snapshot` for data that can change in place.** Snapshots are fine for guards and one-shot reads on routes that always recreate. For detail pages reachable from sibling params, subscribe to the stream.

**`mergeMap` on param changes.** Two rapid navigations produce two racing requests, and the slower (stale) one can render last. Latest-wins navigation data is `switchMap` territory.

**Filtering router events by string or forgetting to filter at all.** `events` emits many event types per navigation; `instanceof` filters (as above) keep the pipeline typed and cheap.

## Interview Q&A

??? question "Why does a user-detail page show the old user after navigating to a sibling route?"

    Route reuse: same component instance, no new `ngOnInit`. The param change arrives only through the `paramMap` stream. The fix is the canonical `paramMap.pipe(switchMap(fetch))` pipeline, which also cancels the stale request.

??? question "Do ActivatedRoute subscriptions need manual cleanup?"

    The route-scoped streams complete when their route is destroyed, so bare subscriptions to them are mostly self-cleaning. Streams you derive from them that hop to other sources (HTTP, timers), and anything on `Router.events`, follow the normal cleanup rules.

??? question "How would you drive a global progress bar from the router?"

    Map `Router.events` to a boolean: `NavigationStart` → true; `NavigationEnd`/`NavigationCancel`/`NavigationError` → false; expose via `toSignal`. Filtering with `instanceof` and handling the cancel/error cases is what separates a complete answer.

## Related

- [switchMap](../operators/transformation/switchMap.md), the heart of the param pattern
- [Memory Leaks](memory-leaks.md) for the Router.events cleanup rule
- [HttpClient Patterns](http-patterns.md) for what happens after the param arrives
