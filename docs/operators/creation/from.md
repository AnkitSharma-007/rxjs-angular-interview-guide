---
description: "Convert arrays, promises, and iterables into Observables."
tags:
  - Operators
  - Creation
---

# from

The `from()` operator is another **creation operator**, but its main purpose is to **convert** various other types of objects and data structures into an Observable. It's versatile and can handle things like:

- Arrays (or array-like objects like `NodeList`, `arguments`)
- Iterables (like `Map`, `Set`, or strings)
- Promises
- Other Observables (though this is less common as you usually just use the Observable directly)

When given an array or iterable, `from()` emits each item from that collection one by one, in order, and then completes. When given a Promise, it waits for the Promise to resolve, emits the resolved value as its single `next` notification, and then completes. If the Promise rejects, `from()` emits an error notification.

!!! abstract "At a glance"

    - **Signature:** `from(input)` where input is an array, iterable, promise, or Observable-like
    - **Use when:** converting existing data structures or promise-based APIs into streams
    - **Avoid when:** you want the array emitted as one value (`of`) or lazy execution (`defer`)
    - **Top gotcha:** promises are eager; the work starts when the promise is created, and unsubscribing does **not** cancel it

## Key Characteristics

- **Conversion:** Its primary role is converting something _else_ into an Observable.
- **Single Argument:** It takes only _one_ argument – the object to convert.
- **Emission Behavior:**
  - For arrays/iterables: Emits items synchronously, one by one.
  - For Promises: Emits the resolved value asynchronously when the promise settles.
- **Completes:** It completes after emitting all items (from iterables) or the resolved value (from promises).

## Difference from `of()`

This is a common point of confusion:

- `of([1, 2, 3])`: Emits the **entire array `[1, 2, 3]` as a single item**.
- `from([1, 2, 3])`: Emits **`1`**, then **`2`**, then **`3`** as three separate items.

## Minimal Example

```typescript
import { from } from "rxjs";

from(["a", "b", "c"]).subscribe(console.log);
// a, b, c   (three separate, synchronous emissions)

from(Promise.resolve(42)).subscribe(console.log);
// 42   (emitted asynchronously when the promise resolves)
```

## Real-World Example Scenarios

1.  **Processing Array Items:** You might fetch configuration data which arrives as a plain array, but you want to use RxJS operators (`map`, `filter`, etc.) to process _each item_ in the array within a stream.
2.  **Integrating Promises:** You're working within an Angular/RxJS codebase, but need to interact with a browser API or a third-party JavaScript library that returns a `Promise`. `from()` lets you easily bring that promise-based result into your RxJS workflow.

## Code Snippet 1 (Using `from()` with an Array)

Let's say you have an array of user IDs and you want to create an Observable stream that emits each ID individually.

```typescript
import { Component } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { from, map, toArray } from "rxjs";

@Component({
  selector: "app-user-id-processor",
  imports: [AsyncPipe],
  template: `
    <h4>Processing User IDs:</h4>
    <ul>
      @for (processedId of processedUserIds$ | async; track processedId) {
        <li>{{ processedId }}</li>
      }
    </ul>
  `,
})
export class UserIdProcessorComponent {
  private readonly userIds = ["user-001", "user-007", "user-101"];

  // from() emits each ID separately so map runs per item;
  // toArray() collects the results into one array for the template
  protected readonly processedUserIds$ = from(this.userIds).pipe(
    map((id) => `Processed: ${id.toUpperCase()}`),
    toArray(),
  );
}
```

## Code Snippet 2 (Using `from()` with a Promise)

Imagine you need to use the browser's `fetch` API (which returns a Promise) to get some data and integrate it into your component's Observable-based logic.

```typescript
import { Component, signal } from "@angular/core";
import { AsyncPipe, JsonPipe } from "@angular/common";
import { catchError, from, of, tap } from "rxjs";

@Component({
  selector: "app-promise-integrator",
  imports: [AsyncPipe, JsonPipe],
  template: `
    <h4>Data from Promise:</h4>
    @if (data$ | async; as fetchedData) {
      <div>Data fetched: {{ fetchedData | json }}</div>
    }
    @if (errorMessage()) {
      <div>Error: {{ errorMessage() }}</div>
    }
  `,
})
export class PromiseIntegratorComponent {
  protected readonly errorMessage = signal("");

  // fetch() starts immediately (promises are eager);
  // from() adapts the pending promise into an Observable
  protected readonly data$ = from(
    fetch("https://api.example.com/data").then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }),
  ).pipe(
    tap((data) => console.log("Data received from promise:", data)),
    catchError((error) => {
      // fetch failure, non-OK status, or JSON parsing error
      this.errorMessage.set(error.message || "Failed to fetch data");
      return of(null); // keep the template alive with no data
    }),
  );
}
```

**Explanation:**

- **Array Example:** `from(this.userIds)` takes the array and emits each string element individually, allowing operators like `map` to work on each one; `toArray()` then hands the template one complete list.
- **Promise Example:** `from(promise)` waits (asynchronously) for the promise returned by `fetch().then(...)`. On resolution the JSON data is emitted as the `next` value; on rejection `from()` emits an `error` notification, handled by `catchError`. Note that the promise starts running the moment it is created, and unsubscribing from the Observable does not abort the underlying request; for lazy, per-subscription execution wrap it as `defer(() => from(fetch(...)))`, and for cancellable requests prefer Angular's `HttpClient`.

## Common Mistakes

**Confusing `from(array)` with `of(array)`.** Per-item emissions vs one array emission; the rest of the pipeline changes meaning entirely.

**Treating `from(promise)` as lazy or cancellable.** The promise's work starts when the promise is created, not at subscribe time, and unsubscribing only ignores the result. Wrap in `defer` for laziness; use `HttpClient` when you need real cancellation.

**Losing values behind the async pipe.** As with `of`, a stream of individual items shows only its latest value in the template. Collect with `toArray` (finite streams) or accumulate with `scan`.

## Interview Q&A

??? question "What input types does from() accept?"

    Arrays and array-likes, iterables (Map, Set, strings, generators), promises and other thenables, and Observable-compatible objects. Arrays and iterables emit synchronously item by item; promises emit their single resolution value asynchronously.

??? question "What happens when the promise passed to from() rejects?"

    The rejection becomes an RxJS `error` notification: subscribers' error handler runs and the stream terminates. `catchError` downstream can convert it to a fallback, exactly like any other stream error.

??? question "Does unsubscribing from from(promise) cancel the promise?"

    No. Promises are not cancellable; the underlying work continues and its result is simply discarded. That difference (unsubscribe-driven cancellation) is one of the main arguments for Observables over promises in Angular HTTP code.

## Related

- [of](of.md) for emitting fixed values as-is
- [Promise vs Observable](../../learn/promise-vs-observable.md) for the cancellation and laziness discussion
- [switchMap](../transformation/switchMap.md), which accepts promises as inner values via the same conversion

## Summary

`from()` is your go-to operator when you need to turn an array, iterable, or Promise into an Observable stream, typically to process its contents individually or integrate it seamlessly into your existing RxJS pipelines.
