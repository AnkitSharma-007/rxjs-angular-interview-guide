# Comparisons

Interviewers rarely ask "what does `switchMap` do?" in isolation. They ask "when would you use `switchMap` instead of `mergeMap`?" These pages put similar tools side by side so you can answer with confidence, and revise quickly before an interview.

## Available comparisons

- **[switchMap vs mergeMap vs concatMap](switchMap-mergeMap-concatMap.md)**: the higher-order mapping strategies. Cancellation vs concurrency vs strict ordering, and which real scenarios call for each.
- **[Subject vs BehaviorSubject vs ReplaySubject](subject-behaviorSubject-replaySubject.md)**: what a new subscriber receives from each Subject type and how to choose.

## Related quick reads

- [EMPTY vs NEVER](../operators/creation/empty-never.md): two observables that emit nothing, with very different completion behavior.
- [Promise vs Observable](../learn/promise-vs-observable.md): the classic interview opener.
- [Cold](../learn/cold-observables.md) vs [Hot](../learn/hot-observables.md) observables: per-subscriber execution vs shared live streams.
