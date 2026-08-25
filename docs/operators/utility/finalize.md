---
description: "Run cleanup when a stream completes, errors, or is unsubscribed."
tags:
  - Operators
  - Utility
---

# finalize

The `finalize` operator lets you specify a callback function that will be executed **when the source Observable terminates**. Termination happens in one of three ways:

1.  The Observable **completes** successfully (sends its last value and the `complete` notification).
2.  The Observable emits an **error** notification.
3.  The subscription to the Observable is **unsubscribed** (e.g., manually, or automatically via operators like `take`, `takeUntil`, or `takeUntilDestroyed`).

Think of it like the `finally` block in a traditional `try...catch...finally` statement. The code inside `finalize` is **guaranteed** to run _after_ the Observable finishes its work or is stopped, regardless of _why_ it stopped (success, error, or unsubscription).

!!! abstract "At a glance"

    - **Signature:** `finalize(callback)`; the callback receives no arguments
    - **Use when:** cleanup must always run: loading flags, spinners, releasing resources
    - **Avoid when:** the logic depends on *how* the stream ended; use `tap`/`catchError` for outcome-specific behavior
    - **Top gotcha:** it also runs on **unsubscribe**, and it runs once per subscription, after the terminal notification is delivered

## Key Points

1.  **Guaranteed Execution on Termination:** Runs whether the stream succeeds, fails, or is unsubscribed.
2.  **No Arguments:** The callback function you provide to `finalize` receives no arguments. It doesn't know _if_ an error occurred or what the last value was; it just knows the stream is done.
3.  **Side Effects Only:** Like `tap`, `finalize` is purely for side effects. It doesn't affect the values, errors, or completion signals passing _through_ the stream (because it runs _after_ them).
4.  **Ideal for Cleanup:** Its primary purpose is resource cleanup or actions that must happen when an operation is finished.

## Why Use `finalize`?

The most common and important use case is **managing loading states**.

- You start an operation (e.g., HTTP request).
- You set a `loading` flag/signal to `true`.
- The operation might succeed or fail.
- You need to ensure the `loading` flag/signal is _always_ set back to `false` when the operation is finished, no matter the outcome. `finalize` is perfect for this.

Other uses include:

- Closing connections (though often handled by unsubscription itself).
- Logging the end of an operation.
- Releasing any temporary resources acquired at the start of the subscription.

## Minimal Example

```typescript
import { finalize, map, of } from "rxjs";

of(1, 2, 3)
  .pipe(
    map((n) => n * 10),
    finalize(() => console.log("teardown: stream ended")),
  )
  .subscribe({
    next: console.log,
    complete: () => console.log("complete"),
  });

// 10, 20, 30, complete, teardown: stream ended
// (finalize fires AFTER the complete handler, and would also fire on error or unsubscribe)
```

## Real-World Example: Managing Loading State for Data Fetching

This is the classic example. We fetch data, show a loading indicator, and use `finalize` to hide the indicator when the fetch completes or fails.

### Code Snippet

