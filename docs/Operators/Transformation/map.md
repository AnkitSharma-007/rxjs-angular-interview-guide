# map

The `map()` operator is a **transformation operator**. Its job is to transform each value emitted by a source Observable into a _new_ value based on a function you provide. It then emits this new, transformed value.

Think of it exactly like the `Array.prototype.map()` method you use with JavaScript arrays, but applied to values arriving over time in an Observable stream. For every single item that comes out of the source Observable, `map` applies your function to it and sends the result downstream.

## Key Characteristics

- **Transforms Values:** Changes the data passing through the stream.
- **One-to-One Emission:** For each value received from the source, it emits exactly one transformed value.
- **Takes a Project Function:** You provide a function `map(projectFn)` where `projectFn` takes the source value as input and returns the transformed value.
- **Preserves Timing/Order:** It doesn't delay emissions or change their order; it just modifies the data _within_ each emission.
- **Passes Through Errors/Completion:** If the source Observable errors or completes, `map` simply passes those notifications along.

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

## Code Snippet (Angular Service and Component)

```typescript
// product.service.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators"; // Import the map operator

// Define an interface for the raw API response structure (good practice)
interface RawProduct {
  productId: string;
  productName: string;
  price: {
    amount: number;
    currency: string;
  };
  stock: number;
  category: string;
}

@Injectable({
  providedIn: "root",
})
export class ProductService {
  private apiUrl = "/api/products"; // Your actual API endpoint

  constructor(private http: HttpClient) {}

  // Method to get only the product names as an Observable<string[]>
  getProductNames(): Observable<string[]> {
    console.log(
      `Workspaceing products from API at ${new Date().toLocaleTimeString(
        "en-IN",
        { timeZone: "Asia/Kolkata" }
      )} (IST)...`
    );

    return this.http.get<RawProduct[]>(this.apiUrl).pipe(
      // Use the map operator to transform the response
      map((products: RawProduct[]) => {
        // This function is executed when the HTTP request succeeds
        // 'products' here is the array of RawProduct objects from the API
        console.log("API returned raw products:", products);

        // Use JavaScript's Array.map to transform the array internally
        const names = products.map((product) => product.productName);

        console.log("Transformed raw products into names:", names);
        // Return the transformed array of names
        return names;
      })
      // You could chain other operators here if needed, like filter, catchError etc.
    );
  }

  // Example of fetching slightly more complex transformed data
  getActiveProductSummaries(): Observable<{ name: string; price: number }[]> {
    return this.http.get<RawProduct[]>(this.apiUrl).pipe(
      map((products) =>
        products
          .filter((p) => p.stock > 0) // First filter only active products
          .map((p) => ({
            // Then map to the desired summary object
            name: p.productName.toUpperCase(), // Also transform name to uppercase
            price: p.price.amount,
          }))
      )
    );
  }
}

// product-list.component.ts
import { Component, OnInit } from "@angular/core";
import { ProductService } from "./product.service";
import { Observable } from "rxjs";

@Component({
  selector: "app-product-list",
  template: `
    <h4>Product Names</h4>
    <ul *ngIf="productNames$ | async as names; else loading">
      <li *ngFor="let name of names">{{ name }}</li>
    </ul>
    <ng-template #loading>Loading product names...</ng-template>

    <h4>Active Product Summaries</h4>
    <ul *ngIf="productSummaries$ | async as summaries; else loadingSummaries">
      <li *ngFor="let summary of summaries">
        {{ summary.name }} - Price: {{ summary.price | currency : "INR" }}
      </li>
    </ul>
    <ng-template #loadingSummaries>Loading summaries...</ng-template>
  `,
})
export class ProductListComponent implements OnInit {
  productNames$: Observable<string[]> | undefined;
  productSummaries$: Observable<{ name: string; price: number }[]> | undefined;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // Get the observable stream of product names (already transformed by map in the service)
    this.productNames$ = this.productService.getProductNames();
    this.productSummaries$ = this.productService.getActiveProductSummaries();
  }
}
```

**Explanation:**

1.  **`import { map } from 'rxjs/operators';`**: We import the `map` operator.
2.  **`this.http.get<RawProduct[]>(this.apiUrl).pipe(...)`**: We make the HTTP request, which returns an `Observable<RawProduct[]>`. We use `.pipe()` to chain operators onto it.
3.  **`map((products: RawProduct[]) => { ... })`**: We apply the `map` operator. The function inside `map` receives the emitted value from the source Observable – in this case, the array of `RawProduct` objects (`products`).
4.  **`products.map(product => product.productName)`**: Inside the RxJS `map` function, we use the standard JavaScript `Array.map` method to iterate over the `products` array and pull out only the `productName` from each object.
5.  **`return names;`**: The RxJS `map` operator takes the result of its inner function (the `names` array) and emits that as its own output value.
6.  **Result:** The `getProductNames()` method now returns an `Observable<string[]>`, which directly provides the data structure the component needs, thanks to the `map` operator doing the transformation in the service. The second example (`getActiveProductSummaries`) shows combining `filter` and `map` within the RxJS `map` operator's projection function for more complex transformations.

## Summary

`map()` is your go-to tool whenever you need to change the _shape_ or _content_ of individual items flowing through your Observable stream without affecting the stream's overall timing or structure.
