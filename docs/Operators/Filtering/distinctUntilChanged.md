# distinctUntilChanged

`distinctUntilChanged()` is a straightforward yet very useful **filtering operator**. Its purpose is to prevent consecutive duplicate values from passing through an Observable stream.

It works by remembering the most recent value it emitted. When a new value arrives from the source, `distinctUntilChanged()` compares this new value with the previously emitted value:

- If the new value is **different** from the previous one, it allows the new value to pass through and remembers it as the new "previous" value.
- If the new value is **the same** as the previous one, it filters out (discards) the new value.

By default, it uses strict equality (`===`) for comparison. You can optionally provide your own comparison function if you need custom logic (e.g., comparing specific properties of objects). The very first value emitted by the source always passes through, as there's nothing previous to compare it against.

## Key Characteristics

- **Filters Consecutive Duplicates:** Only emits a value if it's different from the immediately preceding emission.
- **Comparison:** Uses `===` by default; accepts an optional custom comparator function.
- **Stateful:** It needs to keep track of the last emitted value.
- **Passes First Value:** The first emission always gets through.
- **Passes Errors/Completion:** Doesn't interfere with error or completion notifications.

## Real-World Example: Optimizing User Input Handling

Imagine you're building a feature with a search input field. As the user types, you want to react to their input, perhaps by making an API call to fetch search results.

Now, input events can sometimes fire frequently, even if the actual text value hasn't changed (e.g., related to focus events or specific key presses that don't alter the text). Furthermore, if you use `debounceTime` to wait for pauses in typing, the user might pause, resume typing the _same characters_, and pause again, potentially emitting the same search term multiple times consecutively after debouncing.

If fetching search results is an expensive operation (network request, database query), you absolutely want to avoid making redundant requests for the exact same search term back-to-back. `distinctUntilChanged()` is the perfect tool here. By placing it in your Observable pipe _after_ you've extracted the input value (and often after `debounceTime`), you ensure that your API call logic only executes when the search term the user has settled on _actually changes_ from the previous term you searched for.

## Code Snippet

```typescript
import { Component, OnInit, OnDestroy } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { map, debounceTime, distinctUntilChanged, tap } from "rxjs/operators";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-distinct-search-reactive",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h4>Distinct Search Input Demo (Reactive Forms)</h4>
    <p>Time: {{ currentTime }}</p>
    <p>
      Uses FormControl.valueChanges. Filters out consecutive duplicate search
      terms after debounce. Check console.
    </p>
    <input
      [formControl]="searchInputControl"
      type="text"
      class="form-control"
      placeholder="Type here..."
    />
    <div class="mt-2">
      <h6>Search triggered for:</h6>
      <ul class="list-group">
        <li *ngFor="let term of searchLog" class="list-group-item small">
          {{ term }}
        </li>
      </ul>
    </div>
  `,
})
export class DistinctSearchReactiveComponent implements OnInit, OnDestroy {
  searchInputControl = new FormControl("");
  searchLog: string[] = [];
  currentTime: string = new Date().toLocaleTimeString();
  private inputSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.inputSubscription = this.searchInputControl.valueChanges
      .pipe(
        tap((value) => {
          this.currentTime = new Date().toLocaleTimeString();
          console.log(`[${this.currentTime}] Raw valueChange: "${value}"`);
        }),
        debounceTime(400),
        map((value) => (typeof value === "string" ? value.trim() : "")),
        tap((value) => {
          this.currentTime = new Date().toLocaleTimeString();
          console.log(`  [${this.currentTime}] Debounced: "${value}"`);
        }),
        distinctUntilChanged(),
        tap((value) => {
          this.currentTime = new Date().toLocaleTimeString();
          console.log(
            `    [${this.currentTime}] Distinct: "${value}" -> Triggering Search!`
          );
        })
      )
      .subscribe({
        next: (searchTerm) => {
          const termStr = searchTerm ?? "";
          this.searchLog.push(
            `[${new Date().toLocaleTimeString()}] "${termStr}"`
          );
          if (this.searchLog.length > 10) this.searchLog.shift();
          // API call placeholder
        },
        error: (err) => console.error("Input stream error:", err),
      });
  }

  ngOnDestroy(): void {
    this.inputSubscription?.unsubscribe();
    console.log("Search input subscription stopped.");
  }
}
```

## Explanation

1.  **`fromEvent(..., 'input')`**: Creates a stream of input events.
2.  **`map(...)`**: Extracts the text value from each event.
3.  **`debounceTime(400)`**: Waits for a 400ms pause in typing before passing the latest value. This helps prevent excessive processing during rapid typing.
4.  **`distinctUntilChanged()`**: This is the crucial step. It receives the debounced value. It compares this value to the _last value that it allowed through_. If the current debounced value is identical to the previous one (e.g., user paused, typed the same letter again, paused), `distinctUntilChanged` filters it out. Only if the debounced value has actually changed since the last emission will it pass through.
5.  **`tap(...)` after distinctUntilChanged**: The logging here only happens for values that are truly distinct _after_ debouncing.
6.  **`subscribe({...})`**: The `next` handler, which would typically trigger the expensive search operation, is only called when `distinctUntilChanged` allows a value through, thus avoiding redundant searches for the same term.

## Summary

`distinctUntilChanged()` is a simple but powerful operator for optimizing streams by ensuring that downstream operations only occur when a value _actually changes_ compared to its immediate predecessor, filtering out consecutive duplicates.
