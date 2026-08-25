# Angular + RxJS

RxJS is woven into Angular: `HttpClient` returns Observables, reactive forms expose `valueChanges`, the router streams events, and the `async` pipe subscribes for you. This section covers the patterns that make RxJS work well inside Angular applications.

## Guides

- **[Async Pipe](async-pipe.md)**: let the template subscribe and unsubscribe for you, and avoid the most common source of memory leaks.

More Angular-focused guides are planned for this section, including subscription management, signals interop (`toSignal` / `toObservable`), HTTP patterns, and common anti-patterns. Track progress in the [project repository](https://github.com/AnkitSharma-007/rxjs-angular-interview-guide).

## RxJS everywhere else

Operator pages throughout this site use Angular examples: typeahead search with [`switchMap`](../operators/transformation/switchMap.md), double-submit protection with [`exhaustMap`](../operators/transformation/exhaustMap.md), and cached configuration with [`shareReplay`](../subjects/shareReplay.md).
