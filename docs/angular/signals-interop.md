---
description: "toSignal, toObservable, and how to decide when signals replace RxJS in Angular."
tags:
  - Angular
---

# Signals & RxJS Interop

Angular now has two reactive systems: **signals** for synchronous state and **RxJS** for asynchronous streams and event orchestration. `@angular/core/rxjs-interop` bridges them with `toSignal` and `toObservable`, and the modern interview question is no longer "what is an Observable" but "when do you use which".

!!! abstract "At a glance"

    - **`toSignal(obs$, opts)`:** subscribes immediately, exposes the latest value as a signal, unsubscribes when the injection context is destroyed
    - **`toObservable(signal)`:** emits the signal's value on change, as a stream, using an effect under the hood
    - **Rule of thumb:** state that *is* something → signal; things that *happen* over time (events, requests, retries, debouncing) → RxJS
    - **Top gotcha:** `toObservable` coalesces synchronous updates; rapid intermediate signal values are not individually emitted

## The Division of Labor

| Concern                              | Reach for                   |
| ------------------------------------ | --------------------------- |
| Current value templates render       | Signal                      |
| Derived synchronous state            | `computed()`                |
| HTTP requests, cancellation, retries | RxJS                        |
| Debouncing, throttling, timing       | RxJS                        |
| Combining event streams              | RxJS                        |
| Bridging the two                     | `toSignal` / `toObservable` |

The productive pattern in modern components: **RxJS at the edges (async orchestration), signals at the surface (template state)**.

## toSignal: Stream In, Signal Out

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";

@Component({
  selector: "app-profile",
  template: `
    @if (user(); as u) {
      <h2>{{ u.name }}</h2>
    } @else {
      <p>Loading...</p>
    }
  `,
})
export class ProfileComponent {
  private readonly http = inject(HttpClient);

  // subscribes NOW, cleans up on destroy, exposes the latest value
  protected readonly user = toSignal(
    this.http.get<{ name: string }>("/api/me"),
  );
}
```

The value options matter and interviewers probe them:

- **No option:** the signal's type includes `undefined` until the first emission.
- **`{ initialValue: x }`:** no `undefined`; `x` until the stream emits.
- **`{ requireSync: true }`:** the stream must emit synchronously at subscribe (a `BehaviorSubject`, or anything piped through [`startWith`](../operators/combination/startWith.md)); otherwise it throws.

Two behaviors to know: `toSignal` subscribes **eagerly** (not on first read), and if the source **errors**, reading the signal throws that error. It needs an injection context (or an explicit `injector` option) to schedule its cleanup.

## toObservable: Signal In, Stream Out

Use it when signal-shaped state must drive stream-shaped work, the classic case being a signal input feeding a debounced search:

```typescript
import { Component, inject, input } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs";

@Component({
  selector: "app-results",
  template: `
    <ul>
      @for (r of results(); track r) {
        <li>{{ r }}</li>
      }
    </ul>
  `,
})
export class ResultsComponent {
  private readonly http = inject(HttpClient);

  readonly query = input.required<string>(); // signal input from the parent

  // signal -> stream -> debounced, cancelled HTTP -> signal
  protected readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) =>
        this.http.get<string[]>("/api/search", { params: { q } }),
      ),
    ),
    { initialValue: [] },
  );
}
```

**Coalescing caveat:** `toObservable` observes the signal with an effect, so several synchronous `set()` calls produce **one** emission with the final value. It is a state bridge, not an event log; if every event matters, keep a `Subject` as the source of truth.

## Common Mistakes

**Calling `toSignal` outside an injection context.** In a method or callback it throws (or, with a manually passed injector, silently creates long-lived subscriptions per call). Create interop signals in field initializers or the constructor.

**Expecting `toObservable` to emit every intermediate value.** `set(1); set(2); set(3)` synchronously yields a single emission of `3`. Event semantics need a Subject, not a signal bridge.

**Rebuilding RxJS features on signals.** Debounce, retry, cancellation, and race-condition control are stream problems. A signal + `effect` + `setTimeout` re-implementation of `debounceTime` is an anti-pattern interviewers increasingly test for.

## Interview Q&A

??? question "When would you still choose RxJS in a signals-first codebase?"

    Whenever *time* or *events* are involved: HTTP orchestration with cancellation (`switchMap`), debouncing and throttling, retries and backoff, combining event sources, WebSocket streams. Signals hold the resulting state; RxJS produces it.

??? question "What are the three initial-value strategies for toSignal?"

    Default (type includes `undefined` until first emission), `initialValue` (explicit placeholder, no `undefined` in the type), and `requireSync: true` (source must emit synchronously or it throws; pairs with `BehaviorSubject` or `startWith`). Choosing deliberately shows real-world use.

??? question "What happens if the Observable behind toSignal errors?"

    The error is rethrown when the signal is read, typically during change detection. Production pipelines should `catchError` into a safe value before the bridge, exactly like the async pipe story.

## Related

- [Async Pipe](async-pipe.md), the template-side alternative to toSignal
- [BehaviorSubject](../subjects/behaviorSubject.md), the RxJS state-holder signals often replace
- [switchMap](../operators/transformation/switchMap.md) and [debounceTime](../operators/filtering/debounceTime.md), the stream tools worth bridging for
