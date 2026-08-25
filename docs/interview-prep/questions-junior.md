---
description: "Junior-level RxJS interview questions with answers: Observables, Subjects, operators, and cleanup basics."
tags:
  - Interview Prep
---

# Junior Interview Questions

Fundamentals every Angular developer is expected to answer confidently. Read each question, answer out loud, then expand to compare. **Strong answers also mention** lines are what push a pass toward a hire.

??? question "1. What is an Observable?"

    A lazy stream of values delivered over time. Unlike a function (one value, now) or a Promise (one value, later), an Observable can emit zero to many values, and it does nothing until someone subscribes. In Angular, `HttpClient`, `valueChanges`, and router streams are all Observables.

    **Strong answers also mention:** laziness (no subscription, no work) and cancellation via unsubscribe.

    **Deep dive:** [Observable](../learn/observable.md)

??? question "2. What are the three notifications an Observer can receive?"

    `next` (a value, zero or more times), `error` (terminal failure, at most once), and `complete` (terminal success, at most once). After `error` or `complete`, nothing else is delivered.

    **Follow-up:** can both error and complete happen? No, they are mutually exclusive, per the [Observable contract](../learn/observable-contract.md).

    **Deep dive:** [Observer](../learn/observer.md)

??? question "3. What does subscribe() return and what is it for?"

    A `Subscription` object. Its `unsubscribe()` method stops the execution and runs the producer's cleanup (clearing timers, removing listeners, aborting HTTP requests).

    **Strong answers also mention:** unsubscribing does **not** fire the `complete` handler; only teardown and `finalize` run.

    **Deep dive:** [Subscription & Teardown](../learn/subscription.md)

??? question "4. What is the difference between a cold and a hot Observable?"

    Cold: the producer is created per subscriber, so each subscription gets a fresh, independent execution (`HttpClient`, `interval`). Hot: one shared producer exists regardless of subscribers, and late subscribers miss earlier values (DOM events, Subjects).

    **Follow-up:** why do two async pipes on the same HTTP stream fire two requests, and how do you fix it? Cold + unicast; share with `shareReplay`.

    **Deep dive:** [Cold](../learn/cold-observables.md) / [Hot](../learn/hot-observables.md)

??? question "5. What is an operator, and what does pipe() do?"

    An operator is a function that takes an Observable and returns a new Observable with transformed behavior; `pipe()` chains them left to right into a pipeline. Operators never modify the source; they wrap it.

    **Deep dive:** [RxJS Operators](../operators/index.md)

??? question "6. What is the difference between map and tap?"

    `map` transforms each value; its return value flows downstream. `tap` runs a side effect (logging, analytics) and ignores its return value; the original value passes through unchanged.

    **Deep dive:** [map](../operators/transformation/map.md), [tap](../operators/utility/tap.md)

??? question "7. of([1,2,3]) vs from([1,2,3]): what is the difference?"

    `of` emits its argument as-is: one emission, the whole array. `from` converts the array: three emissions, one per element. The rest of the pipeline behaves completely differently for each.

    **Deep dive:** [of](../operators/creation/of.md), [from](../operators/creation/from.md)

??? question "8. What is a Subject and how does it differ from a plain Observable?"

    A Subject is both Observable and Observer: you can push values in with `next()` and subscribe to it. It multicasts, one emission reaches all current subscribers, whereas a plain Observable is unicast: each subscriber triggers its own execution.

    **Strong answers also mention:** services should expose `subject.asObservable()`, keeping `next()` private.

    **Deep dive:** [Subject](../subjects/subject.md)

??? question "9. When do you choose BehaviorSubject over Subject?"

    When the stream models **state**: a BehaviorSubject requires an initial value and immediately gives every new subscriber the current value. A plain Subject gives late subscribers nothing until the next emission, which fits **events**, not state.

    **Follow-up:** what would an Angular signal change here? For synchronous state read by templates, a signal is usually simpler.

    **Deep dive:** [BehaviorSubject](../subjects/behaviorSubject.md), [comparison](../comparisons/subject-behaviorSubject-replaySubject.md)

??? question "10. What does the async pipe do, and why is it recommended?"

    It subscribes to the stream, exposes the latest value to the template, triggers change detection on emissions, and **unsubscribes automatically on destroy**. Less boilerplate and no forgotten-unsubscribe leaks.

    **Strong answers also mention:** each `| async` is its own subscription; two pipes on a cold source do the work twice.

    **Deep dive:** [Async Pipe](../angular/async-pipe.md)

??? question "11. Which subscriptions do you actually need to clean up in Angular?"

    Ones on sources that never complete: `interval`/`timer`, `fromEvent`, Subjects, `valueChanges`, `Router.events`. A plain `HttpClient` request emits once and completes, closing itself.

    **Follow-up:** name the cleanup options: async pipe / `toSignal`, `takeUntilDestroyed()`, `takeUntil(destroy$)`, manual `unsubscribe()`.

    **Deep dive:** [Memory Leaks](../angular/memory-leaks.md)

??? question "12. What is the difference between filter and take?"

    `filter` drops non-matching values but keeps the stream alive forever. `take(n)` lets the first n values through and then **completes** the stream, unsubscribing from the source.

    **Deep dive:** [filter](../operators/filtering/filter.md), [take](../operators/filtering/take.md)

??? question "13. What happens to a stream after it errors?"

    It is terminated: no more values, no completion, and the subscription is torn down. Recovery means replacing the stream (`catchError`) or resubscribing (`retry`), not resuming it.

    **Deep dive:** [The Observable Contract](../learn/observable-contract.md), [catchError](../operators/error-handling/catchError.md)

??? question "14. Why is RxJS used so heavily in Angular specifically?"

    The framework's async APIs are Observable-based: `HttpClient`, reactive forms, the router. Observables give Angular cancellation (aborting requests), composition (operators), and multicast tools that Promises lack, and the `async` pipe/`toSignal` integrate streams into templates safely.

    **Deep dive:** [Promise vs Observable](../learn/promise-vs-observable.md)

## Next Step

Comfortable with all of these? Move up to the [Mid-Level Questions](questions-mid.md).
