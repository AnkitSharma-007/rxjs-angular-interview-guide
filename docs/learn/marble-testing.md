---
description: "Test debounce, retry, and switchMap pipelines in milliseconds with TestScheduler, virtual time, and marble diagrams."
tags:
  - Fundamentals
---

# Marble Testing with TestScheduler

The [schedulers page](schedulers.md) calls virtual time the single most practical scheduler skill. This page is that skill. `TestScheduler` replaces the real clock with a virtual one, so a pipeline full of `debounceTime(300)` and `timer` calls runs **deterministically and instantly**: no waiting, no flaky sleeps, and exact assertions on _when_ every value fires.

The test language is the **marble diagram**: a string where each character is a moment in virtual time.

!!! abstract "At a glance"

    - **Setup:** `new TestScheduler(assertDeepEqual)` and everything inside `testScheduler.run(helpers => { ... })`
    - **Helpers:** `cold()` and `hot()` build sources from marbles; `expectObservable().toBe()` asserts output; `expectSubscriptions()` proves (un)subscription timing
    - **Use when:** any pipeline whose behavior depends on time or ordering: debounce, throttle, retry backoff, switchMap cancellation
    - **Top gotcha:** each value character **consumes one virtual millisecond**, so frame arithmetic is off by one until you account for it

## The Marble Syntax

| Symbol           | Meaning                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `-`              | One frame of virtual time (1ms inside `run()`) passes, nothing happens                            |
| `a`, `b`, `0`... | The source emits the value bound to that character (also consumes 1ms)                            |
| `\|`             | The stream completes                                                                              |
| `#`              | The stream errors                                                                                 |
| `()`             | Grouping: everything inside happens in the same frame, e.g. `(a\|)` = emit then complete together |
| `^`              | In `hot()` marbles: the moment the test subscribes. In subscription marbles: subscription starts  |
| `!`              | In subscription marbles: unsubscription                                                           |
| `300ms`          | Time-progression shorthand: advances virtual time without spelling out 300 dashes                 |
| whitespace       | Ignored entirely; use it to align related marbles                                                 |

## Setup and a Minimal Test

```typescript
import { TestScheduler } from "rxjs/testing";
import { map } from "rxjs";

describe("map pipeline", () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    // the callback is how marble expectations get asserted;
    // wire it to your test framework's deep-equal
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it("multiplies each value by ten", () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source$ = cold("-a-b-|", { a: 1, b: 2 });

      expectObservable(source$.pipe(map((x) => x * 10))).toBe("-a-b-|", {
        a: 10,
        b: 20,
      });
    });
  });
});
```

Inside `run()`, nothing is asynchronous: when the callback returns, the scheduler flushes all virtual time synchronously and the assertion callback fires for every expectation. Errors are marbles too: `cold("-a-#", { a: 1 }, new Error("boom"))` builds a stream that emits and then errors, and `.toBe("-a-#", values, error)` asserts it.

## The Frame Arithmetic

The one rule that prevents most confusion: **a value character consumes one virtual millisecond**. In `"a 250ms b"`, `a` emits at frame 0 and occupies 1ms, the shorthand advances 250ms, so `b` emits at frame 251, not 250.

Worked example with `debounceTime(300)` (this test executes green, like every example on this page):

```typescript
it("debounces to the settled value", () => {
  testScheduler.run(({ cold, expectObservable }) => {
    // a at 0; b at 251 (a consumed 1ms); source completes at 552
    const input$ = cold("a 250ms b 300ms |", { a: "ng", b: "ngrx" });

    // a's timer is cancelled by b; b settles at 251 + 300 = 551;
    // completion passes through at 552, right after the emission
    expectObservable(input$.pipe(debounceTime(300))).toBe("551ms b|", {
      b: "ngrx",
    });
  });
});
```

When a duration appears in several places, the `time` helper converts a marble into its number: `const t = time("--|")` is 2, so operators and expectations stay in sync if the timing changes.

## The Real Test: Debounced Search with Cancellation

The site's most-taught pipeline is `debounceTime` + `switchMap`. The claim that makes it interview gold is that `switchMap` **cancels the stale in-flight request**. A marble test can prove that claim, not just assert outputs, using `expectSubscriptions`:

