---
description: "Let Angular templates subscribe and unsubscribe automatically, avoiding the most common memory leaks."
tags:
  - Angular
---

# Async Pipe

Think of the `async` pipe as a smart assistant for handling asynchronous data right where you display it (in the HTML template). It does several important things automatically:

1.  **Subscribes:** When the component loads, the `async` pipe automatically subscribes to the Observable (or Promise) you provide it.
2.  **Unwraps Values:** When the Observable emits a new value, the `async` pipe "unwraps" that value and makes it available for binding in your template.
3.  **Triggers Change Detection:** It automatically tells Angular to check the component for changes whenever a new value arrives, ensuring your view updates.
4.  **Unsubscribes Automatically:** This is a huge benefit! When the component is destroyed, the `async` pipe automatically unsubscribes from the Observable, preventing potential memory leaks. You don't need manual unsubscription logic (like `takeUntilDestroyed` or `.unsubscribe()`) _for the subscription managed by the pipe itself_.
5.  **Handles Null/Undefined Initially:** Before the Observable emits its first value, the `async` pipe typically returns `null`, which you can handle gracefully in your template (usually with an `@if`/`@else` block).

!!! abstract "At a glance"

    - **Syntax:** `{{ stream$ | async }}` or `@if (stream$ | async; as value) { ... }`
    - **Use when:** the template is the only consumer of the stream; the pipe subscribes, updates, and unsubscribes for you
    - **Alternative:** `toSignal(stream$)` converts the stream once in the class and gives templates a plain signal; increasingly the default in signals-first codebases
    - **Top gotcha:** each `| async` in the template is its own subscription; two pipes on a cold stream trigger the work twice

## Why Use the `async` Pipe?

- **Less Boilerplate Code:** Significantly reduces the amount of code you need to write in your component's TypeScript file. You often don't need to manually subscribe, store the emitted value in a component property/signal, or handle unsubscription _just_ for displaying the data.
- **Automatic Memory Management:** The automatic unsubscription is the killer feature, making your components cleaner and less prone to memory leaks.
- **Improved Readability:** Keeps the template declarative. The template shows _what_ data stream it's bound to, and the pipe handles the _how_.

## Real-World Example: Displaying User Data Fetched via HttpClient

Fetching data from an API is a prime use case. Let's fetch user data and display it using the `async` pipe, avoiding manual subscription in the component for display purposes.

**Code Snippet:**

**1. User Service**

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, shareReplay, tap } from "rxjs";

export interface UserProfile {
  id: number;
  name: string;
  username: string;
  email: string;
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private http = inject(HttpClient);
  private userUrl = "https://jsonplaceholder.typicode.com/users/";

  // Cache for user profiles to avoid repeated requests for the same ID
  private userCache: { [key: number]: Observable<UserProfile> } = {};

  getUser(id: number): Observable<UserProfile> {
    // Check cache first
    if (!this.userCache[id]) {
      console.log(`UserService: Fetching user ${id} from API...`);
      this.userCache[id] = this.http
        .get<UserProfile>(`${this.userUrl}${id}`)
        .pipe(
          tap(() =>
            console.log(`UserService: API call for user ${id} completed.`),
          ),
          // Share & replay the single result, keep active while subscribed
          shareReplay({ bufferSize: 1, refCount: true }),
        );
    } else {
      console.log(`UserService: Returning cached observable for user ${id}.`);
    }
    return this.userCache[id];
  }
}
```

**2. User Display Component**

```typescript
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  Input,
  OnInit,
} from "@angular/core";
import { AsyncPipe } from "@angular/common"; // the async pipe itself
import { UserService, UserProfile } from "./user.service"; // Adjust path
import { Observable, EMPTY } from "rxjs"; // Import Observable and EMPTY

@Component({
  selector: "app-user-display",
  imports: [AsyncPipe],
  template: `
    <div class="user-card">
      <h4>User Profile (ID: {{ userId }})</h4>

      <!-- Use the async pipe here -->
      @if (user$ | async; as user) {
        <!-- 'user' now holds the emitted UserProfile object -->
        <div>
          <p><strong>Name:</strong> {{ user.name }}</p>
          <p><strong>Username:</strong> {{ user.username }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
        </div>
        <!-- Optional: Show raw data -->
        <!-- <details>
          <summary>Raw Data</summary>
          <pre>{{ user | json }}</pre>
        </details> -->
      } @else {
        <!-- This shows before the observable emits -->
        <p>Loading user data...</p>
      }
      <!-- Note: Error handling needs separate logic or wrapping the source -->
    </div>
  `,
  // No 'styles' section
  changeDetection: ChangeDetectionStrategy.OnPush, // Good practice with async pipe/observables
})
export class UserDisplayComponent implements OnInit {
  private userService = inject(UserService);

  @Input({ required: true }) userId!: number; // Get user ID from parent

  // Expose the Observable directly to the template
  user$: Observable<UserProfile> = EMPTY; // Initialize with EMPTY or handle null later

