---
description: "Emit a value, then ignore emissions during a cooldown window: steady-rate output."
tags:
  - Operators
  - Filtering
---

# throttleTime

`throttleTime()` passes a value through, then **ignores** subsequent source emissions for the specified duration. When the window expires, the next emission passes and opens a new window.

Where `debounceTime` waits for silence, `throttleTime` enforces a maximum output **rate** while activity continues.

!!! abstract "At a glance"

    - **Signature:** `throttleTime(duration, scheduler?, { leading, trailing })`
    - **Use when:** continuous event streams need steady sampling: scroll, mousemove, drag, resize handlers
    - **Avoid when:** only the settled final value matters (typing): that is `debounceTime`
    - **Top gotcha:** the default config is `{ leading: true, trailing: false }`, so the **last** value of a burst is dropped and downstream state can end stale

## Minimal Example

```typescript
import { interval, take, throttleTime } from "rxjs";

interval(200).pipe(take(10), throttleTime(600)).subscribe(console.log);

// 0   (t=200: passes, window opens until 800)
// 3   (t=800: first emission after the window)
// 6   (t=1400)
// 9   (t=2000)
// values 1, 2, 4, 5, 7, 8 were dropped during cooldowns
```

## Angular Example: Scroll Position Tracking

```typescript
import { Component, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { fromEvent, map, throttleTime } from "rxjs";

@Component({
  selector: "app-scroll-indicator",
  template: `<div class="progress" [style.width.%]="progress()"></div>`,
})
export class ScrollIndicatorComponent {
  protected readonly progress = signal(0);

  constructor() {
    fromEvent(window, "scroll")
      .pipe(
        // scroll can fire dozens of times per second; sample it steadily,
        // keeping the trailing value so the final position is accurate
        throttleTime(100, undefined, { leading: true, trailing: true }),
        map(() => {
          const max = document.documentElement.scrollHeight - innerHeight;
          return max > 0 ? (scrollY / max) * 100 : 0;
        }),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.progress.set(value));
  }
}
```

**How it works:** without throttling, the handler would run on every scroll event and thrash change detection. `throttleTime(100)` caps it at ~10 updates per second; `trailing: true` guarantees one final emission after the user stops scrolling, so the bar never freezes short of the real position.

## Common Mistakes

**Throttling typing.** For a search box you want the settled term, not periodic samples of half-typed text. Use [`debounceTime`](debounceTime.md); reserve throttling for continuous gestures.

**Relying on defaults when the final value matters.** With `trailing: false` (the default), the last burst value is silently dropped. UI state derived from throttled streams usually wants `{ leading: true, trailing: true }`.

**Using throttle to "slow down" API calls in a mapping chain.** Throttling drops values. If every request must happen but at a controlled pace, you want a queue (`concatMap`, possibly with a `delay`), not a throttle.

## Interview Q&A

??? question "debounceTime vs throttleTime vs auditTime vs sampleTime, quickly?"

    `debounceTime`: emit the last value after a pause. `throttleTime`: emit (by default) the first value of a burst, then cool down. `auditTime`: on activity, wait the duration, then emit the **latest** value. `sampleTime`: on a fixed clock, emit the latest value if there was one. Typing wants debounce; gestures want throttle/audit.

??? question "What do leading and trailing control?"

    `leading` emits the value that opens the window (default true); `trailing` emits the last value observed during the window when it closes (default false). `{ leading: true, trailing: true }` gives responsive starts and accurate ends, at most two emissions per window.

??? question "Does throttleTime buffer the values it skips?"

    No, they are discarded (except the most recent one when `trailing: true`). That lossiness is the point, and the difference from queueing approaches like concatMap.

## Related

- [debounceTime](debounceTime.md), the wait-for-silence counterpart
- [auditTime](auditTime.md) for trailing-edge windows and [sampleTime](sampleTime.md) for a fixed clock
- [fromEvent](../creation/fromEvent.md), the usual source of streams worth throttling
- [distinctUntilChanged](distinctUntilChanged.md) to drop repeats after sampling
