---
description: "What an Observable is, how streams emit values over time, and how Angular uses them for HTTP, forms, and routing."
tags:
  - Fundamentals
---

# Observable

Think of an **Observable** as a **stream** of data or events that happens over time. It's like subscribing to a newsletter or a YouTube channel. Once you subscribe, you start receiving updates (emails, new videos) whenever they are published. You can receive **zero, one, or many** updates over the lifetime of that subscription.

## Key Ideas

1.  **Stream of Values:** Unlike a function that returns a single value, or a Promise that resolves with a single value (or rejects), an Observable can emit multiple values over time.
2.  **Lazy:** Observables are "lazy." They don't start emitting values until someone actually subscribes to them. If nobody subscribes, the code that produces the values won't even run.
3.  **Asynchronous (or Synchronous):** They are often used for asynchronous operations (like fetching data from a server), but they can also emit values synchronously.
4.  **Cancellation:** You can "unsubscribe" from an Observable, meaning you stop listening to the stream. This is important for cleaning up resources and preventing memory leaks.

## Real-World Analogy

Imagine you've ordered food online.

- You place the order (this is like _creating_ the Observable).
- The system _doesn't_ start processing your order until you actually confirm it (like _subscribing_).
- Then, you get updates over time:
  - "Order received" (_first value_)
  - "Restaurant is preparing your food" (_second value_)
  - "Delivery partner assigned" (_third value_)
  - "Food is on the way" (_fourth value_)
  - "Delivered" (*fifth value, and maybe the stream *completes* here*)
- If something goes wrong (e.g., restaurant cancels), you get an error notification (_error_).
- You can choose to stop receiving notifications if you want (_unsubscribe_).

## How It's Used in Angular

1.  **Fetching Data with `HttpClient`:** This is the most common use case. When you make an HTTP request using Angular's `HttpClient`, it returns an Observable. You subscribe to this Observable to get the response from the server.

    #### Service (`data.service.ts`):

    ```typescript
    import { Injectable, inject } from "@angular/core";
    import { HttpClient } from "@angular/common/http";
    import { Observable } from "rxjs";

    @Injectable({
      providedIn: "root",
    })
    export class DataService {
      private readonly http = inject(HttpClient);
      private readonly apiUrl = "https://api.example.com/items";

      getItems(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
      }
    }
    ```

    #### Component (`my-component.component.ts`):

    ```typescript
    import { Component, inject, signal } from "@angular/core";
    import { DataService } from "./data.service";
    import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

    @Component({
      selector: "app-my-component",
      template: `
        <ul>
          @for (item of items(); track item.name) {
            <li>{{ item.name }}</li>
          }
        </ul>
        @if (errorMsg()) {
          <div>{{ errorMsg() }}</div>
        }
      `,
    })
    export class MyComponentComponent {
      private readonly dataService = inject(DataService);
      readonly items = signal<any[]>([]);
      readonly errorMsg = signal("");

      constructor() {
        this.dataService
          .getItems()
          .pipe(takeUntilDestroyed())
          .subscribe({
            next: (data) => {
              this.items.set(data);
              console.log("Data received:", data);
            },
            error: (error) => {
              this.errorMsg.set("Failed to load items.");
              console.error("Error fetching items:", error);
            },
            complete: () => {
              console.log("Finished fetching items.");
            },
          });
      }
    }
    ```

2.  **Reactive Forms:** Listening to changes in form input values (`valueChanges`) or status (`statusChanges`).
3.  **Router Events:** Subscribing to events from the Angular Router to know when navigation starts, ends, or fails.

In simple terms, an Observable is a powerful way to handle sequences of events or data over time in a manageable way. You subscribe to listen, receive values/errors, and can unsubscribe when you're done.

## Interview Q&A

??? question "What makes an Observable lazy, and why does it matter?"

    The producer function inside an Observable runs only when `subscribe()` is called, once per subscription. Nothing happens until then: `http.get(...)` alone sends no request. This laziness enables composition (build pipelines first, run later), per-subscriber executions, and cancellation.

??? question "An Observable can deliver how many values, and which terminal events exist?"

    Zero to infinite `next` values, terminated by at most one of `error` or `complete` (mutually exclusive). After either terminal event, nothing else is delivered. This "Observable contract" underpins every operator's behavior.

??? question "Where does Angular hand you Observables out of the box?"

    `HttpClient` requests, reactive forms (`valueChanges`, `statusChanges`), router events and `paramMap`, and `EventEmitter` under the hood. Knowing these makes RxJS unavoidable, and worth mastering, in Angular interviews.

## Next Up

- [Observer](observer.md): the consumer side of the stream
- [Cold Observables](cold-observables.md) and [Hot Observables](hot-observables.md): how executions are shared
- [Promise vs Observable](promise-vs-observable.md): the classic comparison
