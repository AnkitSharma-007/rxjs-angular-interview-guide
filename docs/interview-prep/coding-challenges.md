---
description: "Write-the-code RxJS exercises with hidden solutions: the kind asked in live-coding rounds."
tags:
  - Interview Prep
---

# Coding Challenges

Live-coding rounds ask for small, precise pipelines. Write each one yourself (editor or paper) before expanding the solution. Target: solution shape correct in under three minutes each.

## 1. Emit 1, 2, 3 with one second between values

??? example "Solution"

    ```typescript
    import { interval, map, take } from "rxjs";

    interval(1000).pipe(
      take(3),
      map((i) => i + 1)
    ).subscribe(console.log);
    ```

    Also valid: `from([1,2,3]).pipe(concatMap((n) => of(n).pipe(delay(1000))))`. Mentioning both, and that plain `delay` on `from([1,2,3])` would NOT space the values (one shared shift), is bonus credit.

## 2. A search stream: debounced, trimmed, duplicate-free, cancellable

??? example "Solution"

    ```typescript
    searchControl.valueChanges.pipe(
      debounceTime(300),
      map((term) => term.trim()),
      distinctUntilChanged(),
      switchMap((term) =>
        term ? api.search(term).pipe(catchError(() => of([]))) : of([])
      )
    );
    ```

    Order matters: trim **before** `distinctUntilChanged`, errors caught **inside** `switchMap`.

## 3. A pausable counter (pause/resume buttons)

??? example "Solution"

    ```typescript
    import { BehaviorSubject, EMPTY, interval, scan, switchMap } from "rxjs";

    const paused$ = new BehaviorSubject(false);

    const count$ = paused$.pipe(
      switchMap((paused) => (paused ? EMPTY : interval(1000))),
      scan((count) => count + 1, 0)
    );
    ```

    The insight: `switchMap` swaps between a live `interval` and `EMPTY`; `scan` preserves the count across swaps because it sits downstream of the switch.

## 4. Process at most one click per 2 seconds, but never lose the last one

??? example "Solution"

    ```typescript
    clicks$.pipe(
      throttleTime(2000, undefined, { leading: true, trailing: true })
    );
    ```

    The default `{ trailing: false }` would drop the final click of a burst; naming that config is the point of the exercise.

## 5. Full name from two form controls, updating on either change

??? example "Solution"

    ```typescript
    combineLatest([
      firstName.valueChanges.pipe(startWith(firstName.value)),
      lastName.valueChanges.pipe(startWith(lastName.value)),
    ]).pipe(
      map(([first, last]) => `${first} ${last}`.trim())
    );
    ```

    Without `startWith`, nothing emits until **both** controls have been touched, the classic `combineLatest` trap.

## 6. Retry a request up to 3 times (4 attempts total) with exponential backoff, then fall back to a default

??? example "Solution"

    ```typescript
    http.get<Config>("/api/config").pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => timer(1000 * 2 ** (retryCount - 1)),
      }),
      catchError(() => of(DEFAULT_CONFIG))
    );
    ```

    `count: 3` means three retries after the initial attempt, four requests worst case, with 1s, 2s, 4s delays; `retry` before `catchError` or there is nothing left to retry.

## 7. Click counter with a reset button

??? example "Solution"

    ```typescript
    import { map, merge, scan, Subject } from "rxjs";

    const click$ = new Subject<void>();
    const reset$ = new Subject<void>();

    const count$ = merge(
      click$.pipe(map(() => "add" as const)),
      reset$.pipe(map(() => "reset" as const))
    ).pipe(
      scan((count, action) => (action === "reset" ? 0 : count + 1), 0)
    );
    ```

    The shape to remember: **merge the action streams, reduce with scan**, a two-line Redux.

## 8. Stop polling when the job leaves \"processing\", but keep the final status

??? example "Solution"

    ```typescript
    timer(0, 2000).pipe(
      switchMap(() => api.jobStatus(id)),
      takeWhile((status) => status.state === "processing", true)
    );
    ```

    The second argument (`inclusive: true`) is the trap; without it the terminal "done"/"failed" status is swallowed.

## Grading Yourself

- Shape right on the first try: interview-ready for that pattern.
- Needed the solution: re-derive it from the requirement tomorrow, then again in three days.
- Wrong operator family: reread the [cheat sheet quadrant](cheat-sheet-operators.md#higher-order-mapping-the-quadrant) and the [scenarios](scenarios.md).
