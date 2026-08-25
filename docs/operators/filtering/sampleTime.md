---
description: "On a fixed clock, emit the newest value since the last tick: periodic snapshots of a stream."
tags:
  - Operators
  - Filtering
---

# sampleTime

`sampleTime()` turns a stream into **periodic snapshots**. From the moment of subscription it runs a fixed clock, and on every tick it emits the most recent source value, but only if a **new** value arrived since the previous tick. Ticks with nothing new emit nothing.

Where `auditTime` starts its timer when activity happens, `sampleTime`'s clock runs on its own schedule regardless of what the source does.

!!! abstract "At a glance"

    - **Signature:** `sampleTime(period)`
    - **Use when:** you want strictly periodic checkpoints of the latest state: telemetry, progress reporting, syncing state at a fixed cadence
    - **Avoid when:** emissions should align to activity bursts (`auditTime`) or only the settled value matters (`debounceTime`)
    - **Top gotcha:** values that arrive after the final tick are dropped at completion; the last source value is not guaranteed to come through

## How it works

1. On subscribe, a clock starts ticking every `period` milliseconds.
2. Source values overwrite an internal "latest" slot; nothing is emitted immediately.
3. On each tick, if the slot received a fresh value since the last tick, it is emitted; otherwise the tick is silent.
4. When the source completes, the operator completes with it. A value sitting in the slot waiting for the next tick is **discarded**.

## Minimal Example

```typescript
import { interval, take, sampleTime } from "rxjs";

interval(100).pipe(take(10), sampleTime(300)).subscribe(console.log);

// clock ticks at t=300, 600, 900, 1200, ...
// 1   (latest value at t=300)
// 4   (latest value at t=600)
// 7   (latest value at t=900)
// source completes at t=1000; values 8 and 9 never reach a tick
```

## Angular Example: Position Telemetry at a Fixed Cadence

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  Subject,
  map,
  sampleTime,
  distinctUntilChanged,
  switchMap,
} from "rxjs";

@Component({
  selector: "app-video-player",
  template: `
    <video
      controls
      src="/media/course-intro.mp4"
      (timeupdate)="position$.next($any($event.target).currentTime)"
    ></video>
  `,
})
export class VideoPlayerComponent {
  private readonly http = inject(HttpClient);

  protected readonly position$ = new Subject<number>();

  constructor() {
    // "timeupdate" fires several times per second while playing;
    // report the latest playback position exactly once every 5 seconds
    this.position$
      .pipe(
        map((position) => Math.floor(position)),
        sampleTime(5000),
        distinctUntilChanged(),
        switchMap((position) => this.http.post("/api/progress", { position })),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
```

**How it works:** the player emits a flood of `timeupdate` events, but the backend only needs a heartbeat. `sampleTime(5000)` guarantees at most one report per 5 seconds on a predictable clock, `distinctUntilChanged` skips reports while the video is paused, and `switchMap` sends the freshest position.

## Common Mistakes

**Expecting the final value.** `sampleTime` drops anything that arrives between the last tick and completion. If the final state matters (for example, saving playback position when the user leaves), capture it separately on teardown rather than trusting the sampled stream.

**Using it for user input.** Sampling half-typed search text on a clock produces requests for stale terms at arbitrary moments. Typing wants `debounceTime`; sampling is for continuously changing state where any recent snapshot is acceptable.

**Confusing "no new value" with "repeat last value".** A silent tick emits nothing, it does not re-emit the previous value. If you need a heartbeat even when nothing changed, combine the state with an `interval` (for example via `withLatestFrom`) instead.

## Interview Q&A

??? question "sampleTime vs auditTime in one sentence each?"

    `sampleTime(n)`: a metronome ticks every `n` ms and emits the newest value since the last tick, if any. `auditTime(n)`: each burst of activity starts an `n` ms timer that ends by emitting the latest value. Fixed clock versus activity-driven windows.

??? question "What happens on ticks where the source emitted nothing?"

    Nothing is emitted. `sampleTime` only forwards a value when at least one fresh emission arrived during the elapsed interval, so downstream never sees duplicates caused by the clock alone.

??? question "Is there a general form?"

    Yes, `sample(notifier)`: instead of a fixed clock, every emission of the notifier Observable triggers a snapshot. A classic use is `state$.pipe(sample(saveClicks$))`, meaning "when the user clicks save, take the latest state".

## Related

- [auditTime](auditTime.md) for activity-driven trailing emission
- [throttleTime](throttleTime.md) and [debounceTime](debounceTime.md) for the other timing strategies
- [withLatestFrom](../combination/withLatestFrom.md), the combination-flavored cousin of `sample`
