---
description: "The main RxJS operator categories and what each family is for."
tags:
  - Operators
---

# RxJS Operators

RxJS operators are functions that enable you to manipulate, combine, filter, and transform the data streams (Observables) in powerful ways. They take an Observable as input and return a new Observable.

Think of operators as tools in a workshop for working with your asynchronous data streams. Instead of listing every single operator (there are many!), it's helpful to understand the general **categories** they fall into, based on what they _do_:

## Creation Operators

- **Purpose:** To create new Observables from scratch or from existing data sources.
- **Examples:**

      - [`of`](creation/of.md): Creates an Observable that emits the provided values sequentially and then completes.
      - [`from`](creation/from.md): Converts arrays, promises, iterables, or strings into Observables.
      - [`fromEvent`](creation/fromEvent.md): Creates an Observable from DOM events. (Hot Observable)
      - [`defer`](creation/defer.md): Creates the actual Observable lazily, per subscriber, at subscription time.
      - [`interval`](creation/interval.md): Emits sequential numbers every specified interval (in milliseconds).
      - [`timer`](creation/timer.md): Emits one value after an initial delay, then optionally emits subsequent values at a regular interval.
      - [`throwError`](error-handling/throwError.md): Creates an Observable that immediately emits an error.
      - [`EMPTY`](creation/empty-never.md): Creates an Observable that emits no items and immediately completes.
      - [`NEVER`](creation/empty-never.md): Creates an Observable that never emits any items and never completes.

## Transformation Operators

- **Purpose:** To change the format, type, or value of items emitted by an Observable.
- **Examples:**

      - [`map`](transformation/map.md): Applies a function to each emitted value.
      - [`scan`](transformation/scan.md): Accumulates values over time, like `Array.reduce`, emitting each intermediate result.
      - [`mergeMap`](transformation/mergeMap.md): Projects each source value to an Observable and merges their emissions into a single stream. Good for handling multiple inner observables concurrently.
      - [`switchMap`](transformation/switchMap.md): Projects each source value to an Observable, but cancels the previous inner Observable when a new source value arrives. Ideal for scenarios like type-ahead searches where you only care about the latest request.
      - [`concatMap`](transformation/concatMap.md): Projects each source value to an Observable, but waits for the previous inner Observable to    complete before subscribing to the next one. Ensures order.
      - `bufferTime(1000)`: Collects emitted values into arrays over a specified time period.
      - `groupBy(item => item.category)`: Groups items emitted by the source Observable based on a key.

## Filtering Operators

- **Purpose:** To selectively emit values from a source Observable based on certain criteria.
- **Examples:**

      - [`filter`](filtering/filter.md): Emits only the values that satisfy a condition.
      - [`first`](filtering/first.md): Emits only the first value (or the first value satisfying a condition) and then completes.
      - [`last`](filtering/last.md): Emits only the last value (or the last value satisfying a condition) when the source completes.
      - [`take`](filtering/take.md): Emits the first N values and then completes.
      - [`takeUntil`](filtering/takeUntil.md): Emits values until a second `notifier$` Observable emits. Very useful for unsubscribing/completing streams    (e.g., when a component is destroyed).
      - [`skip`](filtering/skip.md): Skips the first N values.
      - [`debounceTime`](filtering/debounceTime.md): Emits a value only after a specified time has passed without another source emission. Useful for rate-limiting     input events (like search inputs).
      - [`throttleTime`](filtering/throttleTime.md): Emits a value, then ignores emissions during a cooldown window. Useful for steady-rate handling of scroll or mousemove events.
      - [`takeWhile`](filtering/takeWhile.md): Emits values while a predicate holds, then completes.
      - [`distinctUntilChanged`](filtering/distinctUntilChanged.md): Emits only when the current value is different from the previous one.

## Combination Operators

