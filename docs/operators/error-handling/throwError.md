---
description: "Create an Observable that immediately emits an error."
tags:
  - Operators
  - Error Handling
---

# throwError

`throwError()` creates an Observable that emits no values and immediately sends an **error notification** to any subscriber. It is how you hand a ready-made failure to code that expects an Observable.

!!! abstract "At a glance"

    - **Signature:** `throwError(() => error)`; always pass a **factory**, not a bare error instance
    - **Use when:** rethrowing transformed errors from `catchError`, failing fast in conditional branches, mocking failures in tests
    - **Avoid when:** you are inside an operator callback; a plain `throw` is equivalent there and simpler
    - **Top gotcha:** the deprecated `throwError(error)` form creates the error eagerly, capturing a stale stack and wasting work; the factory form creates it per subscription

## Minimal Example

```typescript
import { throwError } from "rxjs";

throwError(() => new Error("boom")).subscribe({
  next: () => console.log("never runs"),
  error: (err) => console.log("caught:", err.message),
});

// caught: boom
```

## Typical Usage in Angular

**1. Rethrowing a friendlier error from `catchError`:**

```typescript
import { HttpErrorResponse } from "@angular/common/http";
import { catchError, throwError } from "rxjs";

getUser(id: string) {
  return this.http.get<User>(`/api/users/${id}`).pipe(
    catchError((err: HttpErrorResponse) =>
      throwError(() =>
        new Error(err.status === 404 ? "User not found" : "Please try again later")
      )
    )
  );
}
```

**2. Failing fast inside a higher-order mapping:**

```typescript
switchMap((order) =>
  order.items.length > 0
    ? this.http.post("/api/orders", order)
    : throwError(() => new Error("Cannot submit an empty order")),
);
```

**3. Mocking a failing service in tests:**

```typescript
const apiMock = {
  load: () => throwError(() => new Error("simulated 500")),
};
```

## Common Mistakes

**Using the deprecated value form.** `throwError(new Error("x"))` constructs the error immediately, at pipeline-build time. The supported factory form, `throwError(() => new Error("x"))`, builds it per subscription with an accurate stack.

**Reaching for `throwError` inside operator callbacks.** Inside `map`, `switchMap`, or `tap`, a plain `throw new Error("x")` is caught by RxJS and converted to an error notification anyway. `throwError` is for positions that require returning an Observable, like `catchError` or a `switchMap` branch.

**Forgetting that an error terminates the stream.** Emitting `throwError` inside a long-lived pipeline (like `valueChanges` handling) kills the outer stream unless the error is confined to an inner Observable.

## Interview Q&A

??? question "Why does throwError take a factory function?"

    Two reasons: laziness (the error object, and any cost of building it, happens only if someone subscribes) and freshness (each subscription and each retry gets a new error with a current stack trace). The direct-value overload was deprecated for exactly these problems.

??? question "throw vs throwError inside a pipe: what is the difference?"

    Inside operator callbacks, none in outcome: RxJS wraps the callback, catches the `throw`, and delivers an error notification. `throwError` is needed where an **Observable value** is expected, such as the return of `catchError` or a conditional branch that maps to a stream.

??? question "What does throwError pair with in a retry pipeline?"

    It is the standard \"stop retrying\" escape hatch: from a `retry({ delay })` callback or a `retryWhen`-era notifier, returning `throwError(() => err)` aborts further attempts and propagates the error downstream.

## Related

- [catchError](catchError.md), where throwError handles the rethrow path
- [retry](retry.md), whose delay callback uses throwError to abort
- [EMPTY vs NEVER](../creation/empty-never.md) for the no-error termination constants
