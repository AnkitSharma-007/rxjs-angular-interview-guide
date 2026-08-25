---
description: "Cancellation vs concurrency vs strict order vs ignore-while-busy: choosing a higher-order mapping operator."
tags:
  - Comparisons
---

# switchMap vs mergeMap vs concatMap vs exhaustMap

Let's break down the differences between the four higher-order mapping strategies: `switchMap`, `mergeMap`, `concatMap`, and `exhaustMap`.

All of them map each value from a source (outer) Observable to a new (inner) Observable. The key difference lies in how they handle the subscription and emissions of these inner Observables, especially when the source Observable emits values rapidly.

Here’s a theoretical comparison:

1.  **`switchMap`**
    - **Strategy:** Cancellation / Focus on Latest.
    - **Behavior:** When the source Observable emits a value, `switchMap` maps it to an inner Observable and subscribes. If the source emits a _new_ value _before_ the current inner Observable completes, `switchMap` will **unsubscribe** from the previous inner Observable (cancelling its ongoing work and discarding any potential future emissions from it) and then subscribe to the _new_ inner Observable created from the latest source value.
    - **Concurrency:** Only one inner Observable (the latest one) is active at any given time.
    - **Order:** Output values come only from the most recent inner Observable. The order depends on that inner Observable, but older inner streams are cancelled entirely.
    - **Use When:** You only care about the results corresponding to the **most recent** source emission. Useful for scenarios like type-ahead search suggestions where previous requests become irrelevant.

2.  **`mergeMap` (alias: `flatMap`)**
    - **Strategy:** Concurrency / Merging.
    - **Behavior:** When the source Observable emits a value, `mergeMap` maps it to an inner Observable and subscribes. If the source emits a _new_ value, `mergeMap` **does not cancel** any previous inner Observables. It simply creates and subscribes to the new inner Observable, allowing multiple inner Observables to run **concurrently**.
    - **Concurrency:** Can have multiple inner Observables running in parallel. The level of concurrency can optionally be limited by passing a second argument to `mergeMap`.
    - **Order:** Output values from all active inner Observables are merged into a single stream as they arrive. The order of output values is not guaranteed to match the order of source emissions; it depends on how quickly each inner Observable emits.
    - **Use When:** You want to handle all source emissions by triggering potentially long-running operations and need them to run **in parallel** for efficiency. The order of completion doesn't matter as much as getting all the results eventually. Useful for making multiple concurrent API calls.

3.  **`concatMap`**
    - **Strategy:** Sequential / Queueing.
    - **Behavior:** When the source Observable emits a value, `concatMap` maps it to an inner Observable. It subscribes to this inner Observable. If the source emits a _new_ value _before_ the current inner Observable **completes**, `concatMap` will **wait**. It holds onto the new source value and only maps/subscribes to its corresponding inner Observable _after_ the current one has finished completely.
    - **Concurrency:** Only one inner Observable is active at any given time. Others are effectively queued.
    - **Order:** Output values are guaranteed to be in the same order as the source emissions because each inner Observable is processed sequentially.
    - **Use When:** The **order of execution is critical**. You need to ensure that the operation triggered by one source value completes fully before starting the operation for the next source value. Useful for sequential API updates or processing items in a strict order.

4.  **`exhaustMap`**
    - **Strategy:** Ignore While Busy.
    - **Behavior:** When the source emits a value, `exhaustMap` maps it to an inner Observable and subscribes, exactly once. While that inner Observable is still active, **any new source values are dropped entirely**: not queued, not cancelled into a new request, simply discarded. Once the inner Observable completes, the next source value to arrive is processed.
    - **Concurrency:** One inner Observable at a time; excess source values are lost.
    - **Order:** Output comes only from inner Observables that were actually started; dropped values produce nothing.
    - **Use When:** The **first trigger should win** and repeats are noise: submit buttons, login attempts, manual refresh. Protects the in-flight operation instead of restarting or queueing.

**In a Nutshell:**

| Operator     | Inner Observable Handling                    | Concurrency     | Order          | Analogy                     |
| :----------- | :------------------------------------------- | :-------------- | :------------- | :-------------------------- |
| `switchMap`  | Cancels previous, switches to latest         | Only latest     | Latest matters | Restless TV channel surfing |
| `mergeMap`   | Runs all concurrently                        | High (Parallel) | Interleaved    | Opening many browser tabs   |
| `concatMap`  | Waits for completion, processes sequentially | One at a time   | Strict         | Waiting in a single queue   |
| `exhaustMap` | Ignores new values while busy                | One at a time   | First wins     | Busy phone line             |

## The Classic Interview Scenario: Triple-Clicking Save

A user clicks "Save" three times in one second. What happens?

| Operator     | Requests fired               | Result                                                        |
| :----------- | :--------------------------- | :------------------------------------------------------------ |
| `mergeMap`   | 3, in parallel               | Three saves race each other; final state unpredictable        |
| `concatMap`  | 3, one after another         | Three sequential saves; slow, but ordered                     |
| `switchMap`  | 3 started, first 2 cancelled | Only the last response arrives; earlier writes may still land |
| `exhaustMap` | 1                            | Clicks 2 and 3 ignored; the in-flight save finishes untouched |

For a save button, `exhaustMap` is almost always the intended behavior, paired with a disabled state for feedback.

## Quick Decision Guide

- Only the **latest** result matters (search, route params, refresh): [`switchMap`](../operators/transformation/switchMap.md)
- **All** results matter and can run in parallel (independent writes, fan-out reads): [`mergeMap`](../operators/transformation/mergeMap.md)
- All results matter and **order** matters (queues, ordered writes): [`concatMap`](../operators/transformation/concatMap.md)
- Only the **first** trigger matters until it finishes (submit, login): [`exhaustMap`](../operators/transformation/exhaustMap.md)

One closing fact that ties the family together: `concatMap(project)` is just `mergeMap(project, 1)`, and all four share the same signature, so swapping strategies is a one-word change.
