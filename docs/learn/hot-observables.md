---
description: "Hot Observables share one live stream, like DOM events. Learn what late subscribers miss and why."
tags:
  - Fundamentals
---

# Hot Observables

A **Hot Observable** is one that produces values **even if no one is subscribed** to it. It's like a live broadcast – it's happening whether you tune in or not.

When you subscribe to a hot Observable, you start receiving values from that point forward. You **miss any values** that were emitted _before_ you subscribed.

## Key Characteristics

1.  **Eager Execution (Potentially):** The source of values might start producing immediately (like UI events) or based on some external trigger, not necessarily tied to the first subscription.
2.  **Shared Execution:** All subscribers listen to the _same_ stream of values. When the Observable emits a value, all current subscribers receive that same value simultaneously.

## Real-World Analogy

- **Live Radio Broadcast:**

      - The radio station is broadcasting music or talk shows continuously (_producing values_).

       - When you tune your radio to that station (_subscribe_), you start hearing whatever is being broadcast _at that moment_. You don't get to hear the beginning of the song or show that started before you tuned in.

      - Everyone else listening to the same station at the same time hears the exact same broadcast (_shared execution_).

- **Mouse Clicks on a Web Page:**

      - The browser generates mouse click events whenever and wherever the user clicks, regardless of whether your specific code is listening for them yet.

      - If you attach an event listener (_subscribe_) to a button at some point, you will only capture the clicks that happen _after_ your listener is active. Clicks that happened before are lost (to your listener).

## Contrast with Cold Observables

Remember, Cold Observables only start when you subscribe, and each subscription gets its own independent run from the beginning (like watching a recorded YouTube video). Hot Observables are live and shared.

## Examples in Angular/RxJS

1.  **DOM Events using `fromEvent`:** Observables created from browser events are inherently hot: the events happen whether or not anyone subscribed, and late subscribers miss earlier clicks. (One precision worth knowing: each `fromEvent` subscriber installs its **own** event listener, so the subscription itself is unicast; see [Unicast vs Multicast](unicast-vs-multicast.md).)

    ```typescript
    import {
      Component,
      DestroyRef,
      ElementRef,
      afterNextRender,
      inject,
      viewChild,
    } from "@angular/core";
    import { fromEvent, map } from "rxjs";
    import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

    @Component({
      selector: "app-hot-example",
      template: `
        <button #myButton>Click Me</button>
        <p>Check console log.</p>
      `,
    })
    export class HotExampleComponent {
      private readonly myButton =
        viewChild.required<ElementRef<HTMLButtonElement>>("myButton");
      private readonly destroyRef = inject(DestroyRef);

      constructor() {
        // afterNextRender guarantees the button exists in the DOM
        afterNextRender(() => {
          // Create a HOT observable from click events
          const buttonClicks$ = fromEvent(
            this.myButton().nativeElement,
            "click",
          ).pipe(map(() => `Clicked at ${new Date().toLocaleTimeString()}`));

          console.log(
            "Component rendered. Try clicking the button now - nothing logged yet.",
          );
          console.log("Subscribing to clicks in 5 seconds...");

          setTimeout(() => {
            console.log("Subscribing now!");
            buttonClicks$
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe((message) => console.log(message));
          }, 5000);
        });
      }
    }

    // If you click the button in the first 5 seconds, the clicks happen,
    // but the console.log inside the subscribe won't show anything
    // because the subscription isn't active yet. Clicks after 5 seconds will be logged.
    ```

2.  **Subjects:** RxJS `Subject` and its variations (`BehaviorSubject`, `ReplaySubject`) are used to create hot, multicast Observables. They are often used for state management or communication between different parts of an Angular application.

3.  **Making Cold Observables Hot (`share`, `shareReplay`):** Sometimes you have a cold Observable (like `HttpClient`) but want to share its single execution among multiple subscribers. Operators like `shareReplay()` make the source Observable hot.
    - **Use Case:** Imagine multiple parts of your UI need the same user profile data. You only want to fetch it via HTTP once.

    ```typescript
    import { Injectable, inject } from "@angular/core";
    import { HttpClient } from "@angular/common/http";
    import { Observable, shareReplay } from "rxjs";

    @Injectable({ providedIn: "root" })
    export class UserService {
      private readonly http = inject(HttpClient);

      // Shared observable for user profile.
      // HTTP call is made once, result is cached and replayed to all subscribers.
      private readonly userProfile$: Observable<any>;

      constructor() {
        console.log("UserService: Setting up shared user profile fetch.");
        this.userProfile$ = this.http.get("/api/user/profile").pipe(
          shareReplay(1), // Cache the latest value and share across subscribers
        );
      }

      // Expose the shared observable so components get the cached result
      getUserProfile(): Observable<any> {
        console.log(
          "UserService: getUserProfile called, returning shared observable.",
        );
        return this.userProfile$;
      }
    }

    // Component A calls getUserProfile().subscribe() -> Triggers HTTP request.
    // Component B calls getUserProfile().subscribe() -> Does NOT trigger HTTP, gets the same result (or waits for the ongoing one).
    ```

## Summary

Think of **Hot Observables** as live, shared streams. They are active regardless of listeners, and subscribers tune in to the ongoing broadcast, potentially missing past events. They are common for UI events, real-time data, and scenarios where you explicitly want to share a single data source execution among multiple consumers using subjects or operators like `shareReplay`.

## Interview Q&A

??? question "What is the practical definition of hot vs cold?"

    Cold: the producer is created inside the Observable, once per subscriber (each subscription = fresh execution). Hot: the producer exists outside and is shared; subscribers join an already-live stream and miss earlier values. The question "where is the producer created?" resolves almost every hot/cold puzzle.

??? question "How do you turn a cold Observable hot in practice?"

    Multicast it: pipe through [`share`](../subjects/share.md) (live-only) or [`shareReplay`](../subjects/shareReplay.md) (with catch-up buffer), or push its values through a [Subject](../subjects/subject.md). This is exactly the "one HTTP request, many consumers" pattern.

??? question "Is fromEvent hot or cold, and what about Subjects?"

    Both are hot in effect. The DOM event source exists independently of subscribers (events fire regardless), and Subjects push to whoever is subscribed at emission time. Neither replays missed values, unlike `ReplaySubject`.

## Next Up

- [Cold Observables](cold-observables.md), the per-subscriber counterpart
- [Subjects & Multicasting](../subjects/index.md), the tools that make streams hot
- [shareReplay](../subjects/shareReplay.md) for hot with catch-up
