---
description: "Patterns for using RxJS well inside Angular applications."
tags:
  - Angular
---

# Angular + RxJS

RxJS is woven into Angular: `HttpClient` returns Observables, reactive forms expose `valueChanges`, the router streams events, and the `async` pipe subscribes for you. This section covers the patterns that make RxJS work well inside Angular applications.

## Guides

- **[Async Pipe](async-pipe.md)**: let the template subscribe and unsubscribe for you, and avoid the most common source of memory leaks.
- **[Signals & RxJS Interop](signals-interop.md)**: `toSignal`, `toObservable`, and deciding when signals replace RxJS.
- **[RxJS or the Resource API?](rxjs-vs-resource.md)**: when `resource`/`httpResource` are enough, when streams win, and `rxResource` as the bridge.
- **[HttpClient Patterns](http-patterns.md)**: loading/error/success state, sequential and parallel requests, cancellation, and resilient pipelines.
- **[Reactive Forms](reactive-forms.md)**: `valueChanges` pipelines for debounced search, autosave, and dependent fields.
- **[Router](router.md)**: `paramMap` + `switchMap`, router events, and the component-reuse gotcha.
- **[Interceptors & Retries](interceptors-retry.md)**: functional interceptors, retry strategies, and the three-layer error model.
- **[Caching](caching.md)**: `shareReplay` caches, refresh triggers, per-key maps, TTL, and stale-while-revalidate.
- **[Memory Leaks & Subscription Cleanup](memory-leaks.md)**: where leaks actually come from, how to find them, and the prevention toolbox.
- **[RxJS Anti-Patterns](anti-patterns.md)**: the habits that fail code reviews, each with its fix.

## RxJS everywhere else

Operator pages throughout this site use Angular examples: typeahead search with [`switchMap`](../operators/transformation/switchMap.md), double-submit protection with [`exhaustMap`](../operators/transformation/exhaustMap.md), and cached configuration with [`shareReplay`](../subjects/shareReplay.md).
