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
- **[HttpClient Patterns](http-patterns.md)**: loading/error/success state, sequential and parallel requests, cancellation, and resilient pipelines.
- **[Memory Leaks & Subscription Cleanup](memory-leaks.md)**: where leaks actually come from, how to find them, and the prevention toolbox.
- **[RxJS Anti-Patterns](anti-patterns.md)**: the habits that fail code reviews, each with its fix.

More guides are planned: reactive forms, router streams, interceptors and retry strategies, and caching. Track progress in the [project repository](https://github.com/AnkitSharma-007/rxjs-angular-interview-guide).

## RxJS everywhere else

Operator pages throughout this site use Angular examples: typeahead search with [`switchMap`](../operators/transformation/switchMap.md), double-submit protection with [`exhaustMap`](../operators/transformation/exhaustMap.md), and cached configuration with [`shareReplay`](../subjects/shareReplay.md).
