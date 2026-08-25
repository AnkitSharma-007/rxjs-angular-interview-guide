---
description: "Wait for all streams to complete, then emit their final values together."
tags:
  - Operators
  - Combination
---

# forkJoin

`forkJoin()` is used when you have a group of Observables (often representing asynchronous operations like API calls) and you want to wait until **all** of them have **completed** before you get the results.

Think of it like starting several independent tasks (e.g., downloading multiple files, making several API requests). `forkJoin` waits patiently until every single one of those tasks signals "I'm finished!". Once the last task completes, `forkJoin` emits a _single_ value, which is an array containing the _very last value_ emitted by each of the input Observables, in the same order you provided them.

!!! abstract "At a glance"

    - **Signature:** `forkJoin([a$, b$])` or the dictionary form `forkJoin({ user: user$, prefs: prefs$ })`
    - **Use when:** running parallel one-shot operations (HTTP calls) and proceeding only with all final results
    - **Avoid when:** any source never completes (`valueChanges`, Subjects, intervals); `forkJoin` would never emit
    - **Top gotcha:** a single uncaught error in any source kills the whole join and discards every other result

## Key Characteristics

1.  **Waits for Completion:** It doesn't emit anything until _every_ input Observable finishes (completes).
2.  **Parallel Execution:** It subscribes to all input Observables immediately, allowing them to run in parallel.
3.  **Single Emission:** It emits only _one_ value (or an error).
4.  **Array of Last Values:** The emitted value is an array containing the _last_ value from each input Observable.
5.  **Error Behavior:** If _any_ of the input Observables error out, `forkJoin` immediately errors out as well. It will _not_ wait for the other Observables to complete and will _not_ emit the array of results.

## Minimal Example

```typescript
import { forkJoin, map, timer } from "rxjs";

forkJoin([
  timer(300).pipe(map(() => "fast")),
  timer(900).pipe(map(() => "slow")),
]).subscribe(console.log);

// after ~900ms: ["fast", "slow"]
// one emission, the LAST value of each source, in input order
```

## Real-World Analogy

Imagine you're ordering dinner from three different places via delivery apps:

- App 1: Pizza
- App 2: Salad
- App 3: Drinks

You want to start eating only when _everything_ has arrived. `forkJoin` is like waiting by the door. It doesn't matter if the pizza arrives first, or the drinks. You only care about the moment the _last_ delivery person arrives. At that exact moment, `forkJoin` gives you the complete meal: `[Pizza, Salad, Drinks]`.

However, if any single order fails (e.g., the pizza place cancels), `forkJoin` immediately tells you there's a problem ("Error: Pizza order cancelled!") and you don't get the combined results.

**Handling Errors within `forkJoin`:**

Because `forkJoin` fails completely if any input stream errors, you often want to handle potential errors _within_ each input stream _before_ they reach `forkJoin`. You can use the `catchError` operator for this, typically returning a fallback value (like `null`, `undefined`, or an empty object/array) so that the stream still _completes_ successfully.

```typescript
import { forkJoin, of, timer, throwError } from "rxjs";
import { catchError, delay, map } from "rxjs";

const successful$ = of("Success Data").pipe(delay(500));

// Simulate an API call that fails
const failing$ = timer(1500).pipe(
  delay(100), // Add small delay just for simulation
  map(() => {
    throw new Error("Network Error");
  }), // Simulate error
);

// --- Without error handling inside ---
// forkJoin([successful$, failing$]).subscribe({
//   next: results => console.log('This will not run'),
//   error: err => console.error('forkJoin failed because one stream errored:', err.message) // This will run
// });

// --- With error handling inside the failing stream ---
console.log("\nStarting forkJoin with internal error handling...");
const failingHandled$ = failing$.pipe(
  catchError((error) => {
    console.warn(`Caught error in stream: ${error.message}. Returning null.`);
    // Return an Observable that emits a fallback value and COMPLETES
    return of(null);
  }),
);

forkJoin([successful$, failingHandled$]).subscribe({
  next: (results) => {
    // This will run after ~1.6 seconds
    console.log("forkJoin completed with results:", results); // results: ['Success Data', null]
  },
  error: (err) => {
    console.error("This should not run if errors are handled internally:", err);
  },
});

/*
Expected Output:
Starting forkJoin with internal error handling...
(after ~1.6 seconds)
Caught error in stream: Network Error. Returning null.
forkJoin completed with results: [ 'Success Data', null ]
*/
```

