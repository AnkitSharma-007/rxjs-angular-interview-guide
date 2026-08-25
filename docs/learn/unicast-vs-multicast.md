---
description: "One producer per subscriber, or one producer for all: the axis that explains cold, hot, and Subjects."
tags:
  - Fundamentals
---

# Unicast vs Multicast

**Unicast** means every subscriber gets its own, private producer execution. **Multicast** means one producer execution is shared by all subscribers.

This is the precise vocabulary behind the [cold](cold-observables.md)/[hot](hot-observables.md) distinction: plain Observables are unicast (and therefore cold); Subjects and the `share*` operators are multicast (and therefore hot).

## Side by Side

```typescript
import { interval, share, take } from "rxjs";

// UNICAST: each subscriber starts its own interval at 0
const unicast$ = interval(1000).pipe(take(3));

unicast$.subscribe((v) => console.log(`U-A: ${v}`));
setTimeout(() => unicast$.subscribe((v) => console.log(`U-B: ${v}`)), 1500);

// U-A: 0 (1s)   U-A: 1 (2s)   U-B: 0 (2.5s)   U-A: 2 (3s)   U-B: 1 (3.5s) ...
// two independent timers, each counting from 0

// MULTICAST: one interval, both subscribers observe the same ticks
const multicast$ = interval(1000).pipe(take(3), share());

multicast$.subscribe((v) => console.log(`M-A: ${v}`));
setTimeout(() => multicast$.subscribe((v) => console.log(`M-B: ${v}`)), 1500);

// M-A: 0 (1s)   M-A: 1, M-B: 1 (2s)   M-A: 2, M-B: 2 (3s)
// one timer; B joins live and never sees 0
```

## The Mapping That Answers Most Interview Questions

| Concept             | Producer                                      | Late subscribers                                    | Examples                                              |
| ------------------- | --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| **Unicast / cold**  | Created per subscriber, inside the Observable | Get a fresh execution from the start                | `HttpClient`, `of`, `from`, `interval`, `defer`       |
| **Multicast / hot** | One shared execution, outside or wrapped      | Join live; missed values are gone (unless replayed) | `Subject` family, `fromEvent`, `share`, `shareReplay` |

Two practical consequences:

- **Duplicate HTTP requests** are just unicast behavior: two `async` pipes = two subscribers = two producer executions. The fix is multicasting: [`shareReplay`](../subjects/shareReplay.md).
- **Replay** is an orthogonal knob on top of multicasting: `Subject` and `share` replay nothing, `BehaviorSubject`/`shareReplay(1)` replay the latest value, `ReplaySubject(n)` replays history.

## How Multicasting Works Under the Hood

Every multicasting tool has the same shape: a **Subject in the middle**. The Subject subscribes to the source once (one producer), and all real subscribers subscribe to the Subject. `share()` literally does this internally, adding reference counting to connect and disconnect the source as subscribers come and go.

Being able to sketch "source → Subject → many subscribers" on a whiteboard is usually all the depth an interviewer wants.

## Common Mistakes

**Saying unicast and cold are different things.** They describe the same behavior from different angles: cold/hot is about _when and where the producer runs_, unicast/multicast is about _how many subscribers share it_. Precision here reads as senior.

**Multicasting everything defensively.** Unicast is often exactly right: each component fetching its own copy of mutable data can be a feature. Share when duplicated work is measurable, not by reflex.

**Forgetting that multicast streams have lifecycle.** A shared source with `refCount`-style behavior stops when the last subscriber leaves and restarts (from scratch) for the next one, the source of many "my shared stream reset" surprises. See [share](../subjects/share.md) and [shareReplay](../subjects/shareReplay.md).

## Interview Q&A

??? question "Why does a plain Observable send separate HTTP requests to each subscriber?"

    Because plain Observables are unicast: `subscribe()` runs the producer function, once per subscriber. Two subscribers therefore execute `http.get`'s producer twice. Multicasting inserts a Subject so the producer runs once and its notifications fan out.

??? question "Is a Subject unicast or multicast, and why?"

    Multicast by construction: it keeps a list of subscribers and pushes each `next()` to all of them. That is also why it is hot: emission happens on `next()`, independent of any individual subscription.

??? question "How would you convert a unicast stream into a multicast one?"

    Pipe it through `share()` (live-only), `shareReplay(n)` (with catch-up), or push it through a Subject manually. All three place a Subject between the source and the subscribers, changing one-producer-per-subscriber into one-producer-for-all.

## Next Up

- [Cold Observables](cold-observables.md) and [Hot Observables](hot-observables.md), the same axis with analogies
- [Subjects & Multicasting](../subjects/index.md), the tools that implement multicast
- [shareReplay](../subjects/shareReplay.md), the fix for the duplicate-HTTP interview classic