- **Purpose:** To combine multiple source Observables into a single Observable.
- **Examples:**

      - [`combineLatest`](combination/combineLatest.md): When _any_ source Observable emits, it combines the _latest_ values from _all_ sources and emits     the combined result (usually as an array). Requires all sources to have emitted at least once.
      - [`zip`](combination/zip.md): Combines values from source Observables pairwise. Waits for each source to emit a value at the corresponding     index before emitting the combined pair.
      - [`forkJoin`](combination/forkJoin.md): Waits for _all_ source Observables to _complete_ and then emits an array containing the _last_ value    emitted by each source. Good for running parallel asynchronous operations and getting all results at the end.
      - [`merge`](combination/merge.md): Subscribes to all source Observables and simply passes through any value emitted by _any_ of them as soon as     it arrives. Order depends on timing.
      - [`concat`](combination/concat.md): Subscribes to the first Observable, emits all its values, and _only then_ subscribes to the second    Observable, emits its values, and so on. Preserves order strictly.
      - [`startWith`](combination/startWith.md): Prepends an initial value that subscribers receive synchronously before the source emits.
      - `race(obs1$, obs2$)`: Mirrors the first Observable (either `obs1$` or `obs2$`) to emit a value. Ignores the other(s).

## Error Handling Operators

- **Purpose:** To gracefully handle errors that might occur in an Observable sequence.
- **Examples:**

      - [`catchError`](error-handling/catchError.md): Catches errors from the source Observable and either returns a replacement Observable (e.g., emitting a default value) or re-throws the error (or a new one).
      - [`retry`](error-handling/retry.md): Re-subscribes to the source Observable up to N times if it encounters an error.
      - [`retryWhen`](error-handling/retryWhen.md): Re-subscribes based on logic defined in a notifier Observable. Deprecated; prefer `retry` with a configuration object (`retry({ count, delay })`).

## Utility Operators

- **Purpose:** Miscellaneous operators useful for debugging, controlling timing, or other side effects.
- **Examples:**

      - [`tap`](utility/tap.md): Perform side effects (like logging) for each emission without modifying the stream itself. (Formerly known as `do`).
      - [`delay`](utility/delay.md): Delays the emission of each item by a specified time.
      - [`timeout`](utility/timeout.md): Emits an error if the source Observable doesn't emit a value within a specified time.
      - [`finalize`](utility/finalize.md): Executes a callback function when the source Observable completes or errors. Good for cleanup logic.
      - `toArray()`: Collects all source emissions into a single array and emits that array when the source completes.

## Multicasting Operators

- **Purpose:** To share a single subscription to an underlying Observable among multiple subscribers. This is key for turning Cold Observables Hot or optimizing shared resources.
- **Examples:**

      - [`share`](../subjects/share.md): Shares a single subscription but doesn't necessarily replay past values. Subscription starts with the first subscriber and stops when the last one unsubscribes.
      - [`shareReplay`](../subjects/shareReplay.md): Shares a single subscription _and_ replays the last `bufferSize` emissions to new subscribers. Often used with `bufferSize: 1` to share API calls. The underlying subscription might stay active even after subscribers leave, depending on configuration.
      - `connectable()`, `connect()`: Lower-level multicasting tools for more complex scenarios, often used with Subjects. They replace the older `publish()`/`multicast()` operators, which are deprecated.

## Conditional and Boolean Operators

- **Purpose:** To evaluate conditions across sequences or emit boolean values.
- **Examples:**

      - `every(x => x > 0)`: Emits `true` if all values satisfy the predicate, `false` otherwise, then completes.
      - `find(x => x === 5)`: Emits the first value that satisfies the predicate, then completes.
      - `isEmpty()`: Emits `true` if the source completes without emitting any values, `false` otherwise.
      - `defaultIfEmpty('default')`: Emits a default value if the source completes without emitting anything.

Understanding these categories helps you navigate the RxJS library and choose the right tool for transforming, filtering, combining, or managing your asynchronous data streams effectively in Angular applications.