## Angular Example: Loading Initial Page Data

`forkJoin` is perfect for loading all the essential data a component needs before displaying anything.

```typescript
import { Component, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, forkJoin, of } from "rxjs";

interface UserProfile {
  name: string;
  email: string;
}
interface UserPreferences {
  theme: string;
  language: string;
}
interface InitialNotifications {
  count: number;
  messages: string[];
}

@Component({
  selector: "app-profile-page",
  template: `
    @if (loading()) {
      <div>Loading profile data...</div>
    } @else if (errorMsg()) {
      <div style="color: red;">{{ errorMsg() }}</div>
    } @else {
      <h2>Profile: {{ profile()?.name }}</h2>
      <p>Email: {{ profile()?.email }}</p>
      <p>Theme: {{ preferences()?.theme }}</p>
      <p>Notifications: {{ notifications()?.count }}</p>
    }
  `,
})
export class ProfilePageComponent {
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(true);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly preferences = signal<UserPreferences | null>(null);
  protected readonly notifications = signal<InitialNotifications | null>(null);

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    // catch per request so one failure cannot sink the whole join
    const profile$ = this.http
      .get<UserProfile>("/api/profile")
      .pipe(catchError(() => of(null)));
    const preferences$ = this.http
      .get<UserPreferences>("/api/preferences")
      .pipe(catchError(() => of(null)));
    const notifications$ = this.http
      .get<InitialNotifications>("/api/notifications")
      .pipe(catchError(() => of({ count: 0, messages: [] })));

    // dictionary form: results arrive as a named object, not a positional array
    forkJoin({
      profile: profile$,
      preferences: preferences$,
      notifications: notifications$,
    }).subscribe(({ profile, preferences, notifications }) => {
      if (!profile || !preferences) {
        this.errorMsg.set(
          "Could not load essential profile data. Please try again later.",
        );
      } else {
        this.profile.set(profile);
        this.preferences.set(preferences);
        this.notifications.set(notifications);
      }
      this.loading.set(false);
    });
  }
}
```

In this example, the component makes three API calls. The `forkJoin` ensures that the loading state stays active until _all three_ requests are finished. By using `catchError` inside each request, we prevent one failed request from stopping the others, and we can handle missing data appropriately in the subscriber. Because `HttpClient` observables complete, `forkJoin` emits exactly once and no manual unsubscribe is needed.

## Common Mistakes

**Passing sources that never complete.** `forkJoin` waits for **completion**, not just emission. A `valueChanges`, `Subject`, or `interval` input means it never emits at all. Bound such sources with `take(1)`/`first()` or rethink the operator choice.

**Skipping per-source error handling.** One failed request errors the join and throws away every other response. Attach `catchError` to each source with a fallback value so the join always resolves.

**Positional arrays for many sources.** `results[3]` invites off-by-one bugs on refactor. The dictionary form gives named results and survives reordering.

## Interview Q&A

??? question "What happens if one forkJoin source errors?"

    The join errors immediately, unsubscribes from the remaining sources, and emits none of the results. That is why production code catches errors per source and maps them to fallback values that still complete.

??? question "Why is forkJoin often compared to Promise.all?"

    Same contract: run in parallel, resolve once with all results, reject on first failure. The differences: forkJoin works with streams (it takes the **last** value of each) and is lazy: nothing runs until subscription.

??? question "When would combineLatest be the better choice?"

    When the sources keep emitting and you want ongoing combined updates rather than one final snapshot: live filters, form + data combinations. `forkJoin` is for finite, completing work.

## Related

- [combineLatest](combineLatest.md) for continuous combination of live streams
- [zip](zip.md) for pairing emissions by index
- [catchError](../error-handling/catchError.md), the essential companion for resilient joins

## Summary

Use `forkJoin` when you need to run several asynchronous operations (that eventually complete) in parallel and only want to proceed once you have the final result from _all_ of them. Remember its strict error handling behavior and use `catchError` internally if necessary.
