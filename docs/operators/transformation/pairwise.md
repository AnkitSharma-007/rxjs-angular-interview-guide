---
description: "Emit the previous and current value together as a pair: built-in memory of one emission."
tags:
  - Operators
  - Transformation
---

# pairwise

`pairwise()` gives a stream a one-value memory. For every emission (starting from the **second**), it emits an array of `[previous, current]`. It is the idiomatic answer whenever the question is "how does this value compare to the last one?"

!!! abstract "At a glance"

    - **Signature:** `pairwise()`
    - **Use when:** you need the previous value alongside the current one: direction detection, diffs, transition tracking
    - **Avoid when:** you need more history than one value (`bufferCount(n, 1)` or `scan`)
    - **Top gotcha:** the first source emission produces **no output**; pairs only start once two values exist

## How it works

1. The first value is stored, nothing is emitted.
2. From the second value on, every emission produces `[previous, current]`.
3. A source with fewer than two emissions therefore never emits through `pairwise`.

`pairwise()` is equivalent to `bufferCount(2, 1)` restricted to full pairs, and to `scan` with a two-slot accumulator, just clearer about its intent.

## Minimal Example

```typescript
import { of, pairwise, map } from "rxjs";

of(10, 14, 9, 21).pipe(pairwise()).subscribe(console.log);
// [10, 14]
// [14, 9]
// [9, 21]

// classic use: turn pairs into deltas
of(10, 14, 9, 21)
  .pipe(
    pairwise(),
    map(([prev, curr]) => curr - prev),
  )
  .subscribe(console.log);
// 4, -5, 12
```

## Angular Example: Remembering the Previous Route

```typescript
import { Injectable, inject } from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map, pairwise, startWith } from "rxjs";

@Injectable({ providedIn: "root" })
export class NavigationHistoryService {
  private readonly router = inject(Router);

  /** The URL the user came from, for "back to results" style links. */
  readonly previousUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      // seed with the initial URL so the first navigation already forms a pair
      startWith(this.router.url),
      pairwise(),
      map(([previous]) => previous),
    ),
    { initialValue: null },
  );
}
```

**How it works:** `Router.events` never completes, so this stream keeps tracking for the app's lifetime. The `filter` keeps only completed navigations, `pairwise` pairs each new URL with the one before it, and the final `map` keeps just the previous entry. The `startWith` seed matters: without it, the very first navigation would produce no pair and `previousUrl` would stay `null` one step too long.

## Common Mistakes

**Forgetting the silent first emission.** Downstream logic that expects output for every source value breaks on the first one. If the first value must produce a pair, seed the stream with `startWith(initial)` so pairing starts immediately.

**Using it for running state.** `pairwise` remembers exactly one value. Trends over longer windows ("last 5 readings") belong to `bufferCount(5, 1)`; accumulated state belongs to [`scan`](scan.md).

**Rebuilding it manually.** A `scan` that shuffles `{ prev, curr }` objects, or a class field caching the last value next to a `subscribe`, is `pairwise` with extra steps and extra bugs. The operator also confines the memory to the stream, instead of leaking mutable state onto the component.

## Interview Q&A

??? question "What does pairwise emit for a source that emits once?"

    Nothing. Pairs require two values, so single-emission sources (like a typical HTTP call) pass nothing through `pairwise`. That also makes it a quick smell test: if you find `pairwise` after an HTTP request, something is off.

??? question "How would you detect whether a numeric stream is rising or falling?"

    `source$.pipe(pairwise(), map(([a, b]) => b > a ? "up" : b < a ? "down" : "flat"))`. The classic concrete case is scroll direction from scroll positions, which drives hide-on-scroll toolbars.

??? question "pairwise vs bufferCount(2, 1)?"

    Nearly identical output; `bufferCount(2, 1)` additionally emits a trailing partial buffer (a one-element array) at completion, which `pairwise` never does. `pairwise` states the intent, always yields exact two-tuples, and is the one to reach for.

## Related

- [scan](scan.md) for accumulated state beyond one previous value
- [buffer, bufferTime & bufferCount](buffer.md) for general batching and sliding windows
- [distinctUntilChanged](../filtering/distinctUntilChanged.md), which also compares consecutive values, but to drop repeats
