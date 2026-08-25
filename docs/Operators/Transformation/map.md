---
description: "Transform each emitted value with a projection function."
tags:
  - Operators
  - Transformation
---

# map

The `map()` operator is a **transformation operator**. Its job is to transform each value emitted by a source Observable into a _new_ value based on a function you provide. It then emits this new, transformed value.

Think of it exactly like the `Array.prototype.map()` method you use with JavaScript arrays, but applied to values arriving over time in an Observable stream. For every single item that comes out of the source Observable, `map` applies your function to it and sends the result downstream.

!!! abstract "At a glance"

    - **Signature:** `map(project: (value, index) => result)`
    - **Use when:** each emission needs reshaping: picking fields, computing derived values, normalizing API responses
    - **Avoid when:** the transformation itself is asynchronous; that is higher-order mapping (`switchMap` and friends)
    - **Top gotcha:** RxJS `map` transforms one emission, not an array; an emitted array is a single value, so use `Array.map` inside it

## Key Characteristics

- **Transforms Values:** Changes the data passing through the stream.
- **One-to-One Emission:** For each value received from the source, it emits exactly one transformed value.
- **Takes a Project Function:** You provide a function `map(projectFn)` where `projectFn` takes the source value as input and returns the transformed value.
- **Preserves Timing/Order:** It doesn't delay emissions or change their order; it just modifies the data _within_ each emission.
- **Passes Through Errors/Completion:** If the source Observable errors or completes, `map` simply passes those notifications along.

## Minimal Example

```typescript
import { from, map } from "rxjs";

from([1, 2, 3])
  .pipe(map((n) => n * 10))
  .subscribe(console.log);

// Output:
// 10
// 20
// 30
```

## Real-World Example Scenario (Very Common in Angular)

Imagine you're fetching data from an API using Angular's `HttpClient`. The API might return a complex object or an array of objects with many properties, but your component only needs a specific piece of that data, or needs it in a slightly different format.

**Scenario:** Let's say you fetch a list of products from an API. The API returns an array of product objects, each looking like this:

```json
{
  "productId": "XYZ-123",
  "productName": "Super Widget",
  "price": {
    "amount": 99.99,
    "currency": "USD"
  },
  "stock": 50,
  "category": "Widgets"
}
```

Your component, however, only needs to display a simple list of product names (e.g., `["Super Widget", "Mega Gadget"]`). You can use `map()` to transform the raw API response (array of complex objects) into the desired array of strings.

## Angular Example

```typescript
// product.service.ts
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";

interface RawProduct {
  productId: string;
  productName: string;
  price: { amount: number; currency: string };
  stock: number;
  category: string;
}

@Injectable({ providedIn: "root" })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = "/api/products";

  // Observable<RawProduct[]> -> Observable<string[]>
  getProductNames(): Observable<string[]> {
    return this.http.get<RawProduct[]>(this.apiUrl).pipe(
      // the emitted value is the WHOLE array; reshape it with Array.map inside
      map((products) => products.map((product) => product.productName)),
    );
  }

  getActiveProductSummaries(): Observable<{ name: string; price: number }[]> {
    return this.http
      .get<RawProduct[]>(this.apiUrl)
      .pipe(
        map((products) =>
          products
            .filter((p) => p.stock > 0)
            .map((p) => ({
              name: p.productName.toUpperCase(),
              price: p.price.amount,
            })),
        ),
      );
  }
}

// product-list.component.ts
import { Component, inject } from "@angular/core";
import { AsyncPipe, CurrencyPipe } from "@angular/common";
import { ProductService } from "./product.service";

@Component({
  selector: "app-product-list",
  imports: [AsyncPipe, CurrencyPipe],
  template: `
    <h4>Product Names</h4>
    @if (productNames$ | async; as names) {
      <ul>
        @for (name of names; track name) {
          <li>{{ name }}</li>
        }
      </ul>
    } @else {
      <p>Loading product names...</p>
    }

    <h4>Active Product Summaries</h4>
    @if (productSummaries$ | async; as summaries) {
      <ul>
        @for (summary of summaries; track summary.name) {
          <li>{{ summary.name }} - {{ summary.price | currency }}</li>
        }
      </ul>
    } @else {
      <p>Loading summaries...</p>
    }
  `,
})
export class ProductListComponent {
  private readonly productService = inject(ProductService);

  protected readonly productNames$ = this.productService.getProductNames();
  protected readonly productSummaries$ =
    this.productService.getActiveProductSummaries();
}
```

**How it works:**

1. `http.get` emits **one value**: the whole `RawProduct[]` array.
2. The RxJS `map` receives that array and returns a new value for the emission; inside it, plain `Array.map`/`Array.filter` reshape the data.
3. The service exposes ready-to-render shapes, so components stay simple: they just bind with the `async` pipe, which subscribes and unsubscribes automatically.

## Common Mistakes

**Confusing RxJS `map` with `Array.map`.** If the stream emits an array, `map` gets the entire array as one value. Transforming each element requires `Array.map` inside the projection, as in the example.

**Returning an Observable from `map`.** `map(v => this.http.get(...))` gives you a stream of Observables, not their results. When the projection is asynchronous, you need [`switchMap`](switchMap.md), [`mergeMap`](mergeMap.md), or [`concatMap`](concatMap.md).

**Doing side effects in `map`.** Setting component state or logging inside `map` hides effects where nobody expects them. Keep `map` pure and use [`tap`](../utility/tap.md) for side effects.

## Interview Q&A

??? question "What is the difference between RxJS map and Array.prototype.map?"

    `Array.map` transforms elements of an array synchronously, producing a new array. RxJS `map` transforms each **emission** of a stream over time, producing a new stream. If a stream emits an array, RxJS `map` sees the whole array as one value.

??? question "What happens if the projection function throws?"

    The error is caught by RxJS and sent down the stream as an error notification: subscribers' `error` handler runs and the stream terminates. Recovery requires an error operator like `catchError` downstream.

??? question "When do you need switchMap instead of map?"

    When the transformation itself returns an Observable (an HTTP call, a timer). `map` would emit that Observable as a value; higher-order operators subscribe to it and flatten the result into the output stream.

## Related

- [switchMap](switchMap.md), [mergeMap](mergeMap.md), [concatMap](concatMap.md) when the projection is asynchronous
- [filter](../filtering/filter.md) to drop emissions instead of reshaping them
- [tap](../utility/tap.md) for side effects that should not change the value

## Summary

`map()` is your go-to tool whenever you need to change the _shape_ or _content_ of individual items flowing through your Observable stream without affecting the stream's overall timing or structure.