  ngOnInit() {
    // Assign the observable in ngOnInit (or wherever appropriate)
    // NO .subscribe() here for the template binding!
    this.user$ = this.userService.getUser(this.userId);
    console.log(
      `UserDisplayComponent (ID: ${this.userId}): Assigned observable to user$`,
    );
  }

  // --- Compare with manual subscription (for illustration) ---
  // // Manual Approach (requires more code + manual unsubscription handling):
  // private destroyRef = inject(DestroyRef);
  // userSignal = signal<UserProfile | null>(null);
  // loading = signal<boolean>(false);

  // ngOnInitManual() {
  //   this.loading.set(true);
  //   this.userService.getUser(this.userId)
  //     .pipe(
  //       takeUntilDestroyed(this.destroyRef) // Need manual unsubscribe handling
  //     )
  //     .subscribe({
  //       next: (user) => {
  //         this.userSignal.set(user); // Store in component state
  //         this.loading.set(false);
  //       },
  //       error: (err) => {
  //         console.error(err);
  //         this.loading.set(false);
  //         // Handle error state...
  //       }
  //     });
  // }
  // // Then in template you'd bind to userSignal() and loading()
}
```

**3. Parent Component (Using the User Display Component)**

```typescript
import { Component } from "@angular/core";
import { UserDisplayComponent } from "./user-display.component"; // Adjust path

@Component({
  selector: "app-root",
  imports: [UserDisplayComponent],
  template: `
    <h1>Async Pipe Demo</h1>
    <app-user-display [userId]="1"></app-user-display>
    <hr />
    <app-user-display [userId]="2"></app-user-display>
    <hr />
    <!-- This will use the cached observable -->
    <app-user-display [userId]="1"></app-user-display>
  `,
})
export class AppComponent {}
```

**Explanation:**

1.  `UserService` provides a `getUser(id)` method that returns an `Observable<UserProfile>`. It includes caching and `shareReplay` for efficiency.
2.  `UserDisplayComponent` gets a `userId` via `@Input`.
3.  In `ngOnInit`, it calls `userService.getUser(this.userId)` and assigns the **returned Observable directly** to the public component property `user$`. **Crucially, there is no `.subscribe()` call here.**
4.  In the template:
    - `@if (user$ | async; as user)`: This is the core line.
      - `user$ | async`: The `async` pipe subscribes to the `user$` observable. Initially, it returns `null`.
      - `as user`: If/when the `user$` observable emits a value, that value (the `UserProfile` object) is assigned to a local template variable named `user`.
      - The `@if` block only renders its content when `user$ | async` produces a "truthy" value (i.e., after the user profile has been emitted).
    - Inside the `@if` block, we can directly access properties of the resolved `user` object (e.g., `user.name`, `user.email`).
    - The `@else` block handles the initial state, showing "Loading user data..." until the `async` pipe receives the first emission.
5.  When the `UserDisplayComponent` is destroyed (e.g., navigated away from), the `async` pipe automatically cleans up its subscription to `user$`.

Compare this component's TypeScript code to the commented-out `ngOnInitManual` example. The `async` pipe version is much cleaner and less error-prone for simply displaying the data.

## Error Handling

The basic `async` pipe doesn't inherently handle errors from the Observable. If the `getUser` observable throws an error, the `async` pipe subscription will break. Proper error handling often involves using `catchError` within the Observable pipe _before_ it reaches the `async` pipe (e.g., catching the error and returning `of(null)` or `EMPTY`) or wrapping the component in an Error Boundary mechanism if appropriate.

## Async Pipe or toSignal?

Both solve "consume a stream in the template without manual subscription management":

- **`async` pipe:** zero class code, subscription per pipe usage, value can be `null` before first emission.
- **`toSignal(stream$, { initialValue })`:** one subscription per component regardless of how many places read it, plain signal semantics in the template, plays naturally with `computed`. Requires an injection context.

In signals-first codebases `toSignal` is becoming the default; the `async` pipe remains ideal for quick, single-use bindings, and it is still what interviewers usually ask about.

## Interview Q&A

??? question "What does the async pipe actually do under the hood?"

    It subscribes on first evaluation, stores the latest value, calls `markForCheck()` on each emission so OnPush components re-render, and unsubscribes in its `ngOnDestroy`. That last part is why it is the standard answer to "how do you avoid subscription leaks in templates?"

??? question "Why can multiple async pipes on the same Observable be a problem?"

    Each pipe is an independent subscription. On a cold source like `HttpClient`, three pipes fire three requests. Fixes: bind once with `@if (user$ | async; as user)` and reuse the local variable, share the stream (`shareReplay`), or convert once with `toSignal`.

??? question "What does the async pipe emit before the first value, and how do you handle it?"

    `null`. Template logic must treat "no value yet" explicitly, usually with `@if`/`@else` for a loading state, or by giving the stream a `startWith` value. This is also why `toSignal` asks for an `initialValue`.

## Related

- [shareReplay](../subjects/shareReplay.md) to share one execution across multiple pipes
- [takeUntil](../operators/filtering/takeUntil.md) for the manual-subscription counterpart
- [Observable](../learn/observable.md) for the underlying subscription model
