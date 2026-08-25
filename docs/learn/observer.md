---
description: "The consumer side of a stream: the next, error, and complete callbacks that react to emissions."
tags:
  - Fundamentals
---

# Observer

An **Observer** is the **consumer** of the values delivered by an Observable. It's the "thing" that listens to the stream and knows what to do when a new value, an error, or a completion signal arrives.

Think of it like this:

- **Observable:** The radio station broadcasting music (the stream).
- **Observer:** Your radio receiver at home, which _listens_ to the broadcast and plays the music through its speakers (consumes the stream).

## Structure of an Observer

An Observer is typically an object literal (a plain JavaScript object) that can have up to three methods (or "callbacks"):

1.  **`next(value)`:** This method is called whenever the Observable emits a new value. This is where you put the code to handle the actual data you receive. You might update a variable, display something on the screen, etc. This can be called zero, one, or multiple times.
2.  **`error(err)`:** This method is called if the Observable fails or encounters an error. The error object is passed as an argument. Once `error()` is called, the Observable stops, and neither `next()` nor `complete()` will be called anymore. This is where you'd handle error conditions, maybe show an error message to the user.
3.  **`complete()`:** This method is called when the Observable successfully finishes emitting all its values and won't emit anything further. After `complete()` is called, `next()` and `error()` will not be called. This is useful for knowing when a stream has finished gracefully (e.g., after an HTTP request successfully returns its response).

**How it connects to Observables:**

You connect an Observer to an Observable using the Observable's `.subscribe()` method. You pass the Observer object to `.subscribe()`.

**Real-World Analogy (Continuing the food delivery):**

You are the **Observer** watching the delivery app.

- **`next(update)`:** Your action when you see a status update like "Preparing" or "Out for delivery". You might just read it (`console.log(update)`), or maybe you feel relieved (`this.status = update`).
- **`error(problem)`:** Your action when you see "Order Cancelled by Restaurant". You might feel annoyed (`console.error(problem)`) and decide to order from somewhere else (`this.showError('Order failed: ' + problem)`).
- **`complete()`:** Your action when you see "Delivered". You might think, "Great, food's here!" (`console.log('Food has arrived!')`).

## Code Example (using the previous `HttpClient` example)

In the `MyComponentComponent` example from before, the object we passed to `subscribe(...)` _is_ the Observer:

```typescript
// ... inside the component's constructor ...

this.dataService
  .getItems()
  .pipe(takeUntilDestroyed())
  .subscribe(
    // This object is the Observer
    {
      // Handler for new data values
      next: (data) => {
        this.items.set(data);
        console.log("Data received:", data);
      },
      // Handler for errors
      error: (error) => {
        this.errorMsg.set("Failed to load items.");
        console.error("Error fetching items:", error);
      },
      // Handler for completion
      complete: () => {
        console.log("Finished fetching items.");
      },
    },
  );
```

**Simplified Syntax:**

You don't always need to provide all three handlers:

- **Just `next`:** passing a single function is shorthand for `{ next: fn }`:

  ```typescript
  myObservable.subscribe((data) => console.log(data));
  ```

- **Any other combination:** use a partial observer object and include only the handlers you need:

  ```typescript
  myObservable.subscribe({
    next: (data) => console.log(data),
    error: (err) => console.error(err),
  });
  ```

!!! warning "Deprecated: multiple callback arguments"

    The old `subscribe(nextFn, errorFn, completeFn)` signature with separate callback arguments is deprecated in RxJS and slated for removal. Always pass either a single `next` function or an observer object, as shown above. Interviewers sometimes probe exactly this.

So, in short: The **Observer** is the set of callbacks (next, error, complete) that you provide to the `subscribe()` method to react to the values and notifications emitted by an **Observable**.

## Interview Q&A

??? question "Are all three Observer handlers required?"

    No. All handlers are optional; a partial observer (`{ next }`, `{ next, error }`) is normal, and a bare function is shorthand for `{ next }`. Omitting `error` is risky though: an unhandled stream error surfaces as a runtime exception.

??? question "Can next be called after error or complete?"

    No. The Observable contract guarantees that after a terminal notification (`error` or `complete`), no further notifications of any kind are delivered to that subscriber. Operators and Subjects all enforce this.

??? question "What is the relationship between Observer and Subscriber?"

    A Subscriber is RxJS's internal wrapper around your Observer: it adds subscription bookkeeping (teardown, closed state) and enforces the contract. Conceptually, you write Observers; RxJS runs them as Subscribers.

## Next Up

- [Cold Observables](cold-observables.md): why each subscription can trigger fresh work
- [Hot Observables](hot-observables.md): shared live streams
- [Subject](../subjects/subject.md): an object that is both Observable and Observer