```typescript
it("cancels the stale request when a new term settles", () => {
  testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
    // "ng" at 0, "ngrx" at 401, completion at 1401
    const input$ = cold("a 400ms b 999ms |", { a: "ng", b: "ngrx" });

    // each fake request takes 500ms
    const reqA = cold("500ms r|", { r: "ng results" });
    const reqB = cold("500ms r|", { r: "ngrx results" });

    const result$ = input$.pipe(
      debounceTime(300),
      switchMap((term) => (term === "ng" ? reqA : reqB)),
    );

    // only the second result arrives (1201 = 701 + 500);
    // the stream completes with the source at 1401
    expectObservable(result$).toBe("1201ms b 199ms |", { b: "ngrx results" });

    // the proof: reqA was subscribed when "ng" settled (300) and
    // UNSUBSCRIBED the moment "ngrx" settled (701), mid-flight
    expectSubscriptions(reqA.subscriptions).toBe("300ms ^ 400ms !");

    // reqB ran to completion (701 + 1 + 500 = 1202)
    expectSubscriptions(reqB.subscriptions).toBe("701ms ^ 500ms !");
  });
});
```

Walk the timeline: "ng" settles at 300 and its request starts. "ngrx" arrives at 401, settles at 701. `switchMap` unsubscribes `reqA` at 701, 100ms before its response would have landed, and subscribes `reqB`. That unsubscription marble is the cancellation guarantee made visible, and it is exactly what distinguishes this pipeline from plain value debouncing.

## Hot Sources and the Subscription Point

`hot()` marbles model streams that were already running before the test subscribed. The `^` marks the subscription moment; anything to its left is missed, which is the whole cold/hot distinction in one assertion:

```typescript
it("misses values emitted before subscription", () => {
  testScheduler.run(({ hot, expectObservable }) => {
    const source$ = hot("-a-^-b-|", { a: 1, b: 2 });

    // 'a' happened before we subscribed; only 'b' is observed
    expectObservable(source$).toBe("--b-|", { b: 2 });
  });
});
```

## Common Mistakes

**Off-by-one frame math.** Every value character consumes a millisecond, so `"a 250ms b"` puts `b` at 251. When an expectation fails by exactly one frame, this is almost always why. Let the failure output guide you: it prints actual versus expected frames.

**Testing time-based logic with real timers instead.** A `setTimeout`-and-wait test for a 300ms debounce is slow, and flaky under load. The virtual clock exists precisely so the same logic runs in microseconds with exact timing assertions.

**Doing real async inside `run()`.** Virtual time only controls scheduler-based time (`debounceTime`, `timer`, `delay`, `interval`). A real `Promise` or actual HTTP call resolves outside the virtual clock and breaks determinism; model collaborators as `cold()` marbles instead, as the search test does with its fake requests.

**Asserting only values, never subscriptions.** Output-only tests cannot distinguish `switchMap` from `mergeMap` when responses happen to arrive in order. `expectSubscriptions` pins the cancellation behavior itself.

## Interview Q&A

??? question "Why do marble tests run instantly even with a 30-second debounce?"

    Time-based operators never consult the wall clock directly; they ask their scheduler. `TestScheduler` substitutes a virtual clock and, inside `run()`, flushes all scheduled work synchronously, advancing virtual time frame by frame. A `debounceTime(30000)` is just "emit at virtual frame 30000", which is reached immediately.

??? question "What is the difference between cold() and hot() in a test?"

    `cold()` starts its marbles from the moment each subscriber arrives, modeling per-subscriber producers like HTTP. `hot()` runs on the test's global timeline and the `^` marks where the subscriber joins, modeling shared live sources; values left of `^` are missed. Choosing the wrong one silently changes what the test claims.

??? question "How would you prove switchMap cancels a stale request?"

    Model the requests as separate `cold()` observables and assert `expectSubscriptions(reqA.subscriptions)` with a `!` before the response frame. The unsubscription marble is the cancellation; asserting output alone cannot prove it.

??? question "What are the limits of marble testing?"

    It controls scheduler time only: real Promises, real network, `requestAnimationFrame` timing, and anything outside RxJS's schedulers are invisible to the virtual clock. Those seams get modeled as marble stand-ins, or the pipeline is restructured so the time-dependent core is testable in isolation.

## Related

- [Schedulers, observeOn & subscribeOn](schedulers.md), the concept that makes virtual time possible
- [debounceTime](../operators/filtering/debounceTime.md) and [switchMap](../operators/transformation/switchMap.md), the pipeline tested above
- [Cold Observables](cold-observables.md) and [Hot Observables](hot-observables.md), the distinction `cold()`/`hot()` encode
