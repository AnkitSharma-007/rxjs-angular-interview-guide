---
description: "Emit an initial value synchronously before the source starts."
tags:
  - Operators
  - Combination
---

# startWith

`startWith()` prepends one or more values to a stream. Subscribers receive those values **synchronously at subscription time**, then everything the source emits afterwards.

Small operator, outsized usefulness: it is the standard answer to "this stream has no value yet".

!!! abstract "At a glance"

    - **Signature:** `startWith(...values)`
    - **Use when:** giving `combineLatest`/`withLatestFrom` inputs an initial value, seeding loading states, making `valueChanges` reflect the current form value
    - **Avoid when:** the initial value is really *state* that belongs in a `BehaviorSubject` or signal
    - **Top gotcha:** the prepended value bypasses everything **upstream** of `startWith`; operators before it never see the seed

## Minimal Example

```typescript
import { of, startWith } from "rxjs";

of("first real value").pipe(startWith("seed")).subscribe(console.log);

// seed
// first real value
```

## Angular Example: Instant Loading State

The classic loading/loaded pattern in one pipeline:

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { catchError, map, of, startWith } from "rxjs";

type ViewState =
  | { status: "loading" }
  | { status: "loaded"; users: string[] }
  | { status: "error" };

@Component({
  selector: "app-user-list",
  template: `
    @let s = state();
    @switch (s.status) {
      @case ("loading") {
        <p>Loading users...</p>
      }
      @case ("error") {
        <p>Something went wrong.</p>
      }
      @case ("loaded") {
        <ul>
          @for (user of s.users; track user) {
            <li>{{ user }}</li>
          }
        </ul>
      }
    }
  `,
})
export class UserListComponent {
  private readonly http = inject(HttpClient);

  protected readonly state = toSignal(
    this.http.get<string[]>("/api/users").pipe(
      map((users): ViewState => ({ status: "loaded", users })),
      catchError(() => of<ViewState>({ status: "error" })),
      startWith<ViewState>({ status: "loading" }), // rendered immediately
    ),
    { requireSync: true }, // safe: startWith guarantees a synchronous value
  );
}
```

**How it works:** `startWith` emits the loading state the instant the pipe is subscribed, so the template never sees an empty gap; when the request resolves (or fails), the mapped state replaces it. Note `requireSync: true`: `toSignal` can skip the `initialValue` because `startWith` makes the stream synchronous at subscribe time.

Another everyday use: unblocking [`combineLatest`](combineLatest.md) when one input (like an untouched form control) has not emitted yet:

```typescript
combineLatest([
  searchTerm$,
  category$.pipe(startWith("all")), // don't block the combination
]);
```

## Common Mistakes

**Placing `startWith` too early in the pipe.** Operators after it process the seed too: `startWith("") , debounceTime(300)` delays your seed. Usually `startWith` goes **last**, or at least after transformation steps that should not apply to it.

**Seeding types inconsistently.** `startWith(null)` widens `Observable<User>` to `Observable<User | null>`. That may be exactly right (loading = null), but do it deliberately and type it explicitly.

**Using `startWith` where state belongs.** If several consumers each need the current value at arbitrary subscribe times, that is `BehaviorSubject`/signal territory; `startWith` re-emits its constant seed to every subscriber, not the _latest_ value.

## Interview Q&A

??? question "How does startWith differ from a BehaviorSubject's initial value?"

    `startWith` prepends a fixed value per subscription: every new subscriber sees the same constant seed. A `BehaviorSubject` replays its **current** value, which updates with every `next`. Seed vs live state.

??? question "Why does combineLatest often need startWith on its inputs?"

    `combineLatest` emits only after every input has emitted at least once. An input that stays silent (an untouched form control, a not-yet-fired event) blocks all output; `startWith(initial)` unblocks it with a sensible default.

??? question "Is the startWith value emitted synchronously?"

    Yes, during subscription itself. That is why it pairs with `toSignal(..., { requireSync: true })` and why templates render the seeded state on the first change-detection pass.

## Related

- [combineLatest](combineLatest.md), the operator most frequently unblocked by startWith
- [BehaviorSubject](../../subjects/behaviorSubject.md) when the "initial value" is actually live state
- [concat](concat.md), the general form of prepending whole streams
