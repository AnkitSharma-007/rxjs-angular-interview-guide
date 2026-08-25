---
description: "Turn DOM and other event-target events into an Observable stream."
tags:
  - Operators
  - Creation
---

# fromEvent

`fromEvent()` creates an Observable from events on an event target: DOM elements, `document`, `window`, or anything with `addEventListener`/`removeEventListener` (and several Node.js equivalents).

Each subscription registers an event listener; unsubscribing removes it. The stream never completes on its own, because events can always keep arriving.

!!! abstract "At a glance"

    - **Signature:** `fromEvent(target, eventName, options?)`
    - **Use when:** reacting to global targets (`window`, `document`) or composing event streams with operators
    - **Avoid when:** a simple element event is enough; Angular's `(click)="..."` template binding is cleaner and testable
    - **Top gotcha:** the stream never completes; without teardown, the listener (and the component it captures) leaks

## Key Characteristics

- **Hot behavior:** Events fire whether or not anyone subscribes; late subscribers miss earlier events.
- **Listener per subscription:** Each `subscribe` adds its own listener; each unsubscribe removes it.
- **Never completes:** Completion must come from operators (`take`, `takeUntil`, `takeUntilDestroyed`).

## Minimal Example

```typescript
import { fromEvent, throttleTime, map } from "rxjs";

fromEvent<MouseEvent>(document, "click")
  .pipe(
    throttleTime(1000), // at most one click per second
    map((event) => `${event.clientX}, ${event.clientY}`),
  )
  .subscribe(console.log);

// logs the coordinates of at most one click per second
```

## Angular Example: Global Escape-Key Handler

Element events belong in templates (`(keydown)="..."`). `fromEvent` earns its place for **global** targets the template cannot reach:

```typescript
import { Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter, fromEvent } from "rxjs";

@Component({
  selector: "app-modal",
  template: `
    @if (open()) {
      <div class="modal">
        <p>Press Escape to close me.</p>
        <button (click)="open.set(false)">Close</button>
      </div>
    }
  `,
})
export class ModalComponent {
  protected readonly open = signal(true);

  constructor() {
    fromEvent<KeyboardEvent>(document, "keydown")
      .pipe(
        filter((event) => event.key === "Escape"),
        takeUntilDestroyed(), // removes the document listener with the component
      )
      .subscribe(() => this.open.set(false));
  }
}
```

**How it works:**

1. `fromEvent(document, "keydown")` registers one `keydown` listener on `document` when the subscription starts.
2. `filter` keeps only Escape presses.
3. `takeUntilDestroyed()` completes the stream when the component is destroyed, which runs `fromEvent`'s teardown and removes the listener. No manual `removeEventListener` bookkeeping.

## Common Mistakes

**No teardown.** A `fromEvent(window, "resize")` subscription without `takeUntilDestroyed`/`takeUntil` keeps the listener, and everything it closes over, alive after the component dies. This is a top-three Angular memory leak.

**Using `fromEvent` where a template binding works.** For events on the component's own elements, `(click)`, `(input)`, and friends are simpler, zone-aware, and easier to test. Reserve `fromEvent` for global targets and operator-heavy pipelines.

**Reading element refs too early.** `fromEvent(this.el().nativeElement, ...)` in a constructor runs before the view exists. Use `afterNextRender` or a template binding instead.

## Interview Q&A

??? question "Is fromEvent hot or cold?"

    Hot in behavior: the event source exists and fires independently of subscribers, and missed events are never replayed. Technically each subscription registers its own listener, but all listeners observe the same external producer, which is the defining trait of a hot stream.

??? question "What happens on unsubscribe?"

    The teardown returned by `fromEvent` calls `removeEventListener` with the same handler, cleanly detaching from the target. This is a concrete example of why Observable cancellation is more than "stop delivering values": it releases the underlying resource.

??? question "When would you choose fromEvent over an Angular template event binding?"

    Global targets (`document`, `window`), events needing stream composition (throttling scrolls, combining with other streams), or code outside a component's template, like directives operating on arbitrary hosts.

## Related

- [debounceTime](../filtering/debounceTime.md) and throttling, the usual companions for noisy events
- [takeUntil](../filtering/takeUntil.md) for signal-based listener cleanup
- [Hot Observables](../../learn/hot-observables.md) for the hot/cold model
