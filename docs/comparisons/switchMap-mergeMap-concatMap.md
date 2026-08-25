# switchMap Vs mergeMap Vs concatMap

Let's break down the theoretical differences between `switchMap`, `mergeMap`, and `concatMap`.

All three are higher-order mapping operators in RxJS, meaning they map each value from a source (outer) Observable to a new (inner) Observable. The key difference lies in how they handle the subscription and emissions of these inner Observables, especially when the source Observable emits values rapidly.

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

**In a Nutshell:**

| Operator    | Inner Observable Handling                    | Concurrency     | Order          | Analogy                     |
| :---------- | :------------------------------------------- | :-------------- | :------------- | :-------------------------- |
| `switchMap` | Cancels previous, switches to latest         | Only latest     | Latest matters | Restless TV channel surfing |
| `mergeMap`  | Runs all concurrently                        | High (Parallel) | Interleaved    | Opening many browser tabs   |
| `concatMap` | Waits for completion, processes sequentially | One at a time   | Strict         | Waiting in a single queue   |
