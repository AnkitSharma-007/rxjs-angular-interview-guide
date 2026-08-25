---
description: "Caching HTTP data with shareReplay: per-key caches, refresh triggers, TTL, and stale-while-revalidate."
tags:
  - Angular
---

# Caching with RxJS

Because `HttpClient` streams are [cold and unicast](../learn/unicast-vs-multicast.md), every subscriber re-runs the request. Caching in RxJS means **multicasting a completed result**, and [`shareReplay`](../subjects/shareReplay.md) is the primitive. The interview material is in the details: refresh, invalidation, keys, and staleness.

!!! abstract "At a glance"

    - **Primitive:** `shareReplay({ bufferSize: 1, refCount: true })` on the request stream
    - **Key fact:** once the source **completes**, the cached value replays to every future subscriber, regardless of `refCount`; refresh requires rebuilding the stream
    - **Errors are not cached:** a failed request resets the share; the next subscriber retries
    - **Top gotcha:** per-key caches (`Map<string, Observable<T>>`) grow forever without an eviction policy

## Level 1: Cache Forever (Per App Session)

```typescript
@Injectable({ providedIn: "root" })
export class ConfigService {
  private readonly http = inject(HttpClient);

  // one request per app lifetime; every subscriber replays the result
  readonly config$ = this.http
    .get<AppConfig>("/api/config")
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));
}
```

Right for data that cannot change during a session. Remember the completion caveat: after the request completes, `refCount` no longer matters; the value is cached until the service (usually the app) is destroyed.

## Level 2: Refreshable Cache

To support invalidation, drive the request from a trigger and let [`switchMap`](../operators/transformation/switchMap.md) rebuild it:

```typescript
@Injectable({ providedIn: "root" })
export class UserListService {
  private readonly http = inject(HttpClient);
  private readonly refresh$ = new Subject<void>();

  readonly users$ = this.refresh$.pipe(
    startWith(void 0), // initial load
    switchMap(() => this.http.get<User[]>("/api/users")),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  invalidate(): void {
    this.refresh$.next(); // all subscribers receive the fresh list
  }
}
```

Mutations call `invalidate()` after a successful write; every consumer, template or effect, updates automatically. This trigger + `switchMap` + `shareReplay` trio is the single most useful caching pattern to know by heart.

## Level 3: Per-Key Caches

Entity lookups need one cached stream per id:

```typescript
private readonly cache = new Map<string, Observable<User>>();

getUser(id: string): Observable<User> {
  let user$ = this.cache.get(id);
  if (!user$) {
    user$ = this.http
      .get<User>(`/api/users/${id}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.cache.set(id, user$);
  }
  return user$;
}

evict(id: string): void {
  this.cache.delete(id); // next getUser(id) refetches
}
```

Two obligations come with the Map: **eviction** (delete on mutation, or cap the size) and remembering that a cached **error** is not stored; a failed stream resets and the next subscriber retries.

## Level 4: Time-Based Expiry and Stale-While-Revalidate

**TTL:** rebuild on a timer instead of a manual trigger:

```typescript
readonly rates$ = timer(0, 60_000).pipe( // now, then every minute
  switchMap(() => this.http.get<Rates>("/api/rates")),
  shareReplay({ bufferSize: 1, refCount: true }) // refCount stops polling with no subscribers
);
```

Here `refCount: true` genuinely matters: the source never completes, so the polling stops when the last subscriber leaves and restarts on demand.

**Stale-while-revalidate:** serve the old value instantly, then the fresh one, using [`concat`](../operators/combination/concat.md):

```typescript
getDashboard(): Observable<Dashboard> {
  const cached = this.lastValue; // e.g. kept via tap() into a field or storage
  const fresh$ = this.http
    .get<Dashboard>("/api/dashboard")
    .pipe(tap((d) => (this.lastValue = d)));
  return cached ? concat(of(cached), fresh$) : fresh$;
}
```

## Common Mistakes

**Expecting `refCount: true` to refresh completed requests.** It cannot: completion caches permanently. Refresh is a _stream design_ concern (Level 2), not a config flag. Details on [shareReplay](../subjects/shareReplay.md).

**Caching in components.** A component-owned cache dies with the component and duplicates across instances. Caches belong in `providedIn: "root"` services, where lifetime matches the data.

**No invalidation story.** A cache without `invalidate()`/`evict()` calls after writes serves stale data forever. Design the write path and the cache together.

## Interview Q&A

??? question "How do you cache an HTTP response so N components share one request?"

    A root service exposes the request piped through `shareReplay({ bufferSize: 1, refCount: true })`. First subscriber triggers the request; everyone else replays the result. Strong answers volunteer the refresh limitation and the trigger + `switchMap` pattern that solves it.

??? question "Your cached list must update after a POST. What changes?"

    Move to the refreshable design: a `refresh$` Subject, `startWith` for the initial load, `switchMap` into the GET, `shareReplay` at the end. The mutation flow becomes POST → on success `refresh$.next()` → every subscriber gets the new list.

??? question "How would you add a 5-minute TTL?"

    Replace the manual trigger with `timer(0, 300_000)` driving the `switchMap`, keeping `refCount: true` so the timer pauses without subscribers. For expiry-on-read instead of polling, store a timestamp alongside the cached stream and rebuild when it is older than the TTL at access time.

## Related

- [shareReplay](../subjects/shareReplay.md), the primitive and its semantics
- [concat](../operators/combination/concat.md) for the stale-while-revalidate shape
- [HttpClient Patterns](http-patterns.md) for the surrounding request architecture
