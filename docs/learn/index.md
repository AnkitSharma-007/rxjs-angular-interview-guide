---
description: "An ordered path through the RxJS fundamentals every Angular interview builds on."
tags:
  - Fundamentals
---

# Learn RxJS Fundamentals

Work through these topics in order. Each one builds on the previous, and together they give you the foundation every RxJS interview question rests on.

1. **[Observable](observable.md)**: the core building block. A stream of values over time, and how Angular uses it for HTTP, forms, and routing.
2. **[Observer](observer.md)**: the consumer side. The `next`, `error`, and `complete` callbacks that react to a stream.
3. **[Subscription & Teardown](subscription.md)**: what `subscribe()` returns, what `unsubscribe()` really does, and Angular's cleanup toolbox.
4. **[The Observable Contract](observable-contract.md)**: the `next* (error | complete)?` grammar every stream obeys, and why operators rely on it.
5. **[Cold Observables](cold-observables.md)**: streams that start fresh for every subscriber, like an HTTP request.
6. **[Hot Observables](hot-observables.md)**: shared, live streams, like DOM events. Subscribe late and you miss earlier values.
7. **[Unicast vs Multicast](unicast-vs-multicast.md)**: the precise vocabulary behind cold and hot, and how sharing actually works.
8. **[Promise vs Observable](promise-vs-observable.md)**: single value vs stream, eager vs lazy, and why cancellation matters. A very common interview opener.
9. **[Schedulers, observeOn & subscribeOn](schedulers.md)**: who decides when stream code runs, and the one place it really matters: testing with virtual time. An advanced topic; safe to save for last.

## After the fundamentals

- Move on to [operators](../operators/index.md) to learn how streams are transformed and combined.
- Read [Subjects & Multicasting](../subjects/index.md) to understand how one stream is shared between consumers.
- Use the [comparisons](../comparisons/index.md) for quick revision once the concepts are familiar.
