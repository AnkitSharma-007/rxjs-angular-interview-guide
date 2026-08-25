---
description: "Wait for a pause in emissions before passing the latest value: rate-limit typing."
tags:
  - Operators
  - Filtering
---

# debounceTime

`debounceTime()` is a rate-limiting operator in RxJS. It helps control how often values are emitted from a source Observable, especially when the source emits values very rapidly.

Think of it like this: `debounceTime()` waits for a **pause** in the emissions from the source. When the source emits a value, `debounceTime` starts a timer for a specified duration (let's say `X` milliseconds).

- If the source emits _another_ value _before_ that `X` milliseconds timer runs out, the operator discards the previous value and restarts the timer for the _new_ value.
- Only if the timer completes its full `X` milliseconds _without_ any new values arriving from the source, will `debounceTime` finally emit the _last_ value it received.

In short, it only emits a value after a specific period of **silence** from the source Observable.

!!! abstract "At a glance"

    - **Signature:** `debounceTime(dueTime)`
    - **Use when:** bursty input where only the settled value matters: typing, window resize, slider drags
    - **Avoid when:** you need periodic values during continuous activity, or intermediate values must not be lost
    - **Top gotcha:** nothing is emitted until the source stays silent for `dueTime`; a stream that never pauses starves everything downstream

## Key Characteristics

1.  **Requires Silence:** It waits for a specified duration (`dueTime`) where no new values are emitted by the source.
2.  **Emits Last Value:** When the silence duration is met, it emits the _most recent_ value received from the source _before_ the silence began.
3.  **Resets Timer:** Each new emission from the source before the `dueTime` expires resets the timer. Intermediate values are discarded.
4.  **Rate Limiting:** Effectively limits the rate at which values pass through, based on pauses in activity.

## Minimal Example

```typescript
import { Subject, debounceTime } from "rxjs";

const keystrokes$ = new Subject<string>();

keystrokes$.pipe(debounceTime(300)).subscribe(console.log);

keystrokes$.next("L");
keystrokes$.next("La");
keystrokes$.next("Lap"); // rapid emissions keep resetting the 300ms timer
setTimeout(() => keystrokes$.next("Laptop"), 100);

// After 300ms of silence, exactly one value comes through:
// Laptop
```

## Real-World Analogy: Autocomplete Search Box

This is the classic example! Imagine searching on a website. You type into the search box:

- `L` -> (API call for "L"? No, too quick!)
- `La` -> (API call for "La"? No, too quick!)
- `Lap` -> (API call for "Lap"? No, too quick!)
- `Lapt` -> (API call for "Lapt"? No, too quick!)
- `Lapto` -> (API call for "Lapto"? No, too quick!)
- `Laptop` -> (User pauses typing for 300ms...) -> **OK, NOW send API request for "Laptop"**

You don't want to send an API request to your server for _every single letter_ the user types. That would be incredibly inefficient and costly. Instead, you use `debounceTime(300)`. The operator waits until the user pauses typing for 300 milliseconds. Only then does it take the _last_ value typed ("Laptop") and send it to the server for searching. If the user types quickly without pausing, all the intermediate values ("L", "La", "Lap", etc.) are ignored.

## Angular Example: Typeahead Search Input

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { toSignal } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged, of, switchMap } from "rxjs";

@Component({
  selector: "app-efficient-search",
  imports: [ReactiveFormsModule],
  template: `
    <input
      type="search"
      [formControl]="searchControl"
      placeholder="Enter search term..."
    />

    <ul>
      @for (result of results(); track result) {
        <li>{{ result }}</li>
      } @empty {
        <li>No results yet.</li>
      }
    </ul>
  `,
})
export class EfficientSearchComponent {
  private readonly http = inject(HttpClient);

  protected readonly searchControl = new FormControl("", {
    nonNullable: true,
  });

  protected readonly results = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300), // wait for a 300ms pause in typing
      distinctUntilChanged(), // skip if the settled value did not change
      switchMap((term) =>
        term
          ? this.http.get<string[]>("/api/search", { params: { q: term } })
          : of([]),
      ),
    ),
    { initialValue: [] },
  );
}
```

**How it works:**

1. `debounceTime(300)` holds back keystrokes until the user pauses for 300ms, then emits only the latest value.
2. `distinctUntilChanged()` skips the request when the settled text is the same as last time (type, delete, retype).
3. `switchMap` fires the request for the settled term and cancels a stale in-flight request if the user resumes typing.
4. `toSignal` subscribes once, feeds the template, and cleans up on destroy.

Using `debounceTime` here dramatically improves user experience and reduces unnecessary load on backend services.

## Common Mistakes

**Confusing debounce with throttle.** During continuous activity (holding a key, dragging), `debounceTime` emits nothing until the activity stops. If you need regular updates while the stream is active, throttling or sampling is the right family, not debouncing.

**Debouncing after the work instead of before.** `switchMap(fetch)` followed by `debounceTime` still fires a request per keystroke and merely delays the display. The debounce must come **before** the expensive operation.

**Extreme durations.** Below ~150ms a debounce barely coalesces keystrokes; above ~500ms the UI feels laggy. For typical typeahead inputs, 200-400ms is the working range.

## Interview Q&A

??? question "What is the difference between debounceTime and throttleTime?"

    `debounceTime` waits for a pause and emits the last value after silence; during constant activity it emits nothing. `throttleTime` emits a value, then enforces a cooldown during which emissions are ignored; it produces output at a steady maximum rate even while the source stays busy. Typing wants debounce; scroll/mousemove handlers usually want throttle.

??? question "Why does distinctUntilChanged usually come right after debounceTime?"

    Debouncing can settle on the same value twice in a row (type "cat", delete, retype "cat"). `distinctUntilChanged` drops that duplicate so no redundant request fires. Before the debounce it would compare raw keystrokes instead of settled values and achieve little.

??? question "What happens to the values emitted during the quiet-period timer?"

    Each new value replaces the pending one and restarts the timer; the replaced values are discarded permanently. `debounceTime` is lossy by design, which is exactly why it fits "only the final intent matters" inputs.

## Related

- [distinctUntilChanged](distinctUntilChanged.md), its standard companion in search pipelines
- [switchMap](../transformation/switchMap.md) for cancelling the stale requests the debounce did not prevent
- [filter](filter.md) for predicate-based (rather than time-based) filtering
