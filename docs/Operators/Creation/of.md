---
description: "Create an Observable that emits the values you pass and then completes."
tags:
  - Operators
  - Creation
---

# of

The `of()` operator is a **creation operator**. Its job is simple: it creates an Observable that takes a sequence of arguments you provide, emits each of those arguments one after the other in the order you provided them, and then immediately **completes**.

Think of it as a way to turn a fixed set of known values into an Observable stream.

!!! abstract "At a glance"

    - **Signature:** `of(...values)`
    - **Use when:** turning fixed, known values into a stream: defaults, test data, fallbacks for `catchError`
    - **Avoid when:** you want an array's items emitted one by one (`from(array)`) or lazy evaluation (`defer`)
    - **Top gotcha:** `of([1, 2, 3])` emits the whole array as **one** value; `from([1, 2, 3])` emits three values

## Key Characteristics

- **Synchronous:** It emits all its values immediately and synchronously when you subscribe.
- **Ordered:** It emits the values in the exact order they are passed as arguments.
- **Completes:** After emitting the last value, it sends a completion notification.
- **Takes Multiple Arguments:** You list the values you want to emit directly as arguments to `of()`.

## Minimal Example

```typescript
import { of } from "rxjs";

of("Low", "Medium", "High").subscribe({
  next: console.log,
  complete: () => console.log("complete"),
});

// Low, Medium, High, complete   (all synchronously, in order)
```

## Real-World Example Scenario

Imagine you have a component in your Angular application that needs to display a list of predefined, static options, like user roles available for selection, default chart types, or initial filter categories. These values are known upfront, they don't need to be fetched from an API right now, but maybe other parts of your application expect to work with Observables for consistency. `of()` is perfect for creating an Observable stream from this static list.

**Example:** Let's say you want to display a list of predefined priority levels ('Low', 'Medium', 'High', 'Critical') in a dropdown or as filter options.

## Code Snippet (Angular Component)

```typescript
import { Component } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { of, toArray } from "rxjs";

@Component({
  selector: "app-priority-options",
  imports: [AsyncPipe],
  template: `
    <h4>Available Priorities:</h4>
    <ul>
      @for (priority of priorities$ | async; track priority) {
        <li>{{ priority }}</li>
      }
    </ul>
  `,
})
export class PriorityOptionsComponent {
  // of() emits each value separately; toArray() collects them into one
  // array emission so the async pipe hands the template a complete list
  protected readonly priorities$ = of("Low", "Medium", "High", "Critical").pipe(
    toArray(),
  );
}
```

**Explanation:**

1.  **`of('Low', 'Medium', 'High', 'Critical')`**: Creates an Observable that emits each priority string one after another, synchronously, then completes.
2.  **`toArray()`**: The `async` pipe only ever exposes the **latest** emission. Without `toArray`, the template would see just `'Critical'` (and `@for` would iterate its characters). Collecting into a single array emission gives the template the whole list at once.
3.  **`async` pipe**: Subscribes, delivers the array, and unsubscribes automatically when the component is destroyed.

## Common Mistakes

**`of(array)` when you meant `from(array)`.** `of([1, 2, 3])` is a stream of one array; `from([1, 2, 3])` is a stream of three numbers. Downstream operators behave completely differently for each.

**Rendering a multi-emission stream with the async pipe.** The pipe shows the latest value, not the history. If the template needs all values, collect them (`toArray`, `scan`) or emit an array in the first place.

**Expecting laziness.** `of(expensiveCall())` runs `expensiveCall()` immediately, at Observable-creation time. For per-subscription evaluation, use `defer(() => of(expensiveCall()))`.

## Interview Q&A

??? question "Is of() synchronous or asynchronous?"

    Synchronous: all values and the completion are delivered during the `subscribe()` call itself. That makes it handy for tests and fallbacks, and a good example when explaining that Observables are not inherently async.

??? question "What is the difference between of and from?"

    `of` emits its **arguments** as-is; `from` **converts** a single input (array, iterable, promise) into a stream of its items or resolution. `of('abc')` emits one string; `from('abc')` emits 'a', 'b', 'c'.

??? question "What does of() with no arguments do?"

    It emits nothing and completes immediately, behaviorally the same as `EMPTY` (which is preferred for readability and reuse, being a shared constant).

## Related

- [from](from.md) for converting arrays, iterables, and promises
- [EMPTY vs NEVER](empty-never.md) for the no-value edge cases
- [catchError](../error-handling/catchError.md), where `of(fallback)` is the standard recovery

## Summary

`of()` is a straightforward way to create an Observable when you have a fixed number of values readily available and you want them emitted sequentially as part of a stream.
