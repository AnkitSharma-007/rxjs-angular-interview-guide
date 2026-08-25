---
description: "Map to an inner Observable and cancel the previous one: the type-ahead search operator."
tags:
  - Operators
  - Transformation
---

# switchMap

`switchMap()` is a **higher-order mapping operator**. This means it does two things:

1.  It takes a value emitted by the source (outer) Observable.
2.  It uses that value to create and subscribe to a **new inner Observable** (using a function you provide).

The crucial part is the "**switch**" behavior:

- If the source Observable emits a _new_ value while a previous inner Observable (created from an earlier source value) is still active (hasn't completed), `switchMap` will **immediately unsubscribe** from that previous inner Observable.
- It then subscribes to the _new_ inner Observable created from the _latest_ source value.

Essentially, `switchMap` **cancels** the previous ongoing inner operation and switches its focus entirely to the new one triggered by the most recent source emission. You only get values from the _currently active_ inner Observable.

!!! abstract "At a glance"

    - **Signature:** `switchMap(project)` where `project` maps each source value to an Observable
    - **Use when:** only the latest result matters: type-ahead search, route param changes, refreshing data
    - **Avoid when:** every operation must finish (saves, uploads, ordered writes)
    - **Top gotcha:** each new source value unsubscribes the in-flight inner Observable; with `HttpClient` that aborts the request

## Key Characteristics

- **Higher-Order Mapping:** Maps values from an outer Observable to inner Observables.
- **Switching/Cancellation:** Unsubscribes from the previous inner Observable when the outer source emits a new value.
- **Focus on Latest:** Only emissions from the most recent inner Observable are passed downstream.
- **Use Cases:** Ideal when you only care about the result corresponding to the latest trigger event and want to discard results from previous, potentially outdated triggers.

## Minimal Example

```typescript
import { interval, map, switchMap, take } from "rxjs";

// source emits 0, 1, 2, one value per second
interval(1000)
  .pipe(
    take(3),
    switchMap((n) =>
      // each source value starts a slower inner stream of two values
      interval(700).pipe(
        take(2),
        map((i) => `outer ${n} / inner ${i}`),
      ),
    ),
  )
  .subscribe(console.log);

// Output:
// outer 0 / inner 0   (inner for 0 is cancelled before its 2nd value)
// outer 1 / inner 0   (inner for 1 is cancelled too)
// outer 2 / inner 0
// outer 2 / inner 1   (only the last inner stream runs to completion)
```

## Real-World Example Scenario (The Classic Use Case): Type-Ahead Search

This is the quintessential example for `switchMap`. Imagine you have a search input field in your Angular application. As the user types, you want to make API calls to fetch search suggestions.

- User types "a" -> Trigger API call for "a"
- User quickly types "n" (now input is "an") -> Trigger API call for "an" -> **`switchMap` cancels the pending API call for "a"**
- User quickly types "g" (now input is "ang") -> Trigger API call for "ang" -> **`switchMap` cancels the pending API call for "an"**

You only care about the results for the _latest_ search term ("ang"). `switchMap` ensures that you don't receive outdated results (like suggestions for "a" arriving _after_ suggestions for "ang") and prevents unnecessary network requests from completing if they've already been superseded.

## Angular Example

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
} from "rxjs";

interface Suggestion {
  title: string;
  url: string;
}

@Component({
  selector: "app-typeahead-search",
  imports: [ReactiveFormsModule],
  template: `
    <input
      [formControl]="searchControl"
      type="search"
      placeholder="Search..."
    />

    <ul>
      @for (suggestion of suggestions(); track suggestion.url) {
        <li>
          <a [href]="suggestion.url" target="_blank">{{ suggestion.title }}</a>
        </li>
      } @empty {
        <li>Type to search.</li>
      }
    </ul>
  `,
})
export class TypeaheadSearchComponent {
  private readonly http = inject(HttpClient);

  protected readonly searchControl = new FormControl("", {
    nonNullable: true,
  });

  // debounced term -> switched HTTP request -> signal the template can read
  protected readonly suggestions = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300), // wait for a pause in typing
      distinctUntilChanged(), // ignore repeats of the same term
      switchMap((term) => {
        const query = term.trim();
        if (!query) {
          return of<Suggestion[]>([]); // empty input clears the list, no request
        }
        return this.http
          .get<Suggestion[]>("/api/suggestions", { params: { q: query } })
          .pipe(
            // handle errors INSIDE switchMap so one failure
            // does not kill the whole valueChanges stream
            catchError(() => of<Suggestion[]>([])),
          );
      }),
    ),
    { initialValue: [] },
  );
}
```

**How it works:**

1. `valueChanges` emits every keystroke from the reactive form control.
2. `debounceTime(300)` waits for a pause in typing; `distinctUntilChanged()` skips unchanged terms.
3. `switchMap` maps the term to an `HttpClient` request. If a new term arrives while a request is in flight, `switchMap` unsubscribes from it, which makes `HttpClient` **abort the HTTP request**, and subscribes to the new one.
4. `catchError` sits on the inner Observable, so an API failure emits an empty list and the search keeps working.
5. `toSignal` subscribes once, exposes the latest results as a signal for the template, and unsubscribes automatically when the component is destroyed.

## Common Mistakes

**Using `switchMap` for saves.** Cancelling an in-flight `POST`/`PUT` does not undo it on the server, and the response you needed is discarded. Use [`concatMap`](concatMap.md) for ordered writes or [`exhaustMap`](exhaustMap.md) to ignore repeat clicks.

**Putting `catchError` on the outer stream.** If the error is handled outside `switchMap`, the whole source stream completes on the first failure and the search box stops responding. Handle errors on the inner Observable, as above.

**Nesting subscriptions instead.** `stream.subscribe(v => this.http.get(...).subscribe(...))` has no cancellation, leaks subscriptions, and is the pattern interviewers most want to see you replace with `switchMap`.

## Interview Q&A

??? question "What happens to the previous inner Observable when the source emits again?"

    `switchMap` unsubscribes from it. Teardown logic runs: an `HttpClient` request is aborted, timers are cleared. Any values it would have produced are never seen downstream. This unsubscribe-based cancellation is the core difference from `mergeMap` and `concatMap`.

??? question "Why is switchMap right for autocomplete but wrong for saving a form?"

    Autocomplete only cares about results for the latest term, so cancelling stale requests is exactly what you want. A save must complete: cancelling the HTTP response does not cancel the server-side write, so you can end up with saves you cannot confirm. Use `concatMap` (queue in order) or `exhaustMap` (ignore clicks while saving).

??? question "Does switchMap cancel the outer source too?"

    No. Only the current inner Observable is unsubscribed. The outer stream stays alive, and each new outer value creates a fresh inner subscription.

## Related

- [switchMap vs mergeMap vs concatMap](../../comparisons/switchMap-mergeMap-concatMap.md) for choosing between the mapping strategies
- [exhaustMap](exhaustMap.md) for ignoring new values while one is in flight
- [debounceTime](../filtering/debounceTime.md) and [distinctUntilChanged](../filtering/distinctUntilChanged.md), its usual companions

## Summary

`switchMap` maps each source value to an inner Observable and only ever keeps the newest one alive. Reach for it when the latest request wins: type-ahead search, reacting to route param changes, or refreshing data. Avoid it whenever a cancelled operation would mean lost work.
