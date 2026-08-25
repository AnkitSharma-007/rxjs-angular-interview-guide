---
description: "Drop consecutive duplicate values."
tags:
  - Operators
  - Filtering
---

# distinctUntilChanged

`distinctUntilChanged()` is a straightforward yet very useful **filtering operator**. Its purpose is to prevent consecutive duplicate values from passing through an Observable stream.

It works by remembering the most recent value it emitted. When a new value arrives from the source, `distinctUntilChanged()` compares this new value with the previously emitted value:

- If the new value is **different** from the previous one, it allows the new value to pass through and remembers it as the new "previous" value.
- If the new value is **the same** as the previous one, it filters out (discards) the new value.

By default, it uses strict equality (`===`) for comparison. You can optionally provide your own comparison function if you need custom logic (e.g., comparing specific properties of objects). The very first value emitted by the source always passes through, as there's nothing previous to compare it against.

!!! abstract "At a glance"

    - **Signature:** `distinctUntilChanged(comparator?)` or `distinctUntilChanged(comparator, keySelector)`
    - **Use when:** downstream work should run only when a value actually changes: form values, state selectors
    - **Avoid when:** you need global uniqueness across the whole stream (that is `distinct`)
    - **Top gotcha:** the default check is `===`; two objects with identical content are still "different"

## Key Characteristics

- **Filters Consecutive Duplicates:** Only emits a value if it's different from the immediately preceding emission.
- **Comparison:** Uses `===` by default; accepts an optional custom comparator function.
- **Stateful:** It needs to keep track of the last emitted value.
- **Passes First Value:** The first emission always gets through.
- **Passes Errors/Completion:** Doesn't interfere with error or completion notifications.

## Minimal Example

```typescript
import { from, distinctUntilChanged } from "rxjs";

from([1, 1, 2, 2, 2, 1, 3]).pipe(distinctUntilChanged()).subscribe(console.log);

// 1, 2, 1, 3
// only CONSECUTIVE duplicates are dropped: the second run of 1 still passes
```

## Real-World Example: Optimizing User Input Handling

Imagine you're building a feature with a search input field. As the user types, you want to react to their input, perhaps by making an API call to fetch search results.

Now, input events can sometimes fire frequently, even if the actual text value hasn't changed (e.g., related to focus events or specific key presses that don't alter the text). Furthermore, if you use `debounceTime` to wait for pauses in typing, the user might pause, resume typing the _same characters_, and pause again, potentially emitting the same search term multiple times consecutively after debouncing.

If fetching search results is an expensive operation (network request, database query), you absolutely want to avoid making redundant requests for the exact same search term back-to-back. `distinctUntilChanged()` is the perfect tool here. By placing it in your Observable pipe _after_ you've extracted the input value (and often after `debounceTime`), you ensure that your API call logic only executes when the search term the user has settled on _actually changes_ from the previous term you searched for.

## Code Snippet

```typescript
import { Component, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged, map } from "rxjs";

@Component({
  selector: "app-distinct-search",
  imports: [ReactiveFormsModule],
  template: `
    <input
      [formControl]="searchControl"
      type="text"
      placeholder="Type here..."
    />
    <h6>Search triggered for:</h6>
    <ul>
      @for (term of searchLog(); track $index) {
        <li>{{ term }}</li>
      }
    </ul>
  `,
})
export class DistinctSearchComponent {
  protected readonly searchControl = new FormControl("", {
    nonNullable: true,
  });
  protected readonly searchLog = signal<string[]>([]);

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(400),
        map((value) => value.trim()),
        distinctUntilChanged(), // same settled term twice -> only one search
        takeUntilDestroyed(),
      )
      .subscribe((term) => {
        this.searchLog.update((log) => [...log.slice(-9), term]);
        // trigger the actual search here
      });
  }
}
```

## Explanation

1.  **`valueChanges`**: Emits the control's value on every keystroke.
2.  **`debounceTime(400)`**: Waits for a 400ms pause in typing before passing the latest value.
3.  **`map(...)`**: Trims whitespace so " cat" and "cat" compare as equal.
4.  **`distinctUntilChanged()`**: Compares the settled value with the last one it let through. If the user pauses, types, then deletes back to the same term, the duplicate is filtered out and no redundant search fires.
5.  **`takeUntilDestroyed()`**: Ends the subscription with the component.

## Common Mistakes

**Comparing objects by reference.** `{ id: 1 } !== { id: 1 }`, so an object stream is never filtered by the default check. Provide a comparator, `distinctUntilChanged((a, b) => a.id === b.id)`, or use `distinctUntilKeyChanged("id")`.

**Expecting global de-duplication.** Only consecutive repeats are dropped; `1, 2, 1` passes through untouched. Removing all duplicates ever seen is `distinct`, which also means unbounded memory for the seen-set.

**Placing it before `debounceTime`.** Before the debounce it compares raw keystrokes, which almost always differ. After the debounce it compares settled values, which is what prevents redundant requests.

## Interview Q&A

??? question "Why does distinctUntilChanged not filter my stream of objects?"

    Because the default comparison is `===`, which compares references. Each new object literal is a new reference. Fix it with a custom comparator or a key selector so comparison happens on content.

??? question "What is the difference between distinct and distinctUntilChanged?"

    `distinctUntilChanged` remembers only the previous emission and drops consecutive repeats. `distinct` remembers every value ever emitted and drops any repeat, at the cost of a growing internal set. For change detection on streams, `distinctUntilChanged` is almost always what you want.

??? question "Where does distinctUntilChanged belong in a typeahead pipeline?"

    After `debounceTime` and any normalization (`map` to trim/lowercase), and before the request operator (`switchMap`). That order means you compare final, normalized terms and skip duplicate requests.

## Related

- [debounceTime](debounceTime.md), its usual upstream partner
- [filter](filter.md) for predicate-based filtering
- [switchMap](../transformation/switchMap.md), the typical next step in search pipelines

## Summary

`distinctUntilChanged()` is a simple but powerful operator for optimizing streams by ensuring that downstream operations only occur when a value _actually changes_ compared to its immediate predecessor, filtering out consecutive duplicates.
