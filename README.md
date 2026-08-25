# RxJS + Angular Interview Guide

An open-source interview preparation site for Angular developers. It covers RxJS fundamentals, 45 operators, Subjects and multicasting, Angular integration patterns, and a full interview prep section with question banks, scenarios, coding challenges, and cheat sheets.

**Read it here: [ankitsharma-007.github.io/rxjs-angular-interview-guide](https://ankitsharma-007.github.io/rxjs-angular-interview-guide/)**

## What's inside

| Section                     | What you get                                                                                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Learn**                   | An ordered path through the fundamentals: Observables, the Observable contract, subscriptions and teardown, cold vs hot, unicast vs multicast, promises vs Observables, schedulers                                                     |
| **Operators**               | 45 operator pages across creation, transformation, filtering, combination, error handling, and utility. Each follows the same template: at-a-glance summary, minimal example, real Angular example, common mistakes, and interview Q&A |
| **Subjects & Multicasting** | Subject, BehaviorSubject, ReplaySubject, AsyncSubject, share, and shareReplay, with a decision table for choosing between them                                                                                                         |
| **Angular + RxJS**          | Nine guides on the integration questions interviews actually probe: signals interop, HttpClient patterns, reactive forms, the router, interceptors and retries, caching, memory leaks, and anti-patterns                               |
| **Comparisons**             | Side-by-side pages for the classic questions: switchMap vs mergeMap vs concatMap vs exhaustMap, and the Subject family                                                                                                                 |
| **Interview Prep**          | 41 questions at junior, mid, and senior levels, 8 scenario walkthroughs, 8 coding challenges with hidden solutions, 14 common traps, an operator cheat sheet, and a 60-minute revision plan                                            |

## Who it's for

- Angular developers preparing for a technical interview, from first job to senior loops
- Engineers who want a structured refresher on reactive programming in Angular
- Interviewers sourcing questions, scenarios, and coding exercises

## Content principles

- **Evergreen.** No version numbers in content. Examples follow the current [angular.dev](https://angular.dev/) and [rxjs.dev](https://rxjs.dev/) documentation: standalone components, signals, `inject()`, built-in control flow, and `takeUntilDestroyed`.
- **Interview-first.** Every operator page answers the questions an interviewer asks about it, including the gotchas.
- **Verified.** Non-obvious runtime behavior (completion semantics, race settlement, buffer flushing) is tested against the actual library before it is documented.

## Run it locally

The site is built with [MkDocs](https://www.mkdocs.org/) and [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).

```bash
python3 -m venv venv
source venv/bin/activate
pip install mkdocs-material mkdocs-redirects
mkdocs serve
```

Then open `http://127.0.0.1:8000/`. Use `mkdocs build --strict` to run the same validation as CI.

Note for macOS and Windows: local builds write redirect stubs for old page URLs. On case-insensitive filesystems these can overwrite same-named pages in the local `site/` output. The deployed site builds on Linux and is unaffected.

## Contributing

Contributions are welcome: new operator pages, better examples, more interview questions, or fixes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the page templates, content conventions, and PR checklist.

## License

[MIT](LICENSE)
