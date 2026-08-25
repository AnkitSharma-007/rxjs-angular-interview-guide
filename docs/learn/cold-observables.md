---
description: "Cold Observables run fresh for every subscriber. Learn why HTTP requests restart per subscription."
tags:
  - Fundamentals
---

# Cold Observables

A **Cold Observable** is one where the data producer (the logic inside the Observable) doesn't start running or emitting values **until** you subscribe to it.

Crucially, **each time you subscribe** to a cold Observable, it starts its work from the very beginning and generates a **fresh, independent sequence of values** just for that subscriber.

## Key Characteristics

1.  **Lazy Execution:** The code that produces values only runs when `subscribe()` is called. No subscription = no execution.
2.  **Independent Execution per Subscriber:** Every subscriber gets their own private stream of data. What happens in one subscription doesn't affect another.

## Real-World Analogy

1.  **Watching a YouTube Video (On-Demand):**
    - When you click "Play" on a video (you _subscribe_), the video stream starts playing from the beginning _just for you_.
    - If your friend clicks "Play" on the same video later (another _subscription_), they also get the video starting from the beginning, completely independent of your playback.
    - The YouTube server (the _Observable_) delivers a separate, unique stream to each viewer (each _subscriber_).

2.  **Playing a DVD or Blu-ray:**
    - Putting the disc in the player and pressing play (_subscribing_) starts the movie from the beginning.
    - Every time someone does this with their own player (_another subscription_), the movie starts fresh for them.

## Examples in Angular/RxJS

1.  **`HttpClient` (Very Common):**
    - Observables returned by Angular's `HttpClient` (e.g., `http.get()`, `http.post()`) are **cold**.
    - Every time you `subscribe()` to `dataService.getItems()`, Angular makes a **new HTTP request** to the server.
    - If Component A subscribes and Component B subscribes to the _same_ service call, **two separate** network requests will be made.

    ```typescript
    // In some component:
    ngOnInit() {
      console.log("Subscribing first time to getItems...");
      this.dataService.getItems().subscribe(data => {
        console.log("First subscription received data.");
      });

      // Some time later, maybe in response to a user action
      console.log("Subscribing second time to getItems...");
      this.dataService.getItems().subscribe(data => {
        console.log("Second subscription received data."); // This triggers a NEW HTTP request
      });
    }
    ```

2.  **Basic Creation Functions:** Many RxJS creation functions like `of()`, `from()`, `range()`, `timer()`, `interval()` typically create cold Observables.

    ```typescript
    import { interval } from "rxjs";

    // interval(1000) emits 0, 1, 2... every second
    const coldInterval = interval(1000);

    console.log("Subscribing A");
    const subA = coldInterval.subscribe((val) => console.log(`Sub A: ${val}`)); // Starts a timer for A

    setTimeout(() => {
      console.log("Subscribing B");
      const subB = coldInterval.subscribe((val) =>
        console.log(`Sub B: ${val}`),
      ); // Starts a NEW timer for B
    }, 3000);

    // Output will show:
    // Subscribing A
    // Sub A: 0 (at 1s)
    // Sub A: 1 (at 2s)
    // Sub A: 2 (at 3s)
    // Subscribing B
    // Sub B: 0 (at 4s, because B's timer started at 3s)
    // Sub A: 3 (at 4s)
    // Sub B: 1 (at 5s)
    // Sub A: 4 (at 5s)
    // ... and so on. A and B have independent timers.
    ```

## Summary

Think of **Cold Observables** as blueprints or recipes for generating data streams. Each time you ask for the stream (by subscribing), the recipe is followed from the start, creating a unique instance just for you. Most Observables you deal with for one-off tasks like API calls are cold.

## Interview Q&A

??? question "Two components use the async pipe on the same service Observable and the API is hit twice. Why, and what is the fix?"

    Because `HttpClient` Observables are cold: each subscription (each async pipe) runs a fresh execution, hence a fresh request. Share one execution by piping the service stream through [`shareReplay({ bufferSize: 1, refCount: true })`](../subjects/shareReplay.md), or convert it to a signal once with `toSignal`.

??? question "What exactly is created per subscription in a cold Observable?"

    The producer itself: the interval timer, the HTTP request, the WebSocket connection defined inside the Observable. Cold means "producer created inside, per subscriber"; hot means "producer exists outside, shared by all subscribers".

??? question "Are all RxJS creation functions cold?"

    Most are (`of`, `from`, `interval`, `timer`, `defer`, `HttpClient` calls). `fromEvent` wraps an external event source, and Subjects push regardless of subscribers, so those behave hot. Operators like `share` convert cold streams into hot ones.

## Next Up

- [Hot Observables](hot-observables.md): the shared, live counterpart
- [share](../subjects/share.md) and [shareReplay](../subjects/shareReplay.md): making cold streams hot on purpose
- [Promise vs Observable](promise-vs-observable.md): laziness as an interview theme
