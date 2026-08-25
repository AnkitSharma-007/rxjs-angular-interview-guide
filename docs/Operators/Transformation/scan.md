---
description: "Accumulate state over time, emitting the running result on every value."
tags:
  - Operators
  - Transformation
---

# scan

`scan()` is `Array.reduce` for streams, with one crucial difference: it emits the **running accumulation after every source value**, not just a final result. That makes it the fundamental operator for holding evolving state in a stream.

!!! abstract "At a glance"

    - **Signature:** `scan((acc, value, index) => newAcc, seed?)`
    - **Use when:** building running totals, event counters, or reducer-style state from action streams
    - **Avoid when:** you only want the final value of a completing stream (`reduce`)
    - **Top gotcha:** without a seed, the first source value becomes the initial accumulator and the reducer runs only from the second value

## Minimal Example

```typescript
import { from, scan } from "rxjs";

from([1, 2, 3, 4])
  .pipe(scan((total, n) => total + n, 0))
  .subscribe(console.log);

// 1, 3, 6, 10   (a running total, one emission per input)
// reduce() with the same arguments would emit only 10, at completion
```

## Angular Example: A Tiny Reducer-Style Store

`scan` powers the "actions in, state out" pattern that state libraries formalize:

```typescript
import { Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { Subject, scan, startWith } from "rxjs";

type CartAction =
  | { type: "add"; item: string }
  | { type: "remove"; item: string }
  | { type: "clear" };

@Component({
  selector: "app-cart",
  template: `
    <button (click)="actions$.next({ type: 'add', item: 'Book' })">
      Add book
    </button>
    <button (click)="actions$.next({ type: 'clear' })">Clear</button>

    <p>{{ items().length }} item(s)</p>
    <ul>
      @for (item of items(); track $index) {
        <li>{{ item }}</li>
      }
    </ul>
  `,
})
export class CartComponent {
  protected readonly actions$ = new Subject<CartAction>();

  // every action produces the next immutable state; scan holds it between events
  protected readonly items = toSignal(
    this.actions$.pipe(
      scan((state: string[], action: CartAction) => {
        switch (action.type) {
          case "add":
            return [...state, action.item];
          case "remove":
            return state.filter((i) => i !== action.item);
          case "clear":
            return [];
        }
      }, []),
    ),
    { initialValue: [] as string[] },
  );
}
```

**How it works:**

1. UI events push typed actions into a Subject: the "dispatch" side.
2. `scan` applies a reducer: previous state + action produce the next state, which is emitted immediately.
3. `toSignal` exposes the state stream to the template and cleans up with the component.

This is precisely the mental model behind NgRx and friends; being able to sketch it with `scan` is a strong senior-interview signal.

## Common Mistakes

**Mutating the accumulator.** `scan((acc, v) => { acc.push(v); return acc; })` emits the same array reference every time, defeating `OnPush`, signals equality, and `distinctUntilChanged`. Always return new objects/arrays.

**Omitting the seed unintentionally.** Without a seed, the first value passes through untouched as the initial accumulator. Fine for numbers, surprising for objects, and it changes the output type.

**Using `reduce` on a stream that never completes.** `reduce` only emits at completion, so on a Subject or `valueChanges` it emits nothing, ever. On live streams, `scan` is almost always what you want.

## Interview Q&A

??? question "What is the difference between scan and reduce in RxJS?"

    Same reducer signature, different emission policy: `scan` emits every intermediate accumulation; `reduce` waits for source completion and emits only the final one. On infinite streams `reduce` never emits, which makes `scan` the streaming-state operator.

??? question "How does scan relate to state management libraries?"

    An NgRx-style store is conceptually `actions$.pipe(scan(reducer, initialState))` plus multicasting and selector helpers. Demonstrating that reduction shows you understand the pattern rather than just the library API.

??? question "What happens if the reducer throws?"

    The error is caught and delivered as an error notification: the state stream terminates. Guard reducers carefully or isolate risky work outside `scan`, because a dead state stream takes the whole feature with it.

## Related

- [map](map.md) for stateless per-value transformation
- [BehaviorSubject](../../subjects/behaviorSubject.md), the imperative sibling for holding current state
- [startWith](../combination/startWith.md) for seeding downstream consumers immediately
