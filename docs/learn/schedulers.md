---
description: "What schedulers control in RxJS, how observeOn and subscribeOn differ, and when any of this matters in Angular."
tags:
  - Fundamentals
---

# Schedulers, observeOn & subscribeOn

Most RxJS work never touches a scheduler directly, but interviews like the topic because it tests whether you understand **when** stream code actually runs. A scheduler is the piece of RxJS that answers two questions:

1. **Where** does a task run: synchronously, as a microtask, as a macrotask, or on an animation frame?
2. **When** does it run: now, after a delay, or on a virtual clock (for tests)?

Time-based operators you already use (`delay`, `debounceTime`, `interval`, `timer`) all delegate their timing to a scheduler behind the scenes. That is why they can be tested with virtual time.

!!! abstract "At a glance"

    - **The players:** `asyncScheduler` (macrotask, like `setTimeout`), `asapScheduler` (microtask, like a resolved Promise), `queueScheduler` (synchronous queue), `animationFrameScheduler` (before the next repaint)
    - **`observeOn(scheduler)`:** reschedules **notifications** flowing downstream
    - **`subscribeOn(scheduler)`:** reschedules the **act of subscribing** itself
    - **Top gotcha:** `subscribeOn` affects the whole chain's subscription no matter where it sits in the pipe; `observeOn` only affects operators after it

## The built-in schedulers

| Scheduler                 | Runs work as                     | Typical use                                         |
| ------------------------- | -------------------------------- | --------------------------------------------------- |
| `asyncScheduler`          | Macrotask (`setTimeout`)         | Default for time-based operators (`delay`, `timer`) |
| `asapScheduler`           | Microtask (Promise callback)     | "As soon as possible, but not synchronously"        |
| `queueScheduler`          | Synchronous, queued              | Avoiding recursion blowups in synchronous emissions |
| `animationFrameScheduler` | `requestAnimationFrame` callback | Emissions that drive visual updates                 |

## observeOn vs subscribeOn

**`observeOn(scheduler)`** re-delivers every `next`, `error`, and `complete` on the given scheduler. It changes the timing of everything **downstream** of where it appears in the pipe:

```typescript
import { of, observeOn, asyncScheduler } from "rxjs";

console.log("before subscribe");
of(1, 2, 3)
  .pipe(observeOn(asyncScheduler))
  .subscribe((v) => console.log("value", v));
console.log("after subscribe");

// before subscribe
// after subscribe      <- values were pushed off the synchronous path
// value 1
// value 2
// value 3
```

**`subscribeOn(scheduler)`** delays the moment the chain subscribes to its source. Its position in the pipe does not matter: wherever it sits, it reschedules the one subscription that walks up to the source. Applying it more than once does still stack, though: each application wraps the previous one in another scheduling hop, so delays add up and the outermost scheduler runs first. Use one deliberate `subscribeOn` per chain. It is the tool when the **subscription side effect itself** (starting an expensive synchronous producer) should not run right now.

A memorable framing: `observeOn` moves the **downstream** (consumption), `subscribeOn` moves the **upstream** (production start).

## Angular Example: Smooth Progress Updates

```typescript
import { Component, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { interval, take, observeOn, animationFrameScheduler } from "rxjs";

@Component({
  selector: "app-progress",
  template: `<progress [value]="percent()" max="100"></progress>`,
})
export class ProgressComponent {
  protected readonly percent = signal(0);

  constructor() {
    interval(50)
      .pipe(
        take(101),
        // deliver each update just before a repaint instead of on a timer tick
        observeOn(animationFrameScheduler),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.percent.set(value));
  }
}
```

**How it works:** timer ticks and browser paints are not aligned; several ticks can land between two frames, doing work the user never sees. `observeOn(animationFrameScheduler)` re-times delivery so updates coincide with frames. This is a niche tool: for most UI state, signals and the async pipe already batch rendering well enough.

## Why this rarely matters in Angular (and when it does)

Day to day, Angular developers almost never pass schedulers explicitly:

- Time-based operators pick sensible defaults (`asyncScheduler`).
- Change detection batches rendering, so micro-managing delivery timing usually buys nothing.

The cases where schedulers earn their keep:

1. **Testing with virtual time.** RxJS's `TestScheduler` swaps the clock, so a `debounceTime(30000)` test finishes in milliseconds. This is the single most practical scheduler skill, and it has its own page: [Marble Testing](marble-testing.md).
2. **Animation-adjacent streams**, via `animationFrameScheduler`.
3. **Breaking up synchronous floods.** A source that emits thousands of values synchronously can starve the main thread; `observeOn(asyncScheduler)` yields between deliveries.
4. **Deliberate async boundaries.** Making a synchronous stream deliver asynchronously to keep API timing consistent (the same problem `asapScheduler` solves for Promise-like ordering).

## Common Mistakes

**Expecting `subscribeOn` placement to matter.** It reschedules the single subscription of the whole chain, so `source$.pipe(map(...), subscribeOn(asyncScheduler))` and `source$.pipe(subscribeOn(asyncScheduler), map(...))` behave identically. Only `observeOn` is position-sensitive.

**Reaching for schedulers to fix change detection.** If the view is not updating, the answer is signals, the async pipe, or fixing a broken subscription, not `observeOn`. Scheduler tweaks that "fix" rendering usually paper over a real bug.

**Testing debounce logic with real timers.** Tests that `setTimeout`-wait for debounce windows are slow and flaky. Virtual time via `TestScheduler` runs the same logic deterministically and instantly; see [Marble Testing](marble-testing.md).

## Interview Q&A

??? question "What is a scheduler in one sentence?"

    A scheduler is RxJS's abstraction over execution context and time: it decides whether a task runs synchronously, as a microtask, a macrotask, or on an animation frame, and it owns the clock that time-based operators consult.

??? question "observeOn vs subscribeOn?"

    `observeOn` reschedules notification **delivery** and affects only operators downstream of its position. `subscribeOn` reschedules the initial **subscription** to the source, works the same wherever it sits in the pipe, and controls when the producer starts, not when values are delivered. Stick to one `subscribeOn` per chain; stacking several nests scheduling hops.

??? question "Why do schedulers matter for testing?"

    Because operators ask the scheduler for the time instead of the real clock, tests can substitute virtual time. With `TestScheduler`, a pipeline full of `debounceTime` and `timer` calls runs deterministically in milliseconds, with marble diagrams describing expected timing. Worked examples live on the [Marble Testing](marble-testing.md) page.

??? question "Which scheduler does delay(1000) use if you pass nothing?"

    `asyncScheduler`, which schedules with `setTimeout` semantics. Most time-based operators (`delay`, `debounceTime`, `interval`, `timer`, `auditTime`) default to it, and accept an alternative scheduler as an argument.

## Related

- [delay](../operators/utility/delay.md) and [interval](../operators/creation/interval.md), everyday operators that lean on `asyncScheduler`
- [The Observable Contract](observable-contract.md): schedulers change timing, never the grammar
- [Cold Observables](cold-observables.md): `subscribeOn` moves when a cold producer starts
