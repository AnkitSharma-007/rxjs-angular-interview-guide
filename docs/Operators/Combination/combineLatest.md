# combineLatest

The `combineLatest()` operator is used when you have multiple streams of data (Observables) and you want to combine their latest values into a single stream.

Think of it like this: You're waiting for several pieces of information to arrive. `combineLatest()` waits until it has received _at least one_ piece of information from _every_ source it's watching. Once it has that initial set, it gives you an array containing the latest value from each source.

After that initial combination, _any time_ any _one_ of the sources sends out a new piece of information, `combineLatest()` immediately sends out a _new_ array containing that new value along with the most recent values it remembers from all the _other_ sources.

## Key Characteristics

1.  **Waits for Initial Values:** It won't emit anything until _all_ input Observables have emitted at least one value.
2.  **Emits Latest Combination:** Once initialized, it emits an array containing the most recent value from each input Observable.
3.  **Reacts to Any Input:** As soon as _any_ of the input Observables emits a new value, `combineLatest` emits a new array with the updated combination.

## Real-World Analogy

Imagine a dashboard displaying:

- The current stock price for "Company A".
- The current user's selected currency (e.g., USD, EUR, INR).

You need _both_ the latest price _and_ the selected currency to display the price correctly formatted.

- `combineLatest()` would wait until it receives the first stock price update AND the first currency selection.
- Once it has both, it emits `[latestPrice, latestCurrency]`.
- If the stock price updates, it immediately emits `[newPrice, latestCurrency]`.
- If the user changes the currency, it immediately emits `[latestPrice, newCurrency]`.

## Angular Example: Combining Route Parameter and User Settings

Let's say you have a component that displays product details. The product ID comes from the route URL, and you also have a user setting for whether to show prices in bold.

```typescript
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { combineLatest, Observable, timer } from "rxjs";
import {
  map,
  switchMap,
  distinctUntilChanged,
  filter,
  delay,
} from "rxjs/operators";
import { Injectable } from "@angular/core";
import { of } from "rxjs";

@Injectable({ providedIn: "root" })
export class ProductService {
  getProduct(id: string): Observable<any> {
    console.log(`API: Fetching product ${id}`);
    return of({
      id: id,
      name: `Product ${id}`,
      price: Math.random() * 100,
    }).pipe(delay(300));
  }
}

@Injectable({ providedIn: "root" })
export class UserSettingsService {
  getSettings(): Observable<{ boldPrice: boolean }> {
    return timer(0, 5000).pipe(map((i) => ({ boldPrice: i % 2 === 0 })));
  }
}

@Component({
  selector: "app-product-detail",
  template: `
    <div *ngIf="data$ | async as data">
      <h2>{{ data.product.name }}</h2>
      <p [style.fontWeight]="data.settings.boldPrice ? 'bold' : 'normal'">
        Price: {{ data.product.price | currency }}
      </p>
    </div>
    <p *ngIf="!(data$ | async)">Loading product details...</p>
  `,
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private userSettingsService = inject(UserSettingsService);

  data$!: Observable<{ product: any; settings: { boldPrice: boolean } }>;

  ngOnInit() {
    const productId$ = this.route.paramMap.pipe(
      map((params) => params.get("productId")),
      filter((id): id is string => !!id),
      distinctUntilChanged()
    );

    const settings$ = this.userSettingsService.getSettings();

    this.data$ = combineLatest([productId$, settings$]).pipe(
      switchMap(([id, settings]) =>
        this.productService
          .getProduct(id)
          .pipe(map((product) => ({ product, settings })))
      )
    );
  }
}
```

**In this example:**

1.  We get the `productId` from the route parameters. `distinctUntilChanged` prevents unnecessary work if the route emits the same ID multiple times.
2.  We get the `settings` from a service.
3.  `combineLatest` waits for both the _first_ valid `productId` and the _first_ `settings` emission.
4.  When both are available, or when _either_ the `productId` changes _or_ the `settings` update, `combineLatest` emits `[latestId, latestSettings]`.
5.  `switchMap` takes this latest combination. It uses the `latestId` to fetch the corresponding product data. If the `productId` changes while a previous product fetch is still in progress, `switchMap` cancels the old fetch and starts a new one for the new ID.
6.  Finally, we `map` the result to create an object `{ product, settings }` that's easy to use in the template with the `async` pipe. The template automatically updates whenever `data$` emits a new object, whether due to a product change or a setting change.

## Summary

use `combineLatest()` when you need to react to changes from multiple independent sources and always need the _most recent_ value from each of them to perform a calculation or update the UI.
