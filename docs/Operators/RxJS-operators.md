RxJS operators are functions that enable you to manipulate, combine, filter, and transform the data streams (Observables) in powerful ways. They take an Observable as input and return a new Observable.

Think of operators as tools in a workshop for working with your asynchronous data streams. Instead of listing every single operator (there are many!), it's helpful to understand the general **categories** they fall into, based on what they _do_:

## Creation Operators

- **Purpose:** To create new Observables from scratch or from existing data sources.
- **Examples:**

      - [`of`](../Operators/Creation/of.md): Creates an Observable that emits the provided values sequentially and then completes.
      - [`from`](../Operators/Creation/from.md): Converts arrays, promises, iterables, or strings into Observables.
      - `fromEvent`: Creates an Observable from DOM events. (Hot Observable)
      - [`interval`](../Operators/Creation/interval.md): Emits sequential numbers every specified interval (in milliseconds).
      - [`timer`](../Operators/Creation/timer.md): Emits one value after an initial delay, then optionally emits subsequent values at a regular interval.
      - `throwError(() => new Error('Oops!'))`: Creates an Observable that immediately emits an error.
      - [`EMPTY`](../Operators//Creation/empty-never.md): Creates an Observable that emits no items and immediately completes.
      - [`NEVER`](../Operators//Creation/empty-never.md): Creates an Observable that never emits any items and never completes.

## Transformation Operators

- **Purpose:** To change the format, type, or value of items emitted by an Observable.
- **Examples:**

      - [`map`](../Operators/Transformation/map.md): Applies a function to each emitted value.
      - `pluck('propertyName')`: Selects a nested property from each emitted object.
      - `scan((acc, value) => acc + value, 0)`: Accumulates values over time, like `Array.reduce`.
      - [`mergeMap`](../Operators/Transformation/mergeMap.md): Projects each source value to an Observable and merges their emissions into a single stream. Good for handling multiple inner observables concurrently.
      - [`switchMap`](../Operators/Transformation/switchMap.md): Projects each source value to an Observable, but cancels the previous inner Observable when a new source value arrives. Ideal for scenarios like type-ahead searches where you only care about the latest request.
      - [`concatMap`](../Operators/Transformation/concatMap.md): Projects each source value to an Observable, but waits for the previous inner Observable to    complete before subscribing to the next one. Ensures order.
      - `bufferTime(1000)`: Collects emitted values into arrays over a specified time period.
      - `groupBy(item => item.category)`: Groups items emitted by the source Observable based on a key.

## Filtering Operators

- **Purpose:** To selectively emit values from a source Observable based on certain criteria.
- **Examples:**

      - [`filter`](../Operators/Filtering/filter.md): Emits only the values that satisfy a condition.
      - [`first`](../Operators/Filtering/first.md): Emits only the first value (or the first value satisfying a condition) and then completes.
      - [`last`](../Operators/Filtering/last.md): Emits only the last value (or the last value satisfying a condition) when the source completes.
      - [`take`](../Operators/Filtering/take.md): Emits the first N values and then completes.
      - [`takeUntil`](../Operators/Filtering/takeUntil.md): Emits values until a second `notifier$` Observable emits. Very useful for unsubscribing/completing streams    (e.g., when a component is destroyed).
      - [`skip`](../Operators/Filtering/skip.md): Skips the first N values.
      - [`debounceTime`](../Operators/Filtering/debounceTime.md): Emits a value only after a specified time has passed without another source emission. Useful for rate-limiting     input events (like search inputs).
      - [`distinctUntilChanged`](../Operators/Filtering/distinctUntilChanged.md): Emits only when the current value is different from the previous one.

## Combination Operators

- **Purpose:** To combine multiple source Observables into a single Observable.
- **Examples:**

      - [`combineLatest`](../Operators/Combination/combineLatest.md): When _any_ source Observable emits, it combines the _latest_ values from _all_ sources and emits     the combined result (usually as an array). Requires all sources to have emitted at least once.
      - [`zip`](../Operators/Combination/zip.md): Combines values from source Observables pairwise. Waits for each source to emit a value at the corresponding     index before emitting the combined pair.
      - [`forkJoin`](../Operators/Combination/forkJoin.md): Waits for _all_ source Observables to _complete_ and then emits an array containing the _last_ value    emitted by each source. Good for running parallel asynchronous operations and getting all results at the end.
      - `merge(obs1$, obs2$)`: Subscribes to all source Observables and simply passes through any value emitted by _any_ of them as soon as     it arrives. Order depends on timing.
      - `concat(obs1$, obs2$)`: Subscribes to the first Observable, emits all its values, and _only then_ subscribes to the second    Observable, emits its values, and so on. Preserves order strictly.
      - `race(obs1$, obs2$)`: Mirrors the first Observable (either `obs1$` or `obs2$`) to emit a value. Ignores the other(s).

## Error Handling Operators

- **Purpose:** To gracefully handle errors that might occur in an Observable sequence.
- **Examples:**

      - [`catchError`](../Operators/Error/catchError.md): Catches errors from the source Observable and either returns a replacement Observable (e.g., emitting a default value) or re-throws the error (or a new one).
      - [`retry`](../Operators/Error/retry.md): Re-subscribes to the source Observable up to N times if it encounters an error.
      - [`retryWhen`](../Operators/Error/retryWhen.md): Re-subscribes based on logic defined in a notifier Observable (e.g., retry after a delay).

## Utility Operators

- **Purpose:** Miscellaneous operators useful for debugging, controlling timing, or other side effects.
- **Examples:**

      - [`tap`](../Operators/Utility/tap.md): Perform side effects (like logging) for each emission without modifying the stream itself. (Formerly known as `do`).
      - [`delay`](../Operators/Utility/delay.md): Delays the emission of each item by a specified time.
      - [`timeout`](../Operators/Utility/timeout.md): Emits an error if the source Observable doesn't emit a value within a specified time.
      - [`finalize`](../Operators/Utility/finalize.md): Executes a callback function when the source Observable completes or errors. Good for cleanup logic.
      - `toArray()`: Collects all source emissions into a single array and emits that array when the source completes.

## Multicasting Operators

- **Purpose:** To share a single subscription to an underlying Observable among multiple subscribers. This is key for turning Cold Observables Hot or optimizing shared resources.
- **Examples:**

      - [`share`](../Operators/Multicasting/share.md): Shares a single subscription but doesn't necessarily replay past values. Subscription starts with the first subscriber and stops when the last one unsubscribes.
      - [`shareReplay`](../Operators/Multicasting/shareReplay.md): Shares a single subscription _and_ replays the last `bufferSize` emissions to new subscribers. Often used with `bufferSize: 1` to share API calls. The underlying subscription might stay active even after subscribers leave, depending on configuration.
      - `publish()`, `multicast()`: Lower-level operators for more complex multicasting scenarios, often used with Subjects.

## Conditional and Boolean Operators

- **Purpose:** To evaluate conditions across sequences or emit boolean values.
- **Examples:**

      - `every(x => x > 0)`: Emits `true` if all values satisfy the predicate, `false` otherwise, then completes.
      - `find(x => x === 5)`: Emits the first value that satisfies the predicate, then completes.
      - `isEmpty()`: Emits `true` if the source completes without emitting any values, `false` otherwise.
      - `defaultIfEmpty('default')`: Emits a default value if the source completes without emitting anything.

Understanding these categories helps you navigate the RxJS library and choose the right tool for transforming, filtering, combining, or managing your asynchronous data streams effectively in Angular applications.
