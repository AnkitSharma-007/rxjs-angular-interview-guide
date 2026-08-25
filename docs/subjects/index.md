---
description: "How Subjects and multicasting operators share one stream with many consumers."
tags:
  - Subjects
  - Multicasting
---

# Subjects & Multicasting

A `Subject` is both an Observable and an Observer: you can push values into it with `next()`, and many subscribers can listen to it at the same time. Subjects are the standard way to multicast in RxJS, and they power most state-sharing patterns in Angular services.

## Pick the right Subject

| Type                                    | New subscriber receives               | Typical Angular use                                        |
| --------------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| [`Subject`](subject.md)                 | Only values emitted after subscribing | Event buses, one-off notifications                         |
| [`BehaviorSubject`](behaviorSubject.md) | The current value, then updates       | State that always has a value (auth status, selected item) |
| [`ReplaySubject`](replaySubject.md)     | The last N values, then updates       | Late subscribers that need recent history                  |

Not sure which one fits? See the [Subject vs BehaviorSubject vs ReplaySubject comparison](../comparisons/subject-behaviorSubject-replaySubject.md).

## Sharing a stream without a Subject

Operators can multicast an existing Observable for you:

- [`share`](share.md): one shared subscription to the source, no replay for late subscribers.
- [`shareReplay`](shareReplay.md): one shared subscription plus a replay buffer, commonly used to cache HTTP results.

These are the tools behind "make this HTTP call once and let every component use the result", one of the most common Angular interview scenarios.
