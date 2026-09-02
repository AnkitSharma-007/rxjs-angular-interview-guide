---
description: "When Angular's resource, httpResource, and rxResource are enough, and when a hand-built RxJS pipeline is still the right answer."
tags:
  - Angular
  - Comparisons
---

# RxJS or the Resource API?

Angular ships a signals-native answer for async data: `resource`, its HTTP wrapper `httpResource`, and `rxResource`, which lives in `@angular/core/rxjs-interop`, the same package as `toSignal` and `takeUntilDestroyed`. Interviewers now follow any hand-built HTTP pipeline with the obvious question: **"why not just use `httpResource`?"** This page is the answer, and the decision rule behind it.

!!! abstract "At a glance"

    - **Resources win** for the narrow, common case: re-fetch when a parameter changes, expose `value()`, `isLoading()`, `error()`, and `status()` as signals
    - **RxJS wins** the moment anything is stream-shaped: debouncing, retry with backoff, cancellation you control, combining event sources, multicasting, or the stream itself as the value
    - **`rxResource`** is the bridge: an Observable-returning loader with resource semantics for the consumer
    - **Top gotcha:** resources solve *data fetching*; they do not replace RxJS's *event and time* toolbox

## What a resource gives you

A resource is a reactive fetch bound to signal inputs. When the `params` computation changes, the loader re-runs and the previous request is aborted:

```typescript
import { Component, inject, input } from "@angular/core";
import { httpResource } from "@angular/common/http";

@Component({
  selector: "app-user-detail",
  template: `
    @if (user.isLoading()) {
      <p>Loading...</p>
    } @else if (user.error()) {
      <p>Could not load user.</p>
    } @else if (user.hasValue()) {
      <p>{{ user.value().name }}</p>
    }
  `,
})
export class UserDetailComponent {
  readonly userId = input.required<number>();

  // re-fetches whenever userId changes; previous request is aborted
  protected readonly user = httpResource<{ name: string }>(
    () => `/api/users/${this.userId()}`,
  );
}
```

Compare that with the equivalent stream on the [HttpClient patterns](http-patterns.md) page: `toObservable` + `switchMap` + a discriminated-union state + `toSignal`. The resource version is shorter, and the loading/error state comes built in (`status()` reports `idle`, `loading`, `reloading`, `resolved`, `local`, or `error`). It also has `reload()` for the refresh-trigger case that [Caching](caching.md) Level 2 builds by hand with a `Subject` + `switchMap`, and it supports server-side rendering caching through a stable `id`.

**For "fetch this when that changes, and show me loading and error state", the resource is enough.** Reaching for RxJS there is no longer the strongest answer; knowing that is part of the interview.

## Where RxJS stays the right tool

Everything stream-shaped sits outside the resource model:

| Need                                     | Why a resource cannot                             | RxJS tool                                                                                                           |
| ---------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Debounce user input before fetching      | `params` reacts to every change immediately       | [`debounceTime`](../operators/filtering/debounceTime.md)                                                            |
| Retry with backoff, gated by error type  | Loader failure goes straight to `error()`         | [`retry({ count, delay })`](../operators/error-handling/retry.md)                                                   |
| Queue or drop bursts (saves, submits)    | One loader per params change, latest wins, always | [`concatMap`](../operators/transformation/concatMap.md) / [`exhaustMap`](../operators/transformation/exhaustMap.md) |
| Combine several live sources             | Resources track one params computation            | [`combineLatest`](../operators/combination/combineLatest.md), [`merge`](../operators/combination/merge.md)          |
| Share one execution among many consumers | Each resource owns its own loader                 | [`shareReplay`](../subjects/shareReplay.md)                                                                         |
| Continuous streams (WebSockets, events)  | The loader resolves once per request              | Subjects, [`fromEvent`](../operators/creation/fromEvent.md), `resource`'s `stream` option for simple cases          |

The interview framing: a resource replaces the **last step** of many pipelines (fetch + expose state), never the **middle** (time, ordering, combination, sharing). The site's typeahead pipeline survives intact: debounce, `distinctUntilChanged`, and cancellation semantics are stream concerns.

## rxResource, the bridge

When the loader is naturally an Observable (an existing service method, a stream with retry logic baked in) but the consumer wants resource semantics:

```typescript
import { rxResource } from "@angular/core/rxjs-interop";

protected readonly user = rxResource({
  params: () => ({ id: this.userId() }),
  stream: ({ params }) =>
    this.api.getUser(params.id).pipe(retry({ count: 2, delay: 1000 })),
});
```

The pipeline keeps its RxJS powers; the template gets `value()`, `isLoading()`, and `error()`. This is often the honest best-of-both answer.

## Interview Q&A

??? question "Why not just use httpResource for the typeahead search?"

    Because typeahead is mostly not a fetching problem. The pipeline needs debouncing (a resource's `params` reacts to every keystroke instantly) and deliberate cancellation of the settled-but-stale request. A resource does abort on params changes, but it cannot debounce, dedupe, or throttle them. The strong answer: debounce and shape the stream with RxJS, then hand the final fetch to `rxResource`, or keep `switchMap` + `toSignal`.

??? question "When would you actively choose a resource over a stream?"

    Parameter-driven reads with standard loading/error UI: detail pages keyed by a route param or input signal, dashboards re-fetching on filter changes. The resource's abort-on-change covers the stale-response problem, `reload()` covers refresh, and there is less code to review.

??? question "Does the Resource API make shareReplay-style caching obsolete?"

    No. A resource is owned by its consumer; two components creating resources for the same URL fetch twice. Sharing one execution across consumers is still multicasting: a service exposing a `shareReplay` stream, or a service-owned resource that everyone reads.

## Related

- [HttpClient Patterns](http-patterns.md), the stream versions of these flows
- [Caching](caching.md), where `reload()` maps to the refresh-trigger design
- [Signals & RxJS Interop](signals-interop.md) for the rest of the interop package