```typescript
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  EMPTY,
  Observable,
  catchError,
  delay,
  finalize,
  of,
  switchMap,
  tap,
  timer,
} from "rxjs";

// --- Mock Data Service ---
interface Product {
  id: number;
  name: string;
  price: number;
}

function mockFetchProducts(
  failRequest: boolean = false,
): Observable<Product[]> {
  console.log("Backend: Starting simulated product fetch...");
  if (failRequest) {
    // Simulate a delayed error
    return timer(1200).pipe(
      tap(() => console.log("Backend: Simulating network error...")),
      switchMap(() => {
        throw new Error("Network Error: Failed to connect to server.");
      }),
    );
  } else {
    // Simulate a successful response with delay
    const products: Product[] = [
      { id: 101, name: "Super Widget", price: 19.99 },
      { id: 102, name: "Mega Gadget", price: 29.95 },
    ];
    return of(products).pipe(
      delay(1500), // Simulate network latency
      tap(() => console.log("Backend: Simulated fetch successful.")),
    );
  }
}
// --- End Mock Data Service ---

@Component({
  selector: "app-product-list",
  imports: [CurrencyPipe],
  template: `
    <div>
      <h4>Product List (Finalize Example)</h4>
      <button (click)="loadProducts(false)" [disabled]="loading()">
        Load Products
      </button>
      <button (click)="loadProducts(true)" [disabled]="loading()">
        Load Products (Simulate Error)
      </button>

      @if (loading()) {
        <p class="status loading">Loading products...</p>
      }
      @if (errorMessage()) {
        <p class="status error">Error: {{ errorMessage() }}</p>
      }
      @if (products().length > 0 && !loading()) {
        <ul>
          @for (product of products(); track product.id) {
            <li>{{ product.name }} - {{ product.price | currency }}</li>
          }
        </ul>
      } @else if (!loading() && !errorMessage()) {
        <p>Click button to load.</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  private destroyRef = inject(DestroyRef);

  // --- State Signals ---
  loading = signal<boolean>(false);
  products = signal<Product[]>([]);
  errorMessage = signal<string | null>(null);

  loadProducts(simulateError: boolean = false): void {
    if (this.loading()) return; // Don't load if already loading

    this.loading.set(true); // <-- Start Loading Indicator
    this.products.set([]);
    this.errorMessage.set(null);
    console.log("UI: Fetch initiated, showing loading state.");

    mockFetchProducts(simulateError)
      .pipe(
        tap((data) =>
          console.log("UI Stream: Received product data (before finalize)"),
        ),
        catchError((err: Error) => {
          console.error("UI Stream: Error caught:", err.message);
          this.errorMessage.set(err.message || "Could not load products.");
          // Return EMPTY to allow finalize to run after error handling
          return EMPTY;
        }),
        // --- Key Operator ---
        // This block runs AFTER success (tap), OR AFTER error (catchError),
        // OR if the subscription is cancelled (e.g., by takeUntilDestroyed).
        finalize(() => {
          this.loading.set(false); // <-- Stop Loading Indicator
          console.log(
            "UI: Finalize block executed - Loading state set to false.",
          );
        }),
        // --------------------
        takeUntilDestroyed(this.destroyRef), // Ensure unsubscription on destroy
      )
      .subscribe({
        next: (data) => {
          console.log("UI: Subscribe next - updating product list.");
          this.products.set(data);
        },
        // Error already handled by catchError
        error: (err) => {
          /* No need for code here usually if catchError handles UI state */
        },
        // Complete isn't needed for loading state because finalize covers it
        complete: () => {
          console.log("UI: Subscribe complete.");
        },
      });
  }
}
```

**Explanation:**

1.  When `loadProducts` is called, `loading` is immediately set to `true`, displaying the "Loading products..." message.
2.  `mockFetchProducts` returns an Observable that simulates either success or failure after a delay.
3.  The `pipe` chain processes the result:
    - `tap`: Logs successful data receipt (only runs on success).
    - `catchError`: Catches any error from the source. It sets the `errorMessage` signal and returns `EMPTY`. Returning `EMPTY` makes the stream complete gracefully _after_ the error, ensuring `finalize` still runs.
    - **`finalize(() => { this.loading.set(false); })`**: This is the crucial part. This callback function is registered to run when the stream terminates.
      - If `mockFetchProducts` succeeds, the `next` value passes through `tap`, then the stream completes. `finalize` runs, setting `loading` to `false`.
      - If `mockFetchProducts` fails, the error goes to `catchError`. `catchError` handles it and returns `EMPTY`, which immediately completes the stream. `finalize` runs, setting `loading` to `false`.
      - If the component is destroyed _while_ the fetch is in progress, `takeUntilDestroyed` triggers unsubscription. `finalize` runs, setting `loading` to `false`.
    - `takeUntilDestroyed`: Handles automatic unsubscription.
4.  The `subscribe` block's `next` handler updates the `products` signal only on success.

No matter what happens – success, failure, or component destruction – the `finalize` block ensures that `this.loading.set(false)` is called, correctly cleaning up the UI loading state. This makes it much more reliable than trying to manage the loading flag in both the `error` and `complete`/`next` handlers of the `subscribe` block.

## Common Mistakes

**Resetting loading flags in `next` and `error` handlers.** That duo misses the third termination path: unsubscription (user navigates away mid-request). `finalize` covers all three with one line.

**Expecting outcome information.** The callback gets no arguments and cannot tell success from failure. Pair it with `catchError` (for the error branch) rather than encoding outcome logic in `finalize`.

**Forgetting it runs per subscription.** On a shared stream with three subscribers, each subscription's teardown triggers its own `finalize`. If the callback must run once per source execution, share the stream first.

## Interview Q&A

??? question "What is the difference between finalize and the complete handler?"

    The `complete` handler runs only on successful completion. `finalize` runs on completion, error, **and** unsubscribe, making it the RxJS analogue of `finally`. That unsubscribe coverage is exactly what UI cleanup needs.

??? question "When does finalize execute relative to other handlers?"

    After the terminal notification has been delivered: subscribers' `complete`/`error` handlers run first, then teardown logic including `finalize`. It observes the end; it cannot intercept or alter it.

??? question "How would you set a loading flag around an HTTP call, robustly?"

    Set it to `true` before subscribing, then `pipe(finalize(() => loading.set(false)))`. Success, HTTP error, and mid-flight component destruction all reset the flag; no path leaves a stuck spinner.

## Related

- [catchError](../error-handling/catchError.md) for the outcome-specific error branch
- [tap](tap.md) for side effects on individual notifications
- [takeUntil](../filtering/takeUntil.md), whose unsubscribe path finalize is designed to cover
