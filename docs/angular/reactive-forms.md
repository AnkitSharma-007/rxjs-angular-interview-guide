---
description: "valueChanges patterns: debounced search, autosave, dependent fields, and the emission gotchas."
tags:
  - Angular
---

# Reactive Forms & RxJS

Reactive forms are stream factories: every control exposes `valueChanges` and `statusChanges` Observables. Almost everything interesting you can do with a form, autosave, dependent fields, live validation feedback, is an RxJS pipeline over those streams.

!!! abstract "At a glance"

    - **`valueChanges`:** emits the control's value on every change; never completes
    - **`statusChanges`:** emits `VALID`/`INVALID`/`PENDING`/`DISABLED`; the stream to watch for async-validator results
    - **Top gotcha:** neither stream emits the **initial** value; combine with `startWith(control.value)` when the pipeline needs it
    - **Second gotcha:** `setValue`/`patchValue` also trigger `valueChanges`; use `{ emitEvent: false }` to avoid feedback loops

!!! warning "Zoneless change detection and form state"

    Programmatic model updates (`setValue`, `patchValue`, `FormArray` mutations) update form state and emit through `valueChanges`/`statusChanges`, but they do **not** schedule change detection under Angular's default zoneless mode. Templates that display form-derived state must consume it through a notification source: pipe the form streams into signals with `toSignal`, or bind with the async pipe, as the patterns on this page do.

## Pattern 1: Debounced Search

The canonical pipeline, covered in depth on [debounceTime](../operators/filtering/debounceTime.md) and [switchMap](../operators/transformation/switchMap.md):

```typescript
protected readonly results = toSignal(
  this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((term) => this.api.search(term))
  ),
  { initialValue: [] }
);
```

## Pattern 2: Autosave

Persist the form after the user pauses, skipping invalid states:

```typescript
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { catchError, debounceTime, filter, of, switchMap } from "rxjs";

@Component({
  selector: "app-profile-form",
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <input formControlName="displayName" placeholder="Display name" />
      <input formControlName="bio" placeholder="Bio" />
    </form>
    <small>{{ saveState() }}</small>
  `,
})
export class ProfileFormComponent {
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    displayName: ["", Validators.required],
    bio: [""],
  });

  protected readonly saveState = signal("");

  constructor() {
    this.form.valueChanges
      .pipe(
        debounceTime(800), // wait for a typing pause
        filter(() => this.form.valid), // never autosave invalid data
        switchMap((value) => {
          this.saveState.set("Saving...");
          return this.api.save(value).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) =>
        this.saveState.set(result ? "Saved" : "Save failed"),
      );
  }

  private readonly api = inject(ProfileApi);
}
```

Operator choice is the interview follow-up: `switchMap` (latest state wins, earlier saves may be aborted) fits full-document saves; [`concatMap`](../operators/transformation/concatMap.md) fits incremental/append-style saves where every version must land, in order.

## Pattern 3: Dependent Fields

One control's value drives another's options:

```typescript
protected readonly cities = toSignal(
  this.form.controls.country.valueChanges.pipe(
    startWith(this.form.controls.country.value), // load cities for the initial country too
    switchMap((country) => this.api.getCities(country))
  ),
  { initialValue: [] }
);
```

When the resulting data must also **reset** the dependent control, do it in a `tap` with `{ emitEvent: false }` to avoid triggering that control's own pipelines.

## Pattern 4: Watching Validity, Not Values

Async validators make validity asynchronous; `statusChanges` is the stream that reflects it:

```typescript
protected readonly canSubmit = toSignal(
  this.form.statusChanges.pipe(
    startWith(this.form.status),
    map((status) => status === "VALID")
  ),
  { initialValue: false }
);
```

Checking `form.valid` at the moment of `valueChanges` can read `PENDING` as invalid while an async validator runs; `statusChanges` gets the settled answer.

## Common Mistakes

**Expecting the current value on subscribe.** `valueChanges` is a plain [Subject-backed](../subjects/subject.md) event stream, not a `BehaviorSubject`: no replay. Prepend `startWith(control.value)` when the pipeline must start from current state.

**Programmatic-update feedback loops.** A pipeline that calls `patchValue` on the same form it listens to recurses (or at best double-fires). Break the loop with `{ emitEvent: false }` or by patching a different control subtree.

**Subscribing to parent- or service-owned controls without cleanup.** A control owned by the component dies with it, but streams of longer-lived controls outlive the subscriber; `takeUntilDestroyed()` applies exactly as described in [Memory Leaks](memory-leaks.md).

## Interview Q&A

??? question "Why did my valueChanges pipeline do nothing until the user typed?"

    Because `valueChanges` emits only on changes; there is no initial replay. `startWith(control.value)` (or seeding via `defaultValue` plus an explicit first run) makes pipelines that derive state from the form work from the first render.

??? question "How do you build autosave and which operator handles the save call?"

    Debounce, filter on validity, then a higher-order map into the save request. `switchMap` when only the newest document state matters; `concatMap` when saves are deltas that must all apply in order; add `exhaustMap` to the discussion for explicit save buttons.

??? question "What is the difference between valueChanges and statusChanges?"

    `valueChanges` streams data; `statusChanges` streams the validity state machine (`VALID`/`INVALID`/`PENDING`/`DISABLED`). With async validators, validity settles later than the value, so submit-enablement and validation UX belong on `statusChanges`.

## Related

- [debounceTime](../operators/filtering/debounceTime.md) and [distinctUntilChanged](../operators/filtering/distinctUntilChanged.md), the input-stream staples
- [startWith](../operators/combination/startWith.md) for the missing initial emission
- [Signals & RxJS Interop](signals-interop.md) for delivering form-derived streams to templates
