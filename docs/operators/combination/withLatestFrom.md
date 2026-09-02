---
description: "Sample the latest value of other streams when the source emits."
tags:
  - Operators
  - Combination
---

# withLatestFrom

Think of `withLatestFrom()` as an operator that lets one stream (the "source") peek at the most recent value from one or more other streams whenever the source stream emits something.

- **Source Stream:** This is the main Observable you attach `withLatestFrom()` to.
- **Other Streams:** These are the Observables you pass _into_ `withLatestFrom()`.
- **How it works:** When the **source** stream emits a value, `withLatestFrom()` looks at the **other** streams and grabs their _latest_ emitted value. It then combines the value from the source stream and the latest values from the other streams into an array.
- **Important:** It only emits when the **source** stream emits. If the other streams emit values but the source stream hasn't emitted since, `withLatestFrom()` does nothing. Also, it won't emit anything until _all_ the provided streams (source and others) have emitted at least one value.

!!! abstract "At a glance"

    - **Signature:** `source$.pipe(withLatestFrom(other$, ...))`
    - **Use when:** an action needs a snapshot of other state at trigger time: a click plus the current form value
    - **Avoid when:** changes in any stream should produce output; that is `combineLatest`
    - **Top gotcha:** until every secondary stream has emitted once, source emissions are **dropped**, not buffered; give secondaries a `startWith`

## Real-World Example: Search with Filters

Imagine you have a search page for products. There's:

1.  A search input field where the user types their query.
2.  A dropdown menu to select a category filter (e.g., "Electronics", "Clothing", "Home Goods").

You want to make an API call to fetch products whenever the user types in the search box (after a little pause, using `debounceTime`), but you need _both_ the search term _and_ the currently selected category filter to make the correct API request.

- The search term changes frequently. This will be our **source** stream (after debouncing).
- The category filter changes less often, maybe only when the user explicitly selects a new option. This will be our **other** stream.

We want to trigger the search using the _latest_ filter value _at the moment_ the (debounced) search term is ready. `withLatestFrom()` is perfect for this.

## Minimal Example

```typescript
import { Subject, withLatestFrom } from "rxjs";

const saves$ = new Subject<string>(); // driver stream
const draft$ = new Subject<string>(); // secondary stream

saves$.pipe(withLatestFrom(draft$)).subscribe(console.log);

draft$.next("draft v1"); // nothing: only the SOURCE triggers output
draft$.next("draft v2");
saves$.next("save"); // ["save", "draft v2"]  <- latest draft attached
saves$.next("save"); // ["save", "draft v2"]
```

## Code Snippet

Let's see how this looks in an Angular component:

```typescript
import { Component, signal } from "@angular/core";
import { ReactiveFormsModule, FormControl } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  debounceTime,
  distinctUntilChanged,
  withLatestFrom,
  startWith,
} from "rxjs";

@Component({
  selector: "app-product-search",
  imports: [ReactiveFormsModule],
  template: `
    <div>
      <label for="search">Search:</label>
      <input id="search" type="text" [formControl]="searchTermControl" />
    </div>
    <div>
      <label for="category">Category:</label>
      <select id="category" [formControl]="categoryFilterControl">
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="home">Home Goods</option>
      </select>
    </div>

    @if (searchResults(); as results) {
      <div>
        Searching for: "{{ results.term }}" in category: "{{
          results.category
        }}"
      </div>
    }
  `,
})
export class ProductSearchComponent {
  // --- Form Controls ---
  protected readonly searchTermControl = new FormControl("", {
    nonNullable: true,
  });
  protected readonly categoryFilterControl = new FormControl("all", {
    nonNullable: true,
  });

  // --- Component State ---
  protected readonly searchResults = signal<{
    term: string;
    category: string;
  } | null>(null);

  constructor() {
    // --- Observables ---
    // Source: Search term, debounced
    const searchTerm$ = this.searchTermControl.valueChanges.pipe(
      debounceTime(400), // Wait for 400ms pause in typing
      distinctUntilChanged(), // Only emit if the value actually changed
    );

    // Other: Category filter (startWith so a value exists before the user touches it)
    const categoryFilter$ = this.categoryFilterControl.valueChanges.pipe(
      startWith(this.categoryFilterControl.value),
    );

    // --- Combining with withLatestFrom ---
    searchTerm$
      .pipe(
        withLatestFrom(categoryFilter$), // Combine search term with the LATEST category
        takeUntilDestroyed(), // constructor is an injection context
      )
      .subscribe(([term, category]) => {
        // Runs ONLY when searchTerm$ emits (after debounce),
        // with the latest category attached
        console.log(
          `API Call Needed: Search for "${term}" with filter "${category}"`,
        );

        // In a real app, you'd call your API service here:
        // this.productService.search(term, category).subscribe(...)

        this.searchResults.set({ term, category });
      });
  }
}
```

