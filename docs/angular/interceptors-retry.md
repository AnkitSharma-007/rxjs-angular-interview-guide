---
description: "Functional interceptors, retry strategies, and the three-layer error handling model."
tags:
  - Angular
---

# Interceptors, Retries & Error Strategy

HTTP interceptors are RxJS pipelines: an interceptor receives the request, calls `next(req)`, which returns the response **Observable**, and may transform that stream with any operator. That makes interceptors the natural home for cross-cutting resilience: retries, timeouts, error mapping, and auth.

!!! abstract "At a glance"

    - **Modern form:** functional `HttpInterceptorFn`, registered with `provideHttpClient(withInterceptors([...]))`
    - **Mental model:** each interceptor wraps the stream returned by the next one; operators piped there apply to the whole chain below
    - **Top gotcha:** interceptor order matters; a retry placed *before* the auth interceptor re-runs auth on every attempt, placed *after* it retries with the same (possibly expired) token

## A Resilience Interceptor

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { retry, throwError, timeout, timer } from "rxjs";

export const resilienceInterceptor: HttpInterceptorFn = (req, next) => {
  // only idempotent requests are safe to retry blindly
  const retryCount = req.method === "GET" ? 2 : 0;

  return next(req).pipe(
    timeout(10_000), // bound every attempt
    retry({
      count: retryCount,
      delay: (error: HttpErrorResponse, attempt) =>
        // transient failures only: network errors and 5xx
        error.status === 0 || error.status >= 500
          ? timer(500 * Math.pow(2, attempt - 1)) // 500ms, 1s backoff
          : throwError(() => error),
    }),
  );
};
```

```typescript
// app.config.ts
provideHttpClient(withInterceptors([authInterceptor, resilienceInterceptor]));
```

Registration order is execution order for requests, and the **reverse** for responses: here, `authInterceptor` stamps the token first, and because `resilienceInterceptor` is downstream, its retries re-enter only the part of the chain below itself. Swapping the order changes whether retried attempts get fresh auth handling, a favorite interview detail.

## An Error-Mapping Interceptor

Normalize transport errors once, so services and components deal with domain-shaped failures:

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { catchError, throwError } from "rxjs";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorMappingInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // log/report here (one place for the whole app)
      const message =
        error.status === 0
          ? "You appear to be offline."
          : (error.error?.message ?? "Something went wrong.");
      return throwError(() => new ApiError(error.status, message));
    }),
  );
```

Note it **rethrows**: interceptors should classify and enrich, not swallow. Deciding what the user sees is a UI-layer job.

## The Three-Layer Error Strategy

The question behind "where do I put catchError?" is really "which layer owns this failure?":

| Layer                    | Owns                                                                               | Typical tools                                                    |
| ------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Interceptor** (global) | Transport concerns: retries, timeouts, auth failures, logging, error normalization | `retry`, `timeout`, `catchError` + rethrow                       |
| **Service** (domain)     | Domain fallbacks: cached data, default values, "not found means empty"             | `catchError` returning a value                                   |
| **Component** (UI)       | What the user sees: error states, toasts, retry buttons                            | state mapping, [loading/error/success pattern](http-patterns.md) |

Errors flow upward through these layers, per the [Observable contract](../learn/observable-contract.md); each layer either resolves the failure into something meaningful for its consumers or enriches and rethrows.

## Common Mistakes

**Retrying non-idempotent requests.** A blind retry on `POST` can double-charge an order. Gate on method (as above) or on explicit opt-in via `HttpContext`.

**Swallowing errors globally.** An interceptor that `catchError`s into `of(null)` makes every service's type a lie and every failure silent. Interceptors normalize; they rarely resolve.

**One giant interceptor.** Auth, retries, logging, and mapping in one function is untestable. Compose several small `HttpInterceptorFn`s; the provider array documents the pipeline.

## Interview Q&A

??? question "How do interceptors relate to RxJS?"

    `next(req)` returns the response Observable, and the interceptor's return value is what upstream code subscribes to. Piping operators there (retry, timeout, catchError, tap) applies them to every request that passes through, which is why an interceptor is just a reusable operator chain for HTTP.

??? question "Sketch the 401 refresh-token flow with RxJS."

    In the auth interceptor's `catchError`, on 401: call the refresh endpoint, then `switchMap` back into a retried clone of the original request with the new token. Share the in-flight refresh (single `shareReplay(1)`-style stream or a Subject gate) so N concurrent 401s trigger **one** refresh, and fail out to logout if the refresh itself errors.

??? question "Where should retry logic live: interceptor, service, or component?"

    Transport-level transient failures (network blips, 5xx) belong in an interceptor, applied uniformly and gated on idempotency. Domain-specific retries (poll until a job exists) belong in the service. Components should not retry silently; they render a retry affordance.

## Related

- [retry](../operators/error-handling/retry.md) and [timeout](../operators/utility/timeout.md), the operators inside the pipeline
- [catchError](../operators/error-handling/catchError.md) for the mechanics of rethrow vs resolve
- [HttpClient Patterns](http-patterns.md) for the component-layer state handling
