---
description: "Realistic Angular/RxJS interview scenarios with the reasoning interviewers want to hear."
tags:
  - Interview Prep
---

# Scenario Walkthroughs

Interviewers rarely ask for definitions; they describe a feature and watch you design the stream. Each scenario below gives the requirement, the reasoning that should come out loud, and the solution shape. **Lead with the decision criterion, then the operator.**

## 1. Type-Ahead Search

**Requirement:** search as the user types; no request spam; results never stale.

**Reasoning to say out loud:** keystrokes are bursty → settle them (`debounceTime`). Same settled term twice → skip (`distinctUntilChanged`). Only the latest term's results matter → cancel stale requests (`switchMap`). One failed request must not kill the search box → `catchError` on the **inner** stream.

```typescript
searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((term) => this.api.search(term).pipe(catchError(() => of([])))),
);
```

**Follow-up they will ask:** why not `mergeMap`? Out-of-order responses could render stale results. Full page: [switchMap](../operators/transformation/switchMap.md).

## 2. Submit Button Double-Click Protection

**Requirement:** one order per click storm; in-flight submission must finish untouched.

**Reasoning:** repeats while busy should be **dropped**, not queued (`concatMap` would submit five times) and not cancelled (`switchMap` would abort a live write). That is [`exhaustMap`](../operators/transformation/exhaustMap.md), plus a disabled button for feedback.

```typescript
this.submits$.pipe(
  exhaustMap(() => {
    // inside the projection: only an accepted click flips the state,
    // dropped clicks must not touch it
    this.submitting.set(true);
    return this.api
      .placeOrder(order)
      .pipe(finalize(() => this.submitting.set(false)));
  }),
);
```

**Follow-up:** login forms — same answer, same reasoning.

## 3. Dashboard: Parallel Loads with Partial Failure

**Requirement:** three widgets load together; one failing widget must not blank the dashboard.

**Reasoning:** independent one-shot calls, all results needed once → [`forkJoin`](../operators/combination/forkJoin.md) dictionary. Its all-or-nothing error behavior is the trap → `catchError` per source with a fallback.

```typescript
forkJoin({
  sales: this.api.sales().pipe(catchError(() => of(null))),
  traffic: this.api.traffic().pipe(catchError(() => of(null))),
  alerts: this.api.alerts().pipe(catchError(() => of([]))),
});
```

**Follow-up:** results should stream in as they arrive instead? `merge` the requests or render each widget from its own stream.

## 4. Route-Driven Detail Page

**Requirement:** `/users/:id`; correct data on every navigation, including sibling-to-sibling.

**Reasoning:** the router **reuses** the component between sibling routes, so load from the `paramMap` stream, not a snapshot; a new id makes the old request worthless → `switchMap`.

```typescript
this.route.paramMap.pipe(
  map((p) => p.get("id")!),
  switchMap((id) => this.api.getUser(id)),
);
```

**Follow-up:** where does the loading state go? Wrap the inner request with the [state pattern](../angular/http-patterns.md). Full page: [Router](../angular/router.md).

## 5. Poll a Job Until It Finishes

**Requirement:** check an export job every 2s; stop when it leaves "processing"; show the final status; stop if the user leaves.

**Reasoning:** cadence → `timer(0, 2000)`; each tick fetches, latest wins → `switchMap`; stop condition lives **in the data** → `takeWhile(..., inclusive)`; lifecycle safety → `takeUntilDestroyed`.

```typescript
timer(0, 2000).pipe(
  switchMap(() => this.api.jobStatus(id)),
  takeWhile((s) => s.state === "processing", true), // keep the terminal status
  takeUntilDestroyed(),
);
```

**Follow-up:** add backoff on errors → `retry({ delay })` on the inner request. Full page: [takeWhile](../operators/filtering/takeWhile.md).

## 6. Autosave a Form

**Requirement:** save after the user pauses; never save invalid data; show save status.

**Reasoning:** pause detection → `debounceTime`; validity gate → `filter(() => form.valid)`; save call: full-document saves, latest state wins → `switchMap` (deltas that must all land in order would be `concatMap`, say both).

```typescript
form.valueChanges.pipe(
  debounceTime(800),
  filter(() => this.form.valid),
  switchMap((value) => this.api.save(value).pipe(catchError(() => of(null)))),
  takeUntilDestroyed(),
);
```

Full page: [Reactive Forms](../angular/reactive-forms.md).

## 7. Shared Cache That Updates After Writes

**Requirement:** every component shows the same user list from one request; a successful create/edit refreshes it everywhere.

**Reasoning:** cold + unicast means N subscribers = N requests → multicast with `shareReplay`; completed sources cache permanently, so refresh must rebuild the stream → drive it from a trigger Subject.

```typescript
readonly users$ = this.refresh$.pipe(
  startWith(void 0),
  switchMap(() => this.http.get<User[]>("/api/users")),
  shareReplay({ bufferSize: 1, refCount: true })
);
invalidate() { this.refresh$.next(); }
```

Full page: [Caching](../angular/caching.md).

## 8. Global Loading Indicator Across All Requests

**Requirement:** show a spinner while **any** HTTP request is in flight.

**Reasoning:** the elegant stream answer is a **request counter**: an interceptor pushes `+1` on start and `-1` on finalize into a Subject; `scan` accumulates; `map` to `count > 0`; `distinctUntilChanged` stops flicker.

```typescript
// in the interceptor: counter$.next(1); ... finalize(() => counter$.next(-1))
readonly loading$ = this.counter$.pipe(
  scan((count, delta) => count + delta, 0),
  map((count) => count > 0),
  distinctUntilChanged()
);
```

**Follow-up:** debounce short flickers with `auditTime(100)` or a `switchMap`-to-`timer` off-delay. Building blocks: [scan](../operators/transformation/scan.md), [Interceptors](../angular/interceptors-retry.md).

## How to Practice

For each scenario, cover the code and re-derive it from the requirement. The interview skill is the middle column: requirement → criterion → operator.
