# Contributing

Thanks for helping improve the guide. This page covers how to set up locally, the content rules every page follows, the templates for new pages, and the checklist your PR runs against.

## Local setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install mkdocs-material mkdocs-redirects
mkdocs serve
```

`mkdocs serve` gives you live reload at `http://127.0.0.1:8000/`. Before opening a PR, run the same check as CI:

```bash
mkdocs build --strict
```

The build must finish with no warnings. Broken links, missing nav entries, and bad anchors all fail strict mode.

## Content rules

These apply to every page. PRs that break them will be asked to change.

1. **Evergreen content.** Never mention RxJS or Angular version numbers. Write against the current [angular.dev](https://angular.dev/) and [rxjs.dev](https://rxjs.dev/) documentation and re-verify facts when you touch a page.
2. **Modern Angular only.** Standalone components (no `standalone: true` flag, it is the default), `inject()` over constructor injection, signals for component state, built-in control flow (`@if`, `@for`, `@switch`), `takeUntilDestroyed` or `toSignal` for cleanup. No `NgModule`, no `CommonModule`, no `*ngIf`/`*ngFor`.
3. **Single rxjs import.** `import { map, switchMap } from "rxjs"`. Never `rxjs/operators`.
4. **Verify runtime claims.** If you state non-obvious behavior (what happens at completion, on error, with an empty source), test it against the actual library first and make the example output match.
5. **Front matter on every page.** A unique `description` under 160 characters and at least one tag from the taxonomy: `Fundamentals`, `Operators` plus a category tag (`Creation`, `Transformation`, `Filtering`, `Combination`, `Error Handling`, `Utility`), `Subjects`, `Multicasting`, `Angular`, `Comparisons`, `Interview Prep`.
6. **Exactly one H1 per page**, and no skipped heading levels (H2 to H4, for example). Headings inside list items count too.
7. **Plain writing.** Short paragraphs, active voice, no filler. Explain the why, not just the what.

## Page templates

### Operator page

New operator pages go in the matching `docs/operators/<category>/` folder and follow this structure:

```markdown
---
description: "One sentence: what it does and when you reach for it."
tags:
  - Operators
  - <Category>
---

# operatorName

One-paragraph plain-language explanation.

!!! abstract "At a glance"

    - **Signature:** `operatorName(args)`
    - **Use when:** the one-line decision rule
    - **Avoid when:** the counter-case, with the operator to use instead
    - **Top gotcha:** the mistake most people make first

## How it works <!-- optional: for operators with non-obvious mechanics -->

## Minimal Example

A short runnable snippet with expected output in comments.

## Angular Example: <Realistic Scenario>

A complete component or service showing the operator solving a real problem,
followed by a "How it works" explanation.

## Common Mistakes

Two to four bolded mistake patterns, each with the fix.

## Interview Q&A

??? question "The question an interviewer would ask?"

    The strong answer.

## Related

- Links to sibling operators and relevant guides.
```

Register the page in `mkdocs.yml` under the right category and add a line to `docs/operators/index.md`.

### Interview question

Questions live in `docs/interview-prep/questions-<level>.md` and use this shape:

```markdown
??? question "The question, phrased the way interviewers phrase it?"

    The core answer in two to four sentences.

    **Strong answers also mention:** the detail that separates good from great.

    **Follow-up:** the natural next question. Deep dive: [page](../path/page.md).
```

### Angular guide or fundamentals page

Same front matter rules. Structure is freer, but keep the pattern: concept first, realistic code second, common mistakes, then Q&A. Look at `docs/angular/http-patterns.md` or `docs/learn/subscription.md` for reference.

## Moving or renaming pages

Never break a published URL. If you move a page, add its old path to the `redirects` plugin map in `mkdocs.yml` in the same PR.

## PR checklist

- [ ] `mkdocs build --strict` passes with no warnings
- [ ] New or changed Angular samples verified in a scratch project or against angular.dev
- [ ] Runtime behavior claims tested against the actual library
- [ ] Front matter: unique description, correct tags
- [ ] One H1, no skipped heading levels
- [ ] No version numbers, no deprecated APIs (`toPromise`, `retryWhen` without the deprecation note, multi-callback `subscribe`)
- [ ] Moved pages have redirect entries
- [ ] Nav (`mkdocs.yml`) and the relevant section index updated

CI runs the strict build and a link check on every PR to `main`.
