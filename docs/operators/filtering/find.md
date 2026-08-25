---
description: "Emit the first value matching a predicate, then complete."
tags:
  - Operators
  - Filtering
---

# find

The `find` operator searches through the sequence of values emitted by a source Observable. It takes a **predicate function** (a function that returns `true` or `false`) as an argument.

`find` will:

1.  Check each value emitted by the source against the predicate function.
2.  If it finds a value for which the predicate returns `true`:
    - It emits that **single value**.
    - It immediately **completes** the output Observable (it stops listening to the source).
3.  If the source Observable completes _without_ emitting any value that satisfies the predicate function:
    - `find` emits `undefined`.
    - It then completes.

!!! abstract "At a glance"

    - **Signature:** `find(predicate: (value, index) => boolean)`
    - **Use when:** you want the first match and then to stop listening, and "no match" is a normal outcome
    - **Avoid when:** you need every match (`filter`) or a missing match should be an error (`first(predicate)`)
    - **Top gotcha:** on a source that completes without a match, `find` emits `undefined`, so the output type is `T | undefined`

## Analogy

Imagine you're watching items pass by on a **conveyor belt** (the source Observable). You're looking for a specific item, say, the **first red ball**.

- You start watching (`subscribe`).
- Items go by: blue square, green triangle... (`find` checks each with your predicate `item => item.color === 'red'`).
- A red ball appears! (`find` predicate returns `true`).
- You **grab that red ball** (emit the value).
- You **walk away** because you found what you needed (complete the output Observable). You don't care about any other items that might come later on the belt.
- If the belt stops (`source completes`) before you see _any_ red balls, you walk away empty-handed (emit `undefined`).

## Key Points

- **Emits At Most One Value:** You'll only ever get the _first_ matching item or `undefined`.
- **Completes Early:** As soon as a match is found, the operator completes. This can be efficient if you only need the first occurrence.
- **Predicate Function:** The core logic lives in the function you provide to test each value.
- **vs `filter`:** Don't confuse `find` with `filter`. `filter` lets _all_ values that match the predicate pass through, while `find` only lets the _first_ one through and then stops.

## Minimal Example

```typescript
import { from, find } from "rxjs";

from([3, 7, 10, 4, 12])
  .pipe(find((n) => n > 9))
  .subscribe(console.log);

// 10   (4 and 12 are never inspected; the stream completes at the match)
```

## Real-World Example: Finding the First Admin User in a Stream

Suppose you have a stream of user objects being emitted (perhaps from a WebSocket or paginated API results). You want to find the very first user object that has administrative privileges and then stop processing.

### Code Snippet

**1. Mock User Service (Emits Users One by One)**

```typescript
import { Injectable } from "@angular/core";
import { Observable, from, timer, concatMap, map, tap } from "rxjs";

export interface User {
  id: number;
  name: string;
  isAdmin: boolean;
}

@Injectable({
  providedIn: "root",
})
export class UserStreamService {
  getUsers(): Observable<User> {
    const users: User[] = [
      { id: 1, name: "Alice (User)", isAdmin: false },
      { id: 2, name: "Bob (User)", isAdmin: false },
      { id: 3, name: "Charlie (Admin)", isAdmin: true }, // The one we want!
      { id: 4, name: "Diana (User)", isAdmin: false },
      { id: 5, name: "Eve (Admin)", isAdmin: true }, // `find` won't reach this one
    ];

    console.log("UserStreamService: Starting user emission...");

    // Emit users one by one with a small delay between them
    return from(users).pipe(
      concatMap((user) =>
        timer(500).pipe(
          map(() => user), // emit the user after the delay
          tap((u) => console.log(` -> Emitting user: ${u.name}`)),
        ),
      ),
    );
  }
}
```

**2. Component Using `find`**

