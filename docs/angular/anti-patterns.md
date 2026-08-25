---
description: "The RxJS habits that fail code reviews and interviews, each with its fix."
tags:
  - Angular
---

# RxJS Anti-Patterns

Interviewers love anti-patterns because they reveal how you actually write code. Each pattern below shows the smell, why it hurts, and the fix. Recognizing these on sight, and naming the fix, is one of the fastest ways to look senior.

## 1. Nested Subscribes

```typescript
// SMELL: subscription inside a subscription
this.route.paramMap.subscribe((params) => {
  this.api.getUser(params.get("id")!).subscribe((user) => {
    this.user = user;
  });
});
```

No cancellation (stale responses race), no unified error handling, leak-prone inner subscriptions.

```typescript
// FIX: flatten with a higher-order operator
this.route.paramMap
  .pipe(
    map((params) => params.get("id")!),
    switchMap((id) => this.api.getUser(id)),
    takeUntilDestroyed(),
  )
  .subscribe((user) => (this.user = user));
```

The choice of [`switchMap`](../operators/transformation/switchMap.md)/[`concatMap`](../operators/transformation/concatMap.md)/[`exhaustMap`](../operators/transformation/exhaustMap.md) is the follow-up question; have a reason ready.

## 2. Fat Subscribe Callbacks

```typescript
// SMELL: transformation logic buried in subscribe
stream$.subscribe((data) => {
  const active = data.filter((d) => d.active);
  const names = active.map((d) => d.name.toUpperCase());
  if (names.length > 0) this.names = names;
});
```

Untestable, unreusable, invisible to operators downstream.

```typescript
// FIX: declare the transformation in the pipe; subscribe only assigns
stream$
  .pipe(
    map((data) =>
      data.filter((d) => d.active).map((d) => d.name.toUpperCase()),
    ),
    filter((names) => names.length > 0),
  )
  .subscribe((names) => (this.names = names));
```

## 3. Exposing Raw Subjects

```typescript
// SMELL: anyone can next() into the service's state
readonly state = new BehaviorSubject<State>(initial);
```

```typescript
// FIX: private write, public read
private readonly _state = new BehaviorSubject<State>(initial);
readonly state$ = this._state.asObservable();
```

Mutations go through named service methods, keeping every state change traceable.

## 4. Manual Subscribe Where a Binding Would Do

```typescript
// SMELL: subscribe + property + cleanup, only to display a value
this.api
  .getItems()
  .pipe(takeUntilDestroyed())
  .subscribe((i) => (this.items = i));
```

```typescript
// FIX: let the framework consume the stream
protected readonly items = toSignal(this.api.getItems(), { initialValue: [] });
// or in the template: @if (items$ | async; as items) { ... }
```

Manual subscriptions are for side effects; display data belongs to [`toSignal`](signals-interop.md) or the [async pipe](async-pipe.md).

## 5. `shareReplay` With Default Config on Infinite Sources

```typescript
// SMELL: bare shareReplay keeps the source alive forever (refCount: false)
readonly ticks$ = interval(1000).pipe(shareReplay(1));
```

```typescript
// FIX: make the lifecycle decision explicit
readonly ticks$ = interval(1000).pipe(shareReplay({ bufferSize: 1, refCount: true }));
```

Details and the completion caveat: [shareReplay](../subjects/shareReplay.md).

## 6. Streams Created in Getters or Template Calls

```typescript
// SMELL: a new Observable (and subscription, via async pipe) per change detection run
get user$() {
  return this.http.get<User>("/api/me");
}
```

Every CD cycle re-invokes the getter; the async pipe sees a new stream each time, resubscribes, and refires the request.

```typescript
// FIX: create once, as a field
readonly user$ = this.http.get<User>("/api/me").pipe(shareReplay({ bufferSize: 1, refCount: true }));
```

## 7. Error Handling at the Wrong Level

```typescript
// SMELL: one failed search kills the whole typeahead
term$.pipe(
  switchMap((t) => this.api.search(t)),
  catchError(() => of([])),
);
```

The `catchError` replaces the **outer** stream after the first failure; typing stops working.

```typescript
// FIX: contain errors on the inner stream
term$.pipe(switchMap((t) => this.api.search(t).pipe(catchError(() => of([])))));
```

Why this follows from the [Observable contract](../learn/observable-contract.md) is a favorite follow-up.

## 8. Mixing async/await With Streams Mid-Pipeline

```typescript
// SMELL: escape to promises, lose cancellation and operators
const user = await firstValueFrom(this.route.paramMap.pipe(/* ... */));
```

`firstValueFrom` is legitimate at true boundaries (guards, one-shot bootstraps). As a habit inside reactive flows it discards cancellation, retries, and composition, and snapshots a stream that should stay live.

## 9. Lifecycle Flags Instead of Completion

```typescript
// SMELL: checked only when the source emits; silent streams leak
stream$.pipe(takeWhile(() => this.alive)).subscribe(...);
```

```typescript
// FIX: complete on the destroy signal, regardless of source activity
stream$.pipe(takeUntilDestroyed()).subscribe(...);
```

## Interview Q&A

??? question "What is wrong with nested subscribes, precisely?"

    Three things: the inner subscriptions are not cancelled when the outer emits again (race conditions and stale UI), errors in the inner stream bypass the outer pipeline's handling, and teardown of the inner subscriptions is unmanaged (leaks). Higher-order mapping operators solve all three declaratively.

??? question "Which anti-pattern causes duplicate HTTP requests, and why?"

    Streams created per change-detection pass (getters/method calls in templates) and multiple async pipes on an unshared cold source. Both create extra subscriptions, and each subscription of a cold Observable re-executes the producer. Fix with field-initialized streams plus `shareReplay`, or a single `toSignal`.

??? question "How do you keep subscribe callbacks thin?"

    Move transformation into `map`/`filter`/`scan`, side effects into `tap`, error mapping into `catchError`, and let the subscriber do exactly one thing: hand the final value to the UI layer. If the callback has an `if` and a loop, operators are missing.

## Related

- [Memory Leaks](memory-leaks.md) for the cleanup-focused subset
- [switchMap vs mergeMap vs concatMap vs exhaustMap](../comparisons/switchMap-mergeMap-concatMap.md), the follow-up to anti-pattern #1
- [The Observable Contract](../learn/observable-contract.md), the theory behind #7
