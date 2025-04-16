# forkJoin

`forkJoin()` is used when you have a group of Observables (often representing asynchronous operations like API calls) and you want to wait until **all** of them have **completed** before you get the results.

Think of it like starting several independent tasks (e.g., downloading multiple files, making several API requests). `forkJoin` waits patiently until every single one of those tasks signals "I'm finished!". Once the last task completes, `forkJoin` emits a _single_ value, which is an array containing the _very last value_ emitted by each of the input Observables, in the same order you provided them.

## Key Characteristics

1.  **Waits for Completion:** It doesn't emit anything until _every_ input Observable finishes (completes).
2.  **Parallel Execution:** It subscribes to all input Observables immediately, allowing them to run in parallel.
3.  **Single Emission:** It emits only _one_ value (or an error).
4.  **Array of Last Values:** The emitted value is an array containing the _last_ value from each input Observable.
5.  **Error Behavior:** If _any_ of the input Observables error out, `forkJoin` immediately errors out as well. It will _not_ wait for the other Observables to complete and will _not_ emit the array of results.

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
import { delay, catchError } from "rxjs/operators";

const successful$ = of("Success Data").pipe(delay(500));

// Simulate an API call that fails
const failing$ = timer(1500).pipe(
  delay(100), // Add small delay just for simulation
  map(() => {
    throw new Error("Network Error");
  }) // Simulate error
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
  })
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
import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";

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
    <div *ngIf="!isLoading && !errorMsg">
      <h2>Profile: {{ profile?.name }}</h2>
      <p>Email: {{ profile?.email }}</p>
      <p>Theme: {{ preferences?.theme }}</p>
      <p>Notifications: {{ notifications?.count }}</p>
    </div>
    <div *ngIf="isLoading">Loading profile data...</div>
    <div *ngIf="errorMsg" style="color: red;">{{ errorMsg }}</div>
  `,
})
export class ProfilePageComponent implements OnInit {
  isLoading = true;
  errorMsg: string | null = null;

  profile: UserProfile | null = null;
  preferences: UserPreferences | null = null;
  notifications: InitialNotifications | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.errorMsg = null;

    // Define the API calls - HttpClient observables complete automatically
    const profile$ = this.http.get<UserProfile>("/api/profile").pipe(
      catchError((err) => {
        console.error("Failed to load Profile", err);
        // Return fallback and let forkJoin continue
        return of(null);
      })
    );

    const preferences$ = this.http
      .get<UserPreferences>("/api/preferences")
      .pipe(
        catchError((err) => {
          console.error("Failed to load Preferences", err);
          // Return fallback and let forkJoin continue
          return of(null);
        })
      );

    const notifications$ = this.http
      .get<InitialNotifications>("/api/notifications")
      .pipe(
        catchError((err) => {
          console.error("Failed to load Notifications", err);
          // Return fallback and let forkJoin continue
          return of({ count: 0, messages: [] }); // Example fallback
        })
      );

    // Use forkJoin to wait for all requests
    forkJoin([profile$, preferences$, notifications$]).subscribe(
      ([profileResult, preferencesResult, notificationsResult]) => {
        // This block runs when all API calls have completed (successfully or with handled errors)
        console.log("All data received:", {
          profileResult,
          preferencesResult,
          notificationsResult,
        });

        // Check if essential data is missing
        if (!profileResult || !preferencesResult) {
          this.errorMsg =
            "Could not load essential profile data. Please try again later.";
        } else {
          this.profile = profileResult;
          this.preferences = preferencesResult;
          this.notifications = notificationsResult; // Notifications might be optional or have a fallback
        }

        this.isLoading = false;
      },
      (err) => {
        // This error handler is less likely to be hit if catchError is used inside,
        // but good practice to have for unexpected issues.
        console.error("Unexpected error in forkJoin:", err);
        this.errorMsg = "An unexpected error occurred while loading data.";
        this.isLoading = false;
      }
    );
  }
}
```

In this example, the component makes three API calls. The `forkJoin` ensures that the loading indicator stays active until _all three_ requests are finished. By using `catchError` inside each request, we prevent one failed request from stopping the others, and we can handle missing data appropriately in the `next` callback of `forkJoin`.

## Summary

use `forkJoin` when you need to run several asynchronous operations (that eventually complete) in parallel and only want to proceed once you have the final result from _all_ of them. Remember its strict error handling behavior and use `catchError` internally if necessary.
