---
description: "Single value vs stream, eager vs lazy, cancellation and operators: the classic interview comparison."
tags:
  - Fundamentals
---

# Promise vs Observable

Let's break down the key differences between Observables (from RxJS) and Promises (native JavaScript). While both deal with asynchronous operations, they have fundamental differences in how they work and what they're capable of.

Here's a comparison table and explanations:

| Feature             | Promise                                       | Observable                                           |
| :------------------ | :-------------------------------------------- | :--------------------------------------------------- |
| **Values Emitted**  | **One** value (or one rejection)              | **Multiple** values over time (or error/complete)    |
| **Execution**       | **Eager**: Starts immediately upon creation   | **Lazy**: Starts only when subscribed to             |
| **Cancellable?**    | **No** (standard Promises aren't cancellable) | **Yes** (via Unsubscription)                         |
| **Operators**       | Limited (`.then()`, `.catch()`, `.finally()`) | **Rich set** of operators (map, filter, retry, etc.) |
| **Use Cases**       | Single async events (HTTP requests, timers)   | Streams of events, complex async flows, state        |
| **Primary Library** | Native JavaScript ES6+                        | RxJS library (often used with Angular)               |

## Explanation of Differences

1.  **Single vs. Multiple Values:**
    - **Promise:** Designed to handle a single asynchronous event that will eventually succeed (resolve with a value) or fail (reject with an error). Once a Promise settles (resolves or rejects), it's done. It will never emit another value.
      - _Analogy:_ Ordering a specific package online. You wait, and eventually, you get _that one package_ (resolve) or a notification it couldn't be delivered (reject). The transaction is then over.
    - **Observable:** Represents a stream or sequence of values arriving over time. It can emit zero, one, or multiple values. It can also signal an error or completion.
      - _Analogy:_ Subscribing to a newsletter or a YouTube channel. You might receive _multiple emails/videos_ over days or weeks (multiple `next` emissions). You could also get an error notification, or the channel might eventually stop publishing (complete).

2.  **Eager vs. Lazy Execution:**
    - **Promise:** A Promise starts executing its asynchronous operation the moment it is _created_. Calling `.then()` doesn't trigger the operation; it just registers what to do _when_ the already-running operation finishes.
      - _Example:_ `const myPromise = new Promise(/* executor starts now */);`
    - **Observable:** An Observable is lazy. The code inside it (e.g., the function making an HTTP call) doesn't run until someone actually _subscribes_ to it using `.subscribe()`. Each subscription typically triggers a new, independent execution. (Operators like `shareReplay` modify this to share executions).
      - _Example:_ `const myObservable = new Observable(/* code here runs only on subscribe */); myObservable.subscribe(); // Execution starts now.`

3.  **Cancellable:**
    - **Promise:** Standard Promises don't have a built-in `.cancel()` method. Once you create a Promise and its operation starts, there's no standard way to tell it, "Stop what you're doing, I don't need the result anymore." (Though browser APIs like `AbortController` can sometimes be used to cancel the _underlying operation_, like an `fetch` request, which then causes the Promise to reject).
    - **Observable:** Observables are cancellable via their `Subscription` object. When you `subscribe()`, you get back a `Subscription`. Calling `subscription.unsubscribe()` signals to the Observable that the subscriber is no longer interested. This often triggers cleanup logic within the Observable (like clearing intervals or cancelling HTTP requests via `takeUntilDestroyed` or similar mechanisms) and stops further emissions to that subscriber.

4.  **Operators:**
    - **Promise:** Has basic chaining with `.then()` (for success), `.catch()` (for error), and `.finally()` (for cleanup). You can also use `Promise.all()`, `Promise.race()`, etc., for combining promises.
    - **Observable:** Comes with the vast RxJS library of operators (`map`, `filter`, `reduce`, `retry`, `retryWhen`, `debounceTime`, `switchMap`, `mergeMap`, `combineLatest`, `withLatestFrom`, `shareReplay`, `timeout`, `find`, `delay`, `tap`, etc.). These operators allow for powerful manipulation, combination, and control of asynchronous data streams in a declarative way.

## When to Use Which (General Guidelines)

**Use Promises when:**

- You're dealing with a single, one-off asynchronous operation (like a typical HTTP GET or POST request where you expect one response).
- You're working with native browser APIs or libraries that return Promises.
- The complexity doesn't warrant pulling in the full RxJS library.

**Use Observables when:**

- You need to handle streams of data arriving over time (WebSocket messages, user input events like keystrokes or mouse movements, repeated interval emissions).
- You need the advanced transformation, combination, or control capabilities provided by RxJS operators (retrying, debouncing, throttling, complex filtering/mapping, etc.).
- You need the ability to cancel asynchronous operations cleanly.
- You are working heavily within the Angular framework, which uses Observables extensively (e.g., `HttpClient`, `Router` events, `EventEmitter`).

In modern Angular, while you _can_ use Promises, Observables are generally preferred for asynchronous operations, especially when dealing with framework features or requiring more complex stream manipulation, due to their power, flexibility, and cancellable nature.

## Converting Between Them

- **Promise to Observable:** [`from(promise)`](../operators/creation/from.md). Remember the promise is still eager and non-cancellable underneath.
- **Observable to Promise:** `firstValueFrom(obs$)` resolves with the first emission; `lastValueFrom(obs$)` waits for completion and resolves with the final value. Both reject if the source errors, or completes without a value. The old `.toPromise()` method is deprecated and slated for removal in the next major version; it still exists in current RxJS, but knowing its replacements is an easy interview win.

## Interview Q&A

??? question "What are the three biggest differences between a Promise and an Observable?"

    Value count (one settle vs many emissions), execution model (eager on creation vs lazy per subscription), and cancellation (none vs unsubscribe-driven teardown). Operators and multicasting come right behind as follow-ups.

??? question "How do you convert an Observable to a Promise in current RxJS, and what happened to toPromise()?"

    `firstValueFrom` and `lastValueFrom`. `toPromise()` is deprecated and slated for removal in the next major version (it still works today), partly because its behavior on empty completion (resolving with `undefined`) was ambiguous; `lastValueFrom` rejects with `EmptyError` instead, making the empty case explicit.

??? question "Can a Promise be cancelled?"

    Not by the Promise API itself. You can abort the underlying operation with `AbortController` (for `fetch`), which rejects the promise, but the promise abstraction has no unsubscribe. Observables build cancellation into the model: unsubscribing runs producer teardown, which is how `HttpClient` aborts requests under `switchMap`.

## Next Up

- [Cold Observables](cold-observables.md): laziness and per-subscriber execution in depth
- [from](../operators/creation/from.md): bringing promises into RxJS pipelines
- [switchMap](../operators/transformation/switchMap.md): cancellation put to work
