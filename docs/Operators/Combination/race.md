---
description: "Subscribe to several sources and mirror whichever produces a notification first: fastest-wins."
tags:
  - Operators
  - Combination
---

# race

`race()` subscribes to several Observables at once and commits to whichever one produces a notification **first**. The others are immediately unsubscribed, and from that point the result mirrors the winner completely: its values, its error, its completion.

Think of sprinters on a track: the starting gun is your subscription, and the moment one runner crosses the first checkpoint, everyone else is sent home.

!!! abstract "At a glance"

    - **Signature:** `race(...sources)` (creation function) or `source$.pipe(raceWith(...others))`
    - **Use when:** several sources can produce the answer and only the fastest matters: mirror endpoints, cache vs network, fallback timers
    - **Avoid when:** you need values from all sources (`merge`, `combineLatest`, `forkJoin`), not just the quickest
    - **Top gotcha:** the race is settled by the first **notification** of any kind, so a source that errors or completes early "wins" and ends everything

## How it works

1. All sources are subscribed at the same time.
2. The first source to deliver a notification wins, and every other source is unsubscribed.
3. The result then behaves exactly like the winner. There is no second place.

The winner is decided by any notification, not just a value. A source that **errors** first propagates that error even if another source was about to emit. A source that **completes** first (like `EMPTY`) makes the whole race complete empty.

## Minimal Example

```typescript
import { race, timer, map } from "rxjs";

const fast$ = timer(100).pipe(map(() => "fast wins"));
const slow$ = timer(500).pipe(map(() => "slow wins"));

race(fast$, slow$).subscribe(console.log);
// fast wins
// (slow$ was unsubscribed at t=100 and never ran to completion)
```

## Angular Example: Fastest Mirror Endpoint

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { race, catchError, of } from "rxjs";

interface StatusResponse {
  region: string;
  healthy: boolean;
}

@Component({
  selector: "app-status-banner",
  template: `
    @if (info(); as info) {
      <p>
        Served from {{ info.region }}: {{ info.healthy ? "OK" : "degraded" }}
      </p>
    } @else {
      <p>Checking status...</p>
    }
  `,
})
export class StatusBannerComponent {
  private readonly http = inject(HttpClient);

  protected readonly info = toSignal(
    race(
      this.http.get<StatusResponse>("https://eu.api.example.com/status"),
      this.http.get<StatusResponse>("https://us.api.example.com/status"),
    ).pipe(catchError(() => of({ region: "unknown", healthy: false }))),
    { initialValue: undefined },
  );
}
```

**How it works:** both regional requests fire in parallel and the first response wins; the slower request is cancelled the moment the winner's body arrives. The `catchError` sits **after** the race on purpose: if the fastest notification is an error, it settles the race, so recovery has to happen downstream (or per-source, before the race, if one mirror failing should let the other keep running).

## Common Mistakes

**Assuming errors lose the race.** They do not. The first notification wins even when it is an error. If you want "first successful response", guard each contender with its own `catchError(() => NEVER)` style handling before racing, so a failing source silently drops out instead of poisoning the result.

**Racing sources that emit synchronously.** If a contender emits at subscription time (`of(...)`, a `BehaviorSubject`), it always wins because it notifies before the others get a chance. Order matters then: the first synchronous source in the argument list takes it.

**Reaching for race when you want a timeout.** `race(data$, timer(5000).pipe(...))` works, but the [`timeout`](../utility/timeout.md) operator says the same thing more directly, with a proper `TimeoutError` and a `with` fallback option.

## Interview Q&A

??? question "What exactly decides the winner?"

    The first notification of any kind: next, error, or complete. A source erroring before anyone emits propagates the error; a source completing instantly (like `EMPTY`) completes the race empty. Only after the winner is chosen are the losers unsubscribed.

??? question "race vs merge?"

    `merge` keeps all sources alive and interleaves everything they emit. `race` commits to a single source at the first notification and discards the rest. Merge is "all voices", race is "first voice only".

??? question "How would you build 'first successful response, ignore failures'?"

    Make failures non-notifications from the race's point of view: give each source a `catchError` that returns an Observable which never emits (`NEVER`), then race them. A failed contender then just goes quiet instead of settling the race. Add a `timeout` around the whole thing so that all-sources-failing cannot hang forever.

## Related

- [merge](merge.md) when every source's values matter
- [timeout](../utility/timeout.md), the purpose-built "data vs deadline" pattern
- [forkJoin](forkJoin.md) when you need all results, not the fastest