```typescript
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
} from "@angular/core";
import { JsonPipe } from "@angular/common"; // for the json pipe
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { UserStreamService, User } from "./user-stream.service"; // Adjust path
import { find, tap } from "rxjs";

@Component({
  selector: "app-find-admin",
  imports: [JsonPipe],
  template: `
    <div>
      <h4>Find Operator Example</h4>
      <p>Searching for the first admin user in the stream...</p>

      @if (foundAdmin()) {
        <div class="result found">
          <strong>First Admin Found:</strong>
          <pre>{{ foundAdmin() | json }}</pre>
        </div>
      } @else if (searchComplete()) {
        <p class="result not-found">
          No admin user found before the stream completed.
        </p>
      } @else {
        <p class="result searching">Searching...</p>
      }
    </div>
  `,
  // No 'styles' section
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindAdminComponent implements OnInit {
  private userStreamService = inject(UserStreamService);
  private destroyRef = inject(DestroyRef);

  // --- State Signals ---
  foundAdmin = signal<User | undefined>(undefined); // Result can be User or undefined
  searchComplete = signal<boolean>(false); // Track if the find operation finished

  ngOnInit(): void {
    console.log("FindAdminComponent: Subscribing to find the first admin...");

    this.userStreamService
      .getUsers()
      .pipe(
        tap((user) =>
          console.log(`Checking user: ${user.name}, isAdmin: ${user.isAdmin}`),
        ),

        // --- Apply the find operator ---
        // Predicate checks the isAdmin property
        find((user) => user.isAdmin === true),
        // --------------------------------

        takeUntilDestroyed(this.destroyRef), // Standard cleanup
      )
      .subscribe({
        next: (adminUser) => {
          // This 'next' block runs AT MOST ONCE.
          // 'adminUser' will be the first user where isAdmin is true, OR undefined.
          if (adminUser) {
            console.log("SUCCESS: First admin found ->", adminUser);
            this.foundAdmin.set(adminUser);
          } else {
            // This case happens if the source stream completes BEFORE an admin is found.
            console.log(
              "INFO: Stream completed without finding an admin user.",
            );
          }
          this.searchComplete.set(true); // Mark search as finished
        },
        error: (err) => {
          console.error("Error during user stream processing:", err);
          this.searchComplete.set(true); // Mark as finished on error too
        },
        complete: () => {
          // This 'complete' runs immediately after 'find' emits its value (or undefined).
          // It does NOT wait for the source stream ('getUsers') to necessarily finish
          // if an admin was found early.
          console.log("Find operation stream completed.");
          // Ensure completion state is set, e.g., if source was empty.
          this.searchComplete.set(true);
        },
      });
  }
}
```

**Explanation:**

1.  `UserStreamService` provides an Observable `getUsers()` that emits user objects sequentially with a delay.
2.  `FindAdminComponent` subscribes to this stream in `ngOnInit`.
3.  **`find(user => user.isAdmin === true)`**: This is the core. For each user emitted by `getUsers()`:
    - The predicate `user => user.isAdmin === true` is evaluated.
    - It checks Alice (false), Bob (false).
    - It checks Charlie (true!). The predicate returns `true`.
    - `find` immediately emits the Charlie `User` object.
    - `find` immediately completes its output stream. It unsubscribes from the `getUsers()` source; Diana and Eve will likely not even be processed by the `tap` or emitted by the source in this specific component subscription because `find` stopped listening early.
4.  The `subscribe` block receives the Charlie object in its `next` handler. The `foundAdmin` signal is updated, and the UI displays the result. The `searchComplete` signal is set.
5.  The `complete` handler runs immediately after `next`, logging that the `find` operation is done.

If you were to change the `users` array in the service so no user has `isAdmin: true`, the `getUsers` stream would emit all users and then complete. `find` would never find a match, so it would emit `undefined` when its source completes. The `next` handler would receive `undefined`, the UI would show the "not found" message, and `complete` would run.

## Common Mistakes

**Forgetting the `undefined` branch.** The output type is `T | undefined`; skipping the no-match handling produces template errors or silent blank states exactly when the data is unusual.

**Using `find` when you meant `filter`.** `find` unsubscribes after the first match; if matches keep arriving and you want them all, that early completion becomes a confusing "my stream stopped" bug.

**Relying on `find` to finish on a non-completing source.** With no match and no completion (a `Subject`, `fromEvent`), `find` stays subscribed forever. Bound the wait with `takeUntil` or a timeout when the source may never satisfy the predicate.

## Interview Q&A

??? question "How does find differ from first(predicate)?"

    Behavior on "no match before completion": `find` emits `undefined` and completes normally; `first(predicate)` errors with `EmptyError` (unless given a default). Choose by whether absence is normal data or an exceptional condition.

??? question "How does find differ from filter?"

    `filter` is a gate that stays open for every matching value and never ends the stream itself. `find` is a search that emits the first match and immediately completes, unsubscribing from the source.

??? question "Is there an operator that gives the position instead of the value?"

    Yes, `findIndex(predicate)` emits the zero-based index of the first matching emission and completes, or `-1` if the source completes without a match.

## Related

- [filter](filter.md) to keep every match
- [first](first.md) for error-on-absence semantics
- [take](take.md) for count-based early completion
