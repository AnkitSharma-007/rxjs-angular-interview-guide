---
description: "What each Subject type gives a new subscriber and how to pick the right one."
tags:
  - Comparisons
---

# Subject vs BehaviorSubject vs ReplaySubject

Let's summarize the key differences between `Subject`, `BehaviorSubject`, and `ReplaySubject`. Understanding these distinctions is vital for choosing the right tool for the job.

Here's a comparison table highlighting the main differences:

| Feature                  | `Subject`                     | `BehaviorSubject`                   | `ReplaySubject`                          |
| :----------------------- | :---------------------------- | :---------------------------------- | :--------------------------------------- |
| **Initial Value?**       | No                            | **Yes** (Required on creation)      | No                                       |
| **Value for New Sub?**   | **None**. Only future values. | **Yes**. The _single latest_ value. | **Yes**. The _last `n`_ buffered values. |
| **Buffers Past Values?** | No                            | Implicitly buffers _only latest_    | **Yes**. Explicitly buffers last `n`.    |
| **Requires Config?**     | No                            | Initial Value                       | Buffer Size (`n`), optionally time       |
| **`getValue()` Method?** | No                            | **Yes** (Synchronous access)        | No                                       |

**Explanation in Simple Terms:**

1.  **`Subject` ("The Basic Broadcaster")**
    - **Analogy:** Live Radio Broadcast / Event Emitter.
    - **Behavior:** It's like a plain event channel. When you emit (`next()`), it sends the value to _only those currently subscribed_. Anyone subscribing _later_ gets nothing until the _next_ emission. It doesn't remember past events.
    - **Use Case:** Simple event aggregation, triggers, or when you only care about future events from the moment of subscription. Good for bridging non-observable code (like button clicks via `.next()`) into streams.
    - **Example Recall:** Our cross-component communication example where the profile component only needed to know about _future_ login/logout events after it loaded.

2.  **`BehaviorSubject` ("The State Holder")**
    - **Analogy:** Whiteboard / Status Board.
    - **Behavior:** It _must_ be created with an initial value. It always holds the _most recent_ value. When someone subscribes, they _immediately_ get this current value. Then, they receive any subsequent updates.
    - **Use Case:** Managing state that always has a current value (e.g., logged-in user status, current theme, selected filter). Perfect when components need the _current_ state immediately upon loading. Often used in state management services. Signals in Angular provide a compelling alternative for many state-holding scenarios, offering synchronous reads without needing `.getValue()`.
    - **Example Recall:** Our theme service example where components needed to know the _current_ theme ('light' or 'dark') right away.

3.  **`ReplaySubject` ("The Recorder")**
    - **Analogy:** Meeting Recorder / Chat History.
    - **Behavior:** It records a specified number (`n`) of the most recent values. When someone subscribes, it _immediately replays_ those buffered values to the new subscriber, bringing them up to speed. After the replay, it behaves like a regular `Subject` for new values.
    - **Use Case:** Caching recent events when context is important for late subscribers. Useful for activity logs, notification streams, or data streams where missing the last few events would be problematic.
    - **Example Recall:** Our activity log service example where a display component needed to show the last 5 logged actions, even if it loaded _after_ those actions occurred.

**When to Use Which:**

- Use `Subject` when you just need to broadcast events as they happen, and subscribers don't need any history or initial value.
- Use `BehaviorSubject` when you need to represent a piece of state that _always has a value_, and new subscribers should get the _current_ value immediately. (Consider if a Signal might be simpler for this state).
- Use `ReplaySubject` when new subscribers need to get a history of the _last few_ emissions to have proper context.

Remember to expose Subjects from services using `.asObservable()` to prevent external code from calling `.next()` on them, maintaining better encapsulation.

## What About AsyncSubject?

A fourth, rarer family member: `AsyncSubject` emits **only the last value, and only upon completion**. Until `complete()` is called, subscribers receive nothing. It occasionally appears in interviews as "the Subject that behaves like a Promise"; in practice, `lastValueFrom` or `shareReplay(1)` usually covers the need.

## Quick Decision Guide

- Future events only, no memory: [`Subject`](../subjects/subject.md)
- State with a current value, synchronous reads: [`BehaviorSubject`](../subjects/behaviorSubject.md) (or an Angular signal)
- Late subscribers need recent history: [`ReplaySubject`](../subjects/replaySubject.md)
- Final result on completion only: `AsyncSubject` (rare)

## Interview Q&A

??? question "A component subscribes after login already happened and shows 'logged out'. Which Subject type fixes this?"

    A plain `Subject` gives late subscribers nothing, which is the bug. `BehaviorSubject<AuthState>` guarantees the current state on subscribe. This "late subscriber misses state" scenario is the single most common Subject interview question.

??? question "BehaviorSubject vs ReplaySubject(1): when does the difference actually matter?"

    Three edges: `BehaviorSubject` needs an initial value and emits it immediately, has `getValue()`, and after completion emits nothing to new subscribers. `ReplaySubject(1)` starts silent until the first `next`, has no synchronous getter, and still replays the last value after completion. Caching flows feel these differences.

??? question "When should you reach for an Angular signal instead of a BehaviorSubject?"

    For synchronous component or service state that templates read: signals give current-value semantics with less ceremony and fine-grained reactivity. Keep `BehaviorSubject` (or streams generally) when consumers need RxJS operators, or interop with stream-based APIs; bridge with `toSignal`/`toObservable` when both worlds meet.
