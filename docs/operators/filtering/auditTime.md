---
description: "On activity, wait a fixed duration, then emit the latest value: trailing-edge rate limiting."
tags:
  - Operators
  - Filtering
---

# auditTime

`auditTime()` rate-limits a stream from the **trailing edge**. When the source emits, the operator goes quiet for the specified duration, keeps tracking the newest value that arrives in the meantime, and when the timer fires it emits the **most recent** value. Then it waits for the next source emission to start the cycle again.

Compare the three timing mindsets:

- `debounceTime` waits for **silence**, then emits the last value
- `throttleTime` (default) emits the **first** value of a burst, then ignores the rest
- `auditTime` lets a burst run for a fixed window, then emits the **last** value seen in it

!!! abstract "At a glance"

    - **Signature:** `auditTime(duration)`
    - **Use when:** continuous activity where you want periodic updates that reflect the **latest** state: drag positions, mousemove, live progress
    - **Avoid when:** you need the first event of a burst instantly (leading `throttleTime`) or only the settled value after activity stops (`debounceTime`)
    - **Top gotcha:** trailing-edge only; the first value of a burst never appears before `duration` has passed

## How it works

1. The operator is idle until the source emits.
2. That emission starts a `duration` timer. The value is **not** emitted yet.
3. Any values arriving while the timer runs replace the pending value.
4. When the timer fires, the pending (latest) value is emitted, and the operator returns to idle.

Unlike `sampleTime`, there is no free-running clock: no activity means no timers and no emissions.

## Minimal Example

```typescript
import { interval, take, auditTime } from "rxjs";

interval(100).pipe(take(10), auditTime(350)).subscribe(console.log);

// values arrive every 100ms (0..9); the first one starts a 350ms timer
// 3   (timer runs t=100 -> t=450; latest value at t=450 is 3)
// 7   (value 4 at t=500 starts the next timer; latest at t=850 is 7)
// 9   (value 8 at t=900 starts a timer; the source completes at t=1000,
//      but auditTime holds completion, emits 9 at t=1250, then completes)
```

## Angular Example: Smooth Drag Tracking

```typescript
import { Component, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { fromEvent, map, auditTime } from "rxjs";

@Component({
  selector: "app-drag-tracker",
  template: `<div
    class="ghost"
    [style.left.px]="x()"
    [style.top.px]="y()"
  ></div>`,
})
export class DragTrackerComponent {
  protected readonly x = signal(0);
  protected readonly y = signal(0);

  constructor() {
    fromEvent<PointerEvent>(document, "pointermove")
      .pipe(
        // pointermove can fire faster than the frame rate; emit the
        // freshest coordinates roughly every 16ms instead of every event
        auditTime(16),
        map((event) => ({ x: event.clientX, y: event.clientY })),
        takeUntilDestroyed(),
      )
      .subscribe(({ x, y }) => {
        this.x.set(x);
        this.y.set(y);
      });
  }
}
```

**How it works:** during a drag, events arrive far faster than the UI can usefully render. `auditTime(16)` caps updates at about one per frame while always delivering the **latest** position, so the ghost element never lags behind on a stale coordinate the way leading-edge `throttleTime` would.

## Common Mistakes

**Expecting an immediate first emission.** `auditTime` is trailing-only: the first value of a burst appears after `duration`, never instantly. If perceived responsiveness needs the first event right away, use `throttleTime` with `{ leading: true, trailing: true }`.

**Confusing it with `debounceTime`.** Debounce resets its timer on every emission, so a stream that never pauses emits nothing. Audit never resets: a continuous stream still produces one value per window. For typing you want debounce; for gestures you usually want audit.

**Assuming completion is instant.** If the source completes while an audit timer is pending, `auditTime` waits for the timer, emits the pending value, and only then completes. That is usually what you want (nothing is lost), but it means downstream completion, and anything chained on it like `finalize`, can land up to `duration` later than the source's completion.

## Interview Q&A

??? question "auditTime vs throttleTime: what is the real difference?"

    Default `throttleTime` is leading-edge: it emits the first value of a burst, then drops the rest of the window. `auditTime` is trailing-edge: it stays silent for the window and then emits the latest value. `throttleTime(d, undefined, { leading: false, trailing: true })` is similar in intent but **not equivalent**: throttle anchors fixed windows to emissions during a window, audit starts a fresh window on each emission after idle. On `interval(100).pipe(take(10))`, `auditTime(350)` emits 3, 7, 9 while trailing `throttleTime(350)` emits 3, 6, 9. The practical rule stands: throttle for instant first response, audit for freshest periodic state.

??? question "auditTime vs sampleTime?"

    `auditTime`'s timer is started by source activity, so a silent source costs nothing and emissions align to bursts. `sampleTime` runs a fixed clock from subscription and checks for a new value on every tick, emitting nothing on ticks with no fresh data. There is also a completion difference: `auditTime` flushes a pending value before completing, while `sampleTime` drops whatever arrived after the last tick.

??? question "Is there a general form?"

    Yes, `audit(durationSelector)`: instead of a fixed number, each window's length comes from an Observable you return per value, so the quiet period can vary dynamically (for example, back off harder under load).

## Related

- [throttleTime](throttleTime.md), the leading-edge counterpart
- [debounceTime](debounceTime.md) when only the settled value after a pause matters
- [sampleTime](sampleTime.md) for a fixed-clock alternative