**Explanation of the Code:**

1.  **`searchTermControl` / `categoryFilterControl`:** We use Angular's `FormControl` to manage the input and select elements.
2.  **`searchTerm$`:** We get an Observable of the search term's changes using `valueChanges`. We apply:
    - `debounceTime(400)`: To wait until the user stops typing for 400ms before considering the term stable.
    - `distinctUntilChanged()`: To avoid triggering searches if the debounced term is the same as the last one.
3.  **`categoryFilter$`:** We get an Observable of the category changes using `valueChanges`, plus `startWith(control.value)` so the stream has a value before the user touches the dropdown. This seed is essential, and it belongs on the **secondary** stream: `withLatestFrom` silently drops source emissions until every secondary has produced at least one value, so without it, early searches would vanish.
4.  **`withLatestFrom(categoryFilter$)`:** We pipe the `searchTerm$` (our source). When `searchTerm$` emits a value (after debouncing), `withLatestFrom` looks at `categoryFilter$` and gets its _most recently emitted value_.
5.  **`subscribe(([term, category]) => ...)`:** The result is an array `[sourceValue, latestOtherValue]`. We destructure this into `term` and `category`. This callback function is executed _only_ when the debounced search term changes. Inside, we have exactly what we need: the current search term and the _latest_ selected category at that moment.
6.  **`takeUntilDestroyed()`:** This is the modern Angular way to handle unsubscriptions. Called with no arguments here because the constructor is an injection context; when the `ProductSearchComponent` is destroyed, this operator automatically completes the Observable stream, preventing memory leaks without manual cleanup.

So, `withLatestFrom()` is incredibly useful when an action (like searching) depends on the latest state of other configuration or filter inputs at the exact moment the action is triggered.

## Common Mistakes

**No initial value on the secondary stream.** Until every secondary has emitted once, source emissions are silently dropped. A `valueChanges` the user has not touched emits nothing, so give it `startWith(control.value)`, as in the example.

**Importing `takeUntilDestroyed` from `rxjs`.** It lives in `@angular/core/rxjs-interop`. The wrong import compiles in some editors' eyes but fails at build time, a surprisingly common copy-paste slip.

**Expecting secondary changes to trigger a search.** Changing the category alone produces nothing here; only the source emits output. If both inputs should trigger, the operator you want is `combineLatest`.

## Interview Q&A

??? question "withLatestFrom vs combineLatest: how do you choose?"

    Ask which streams should cause output. One driver stream with the others as passive context: `withLatestFrom`. Every stream an equal trigger: `combineLatest`. In UI terms: "search when the user types, using the current filter" vs "search when either the text or the filter changes".

??? question "What happens to source values emitted before the secondaries have values?"

    They are discarded, not queued. `withLatestFrom` cannot emit a partial tuple, and it does not retroactively emit when the secondary finally produces a value. That is why `startWith` (or `BehaviorSubject` secondaries) matter.

??? question "Where does withLatestFrom shine in NgRx-style architectures?"

    In effects: an action stream is the driver, and `withLatestFrom(store.select(...))` snapshots current state at the moment the action fires, without state changes triggering the effect.

## Related

- [combineLatest](combineLatest.md) when any input should trigger emission
- [debounceTime](../filtering/debounceTime.md) and [distinctUntilChanged](../filtering/distinctUntilChanged.md), the usual source-side companions
- [zip](zip.md) for index-based pairing
