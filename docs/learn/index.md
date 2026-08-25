# Learn RxJS Fundamentals

Work through these topics in order. Each one builds on the previous, and together they give you the foundation every RxJS interview question rests on.

1. **[Observable](observable.md)**: the core building block. A stream of values over time, and how Angular uses it for HTTP, forms, and routing.
2. **[Observer](observer.md)**: the consumer side. The `next`, `error`, and `complete` callbacks that react to a stream.
3. **[Cold Observables](cold-observables.md)**: streams that start fresh for every subscriber, like an HTTP request.
4. **[Hot Observables](hot-observables.md)**: shared, live streams, like DOM events. Subscribe late and you miss earlier values.
5. **[Promise vs Observable](promise-vs-observable.md)**: single value vs stream, eager vs lazy, and why cancellation matters. A very common interview opener.

## After the fundamentals

- Move on to [operators](../operators/index.md) to learn how streams are transformed and combined.
- Read [Subjects & Multicasting](../subjects/index.md) to understand how one stream is shared between consumers.
- Use the [comparisons](../comparisons/index.md) for quick revision once the concepts are familiar.
