summary: |
  Implement the expense list view (ET-STORY-009): each expense shows date, amount, category,
  and description; only the current user's expenses are shown, most-recent-date first; an
  empty state with a call-to-action replaces the list when there are no expenses; results are
  paginated with fixed page size and navigation controls; and the list is exposed via semantic
  table markup with ARIA labelling for screen readers. There is currently no user concept
  anywhere in the codebase (no auth, no `userId` on `Expense`, single global `"expenses"`
  localStorage key), so a minimal stub current-user seam is introduced to make AC 2
  implementable without building an auth system.

scope:
  - description: |
      Add a `userId` field to the `Expense` domain type and introduce a minimal current-user
      stub so expenses can be attributed to a user.

      Before:
      ```ts
      export interface Expense {
        id: string;
        amount: number;
        date: string;
        category: Category;
        notes?: string;
        createdAt: number;
      }
      ```
      After:
      ```ts
      export interface Expense {
        id: string;
        userId: string;
        amount: number;
        date: string;
        category: Category;
        notes?: string;
        createdAt: number;
      }
      ```

      New file `src/domain/currentUser.ts`:
      ```ts
      const CURRENT_USER_ID = "local-user";

      export function getCurrentUserId(): string {
        return CURRENT_USER_ID;
      }
      ```
    files:
      - src/domain/expense.ts
      - src/domain/currentUser.ts
    rationale: |
      AC 2 requires filtering the list to "the current user"'s expenses, but no user/auth
      concept exists in the codebase. A fixed-id stub is the smallest seam that makes
      filtering meaningful today and is trivially swappable for a real auth story later.

  - description: |
      Change `expenseRepository` to filter by user on read, stamp `userId` on write, and sort
      by expense date descending (not insertion order) so AC 2 and AC 3 are both satisfied.

      Before:
      ```ts
      export function loadExpenses(): Expense[] { ... }
      export function saveExpense(expense: Expense): Expense[] { ... }
      ```
      After:
      ```ts
      export function loadExpenses(userId: string): Expense[] {
        const all = loadAll(); // existing raw-parse logic, renamed/kept private
        return all
          .filter((expense) => expense.userId === userId)
          .sort((a, b) => b.date.localeCompare(a.date));
      }

      export function saveExpense(expense: Expense): Expense[] {
        const expenses = [expense, ...loadAll()];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        return expenses;
      }
      ```
    files:
      - src/domain/expenseRepository.ts
      - src/domain/expenseRepository.test.ts
    rationale: |
      Storage stays insertion-ordered (so the existing "prepends new expenses" test keeps its
      meaning), while `loadExpenses` sorts by `date` descending on read to satisfy AC 3, and
      filters by `userId` to satisfy AC 2. Keeping this logic in the repository (not the
      component) matches the existing pattern where `ExpenseList` is purely presentational and
      renders `expenses` in the order given (see current `ExpenseList.test.tsx`, "renders
      expenses in the given order").

  - description: |
      Update `App.tsx` and `AddExpenseForm.tsx` call sites for the new signatures, and update
      all three `makeExpense` test factories to include `userId`.
    files:
      - src/App.tsx
      - src/components/AddExpenseForm.tsx
      - src/App.test.tsx
      - src/components/AddExpenseForm.test.tsx
      - src/domain/expenseRepository.test.ts
      - src/components/ExpenseList.test.tsx
    rationale: |
      `Expense.userId` becomes required and `loadExpenses` takes a `userId` argument, so every
      existing call site (`App.tsx:8` `useState(() => loadExpenses())`, `App.tsx:13`
      `setExpenses(loadExpenses())`, `AddExpenseForm.tsx:43-50` `saveExpense({...})`) and every
      `makeExpense` factory across the three existing test files must be updated or they fail
      to compile/pass.

  - description: |
      Rewrite `ExpenseList` to render a semantic `<table>` (caption + `<th scope="col">` column
      headers) showing date, amount, category, and description for every row, replace the plain
      "No expenses recorded yet." text with an empty-state message plus a call-to-action button/
      link to add an expense, and add fixed-size pagination (page-size constant, Prev/Next
      controls with `aria-label`s, current page state).

      New/changed signature:
      ```ts
      interface ExpenseListProps {
        expenses: Expense[];
        onAddExpenseClick?: () => void;
      }
      const PAGE_SIZE = 10;
      export function ExpenseList({ expenses, onAddExpenseClick }: ExpenseListProps) { ... }
      ```
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
    rationale: |
      AC 1 requires all four fields displayed per row (description was previously optional and
      only conditionally rendered); AC 4/5 require an empty state with a CTA instead of the
      list; AC 6-8 require fixed-page pagination and visible navigation controls; AC 9 requires
      table semantics with ARIA-exposed headers/cells. Choosing `<table>` (not `<ul>`) is the
      more direct fit for AC 9's "semantic table or list markup" because AC 1 already implies
      a fixed set of labeled columns per entry.

tests:
  - |
    AC1 - each row shows date, amount, category, description (src/components/ExpenseList.test.tsx):
    ```ts
    it("displays date, amount, category, and description for each expense", () => {
      render(<ExpenseList expenses={[makeExpense({ date: "2026-01-01", amount: 12.5, category: "Food", notes: "Lunch" })]} />);
      const row = screen.getAllByRole("row")[1]; // [0] is header row
      expect(row).toHaveTextContent("2026-01-01");
      expect(row).toHaveTextContent("12.50");
      expect(row).toHaveTextContent("Food");
      expect(row).toHaveTextContent("Lunch");
    });
    ```
    Minimal code: render `<table>` with `<thead>` column headers (Date/Amount/Category/Description)
    and one `<tr>` per expense with four `<td>`s, always rendering description (empty string if absent).
  - |
    AC2 - only current user's expenses are loaded (src/domain/expenseRepository.test.ts):
    ```ts
    it("only returns expenses belonging to the given user", () => {
      saveExpense(makeExpense({ id: "1", userId: "user-a" }));
      saveExpense(makeExpense({ id: "2", userId: "user-b" }));
      expect(loadExpenses("user-a").map((e) => e.id)).toEqual(["1"]);
    });
    ```
    Minimal code: `loadExpenses(userId)` filters the parsed array by `expense.userId === userId`.
  - |
    AC3 - most recent expense date first (src/domain/expenseRepository.test.ts):
    ```ts
    it("orders expenses by date descending regardless of save order", () => {
      saveExpense(makeExpense({ id: "old", date: "2026-01-01", userId: "u" }));
      saveExpense(makeExpense({ id: "new", date: "2026-03-01", userId: "u" }));
      expect(loadExpenses("u").map((e) => e.id)).toEqual(["new", "old"]);
    });
    ```
    Minimal code: sort by `date` descending (string `localeCompare`, ISO `YYYY-MM-DD` sorts correctly) after filtering.
  - |
    AC4 - empty state instead of a list (src/components/ExpenseList.test.tsx):
    ```ts
    it("shows an empty-state message and no table when there are no expenses", () => {
      render(<ExpenseList expenses={[]} />);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
    });
    ```
    Minimal code: when `expenses.length === 0`, return the empty-state block instead of the table.
  - |
    AC5 - call-to-action to add an expense in the empty state (src/components/ExpenseList.test.tsx):
    ```ts
    it("shows a call-to-action to add a new expense when the list is empty", () => {
      const onAddExpenseClick = vi.fn();
      render(<ExpenseList expenses={[]} onAddExpenseClick={onAddExpenseClick} />);
      const cta = screen.getByRole("button", { name: /add.*expense/i });
      fireEvent.click(cta);
      expect(onAddExpenseClick).toHaveBeenCalled();
    });
    ```
    Minimal code: render a `<button>` calling `onAddExpenseClick` inside the empty-state block.
  - |
    AC6 - only a fixed-size page of expenses shown first (src/components/ExpenseList.test.tsx):
    ```ts
    it("shows only the first page of expenses when there are more than fit on one page", () => {
      const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i), date: `2026-01-${String(i + 1).padStart(2, "0")}` }));
      render(<ExpenseList expenses={many} />);
      expect(screen.getAllByRole("row")).toHaveLength(11); // header + 10 data rows (PAGE_SIZE=10)
    });
    ```
    Minimal code: `const pageItems = expenses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)`.
  - |
    AC7 - page navigation controls displayed when more than one page (src/components/ExpenseList.test.tsx):
    ```ts
    it("shows page navigation controls when there is more than one page", () => {
      const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
      render(<ExpenseList expenses={many} />);
      expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
    });
    ```
    Minimal code: render Prev/Next buttons (disabled appropriately) only when `expenses.length > PAGE_SIZE`.
  - |
    AC8 - navigating to page two shows the remaining expenses (src/components/ExpenseList.test.tsx):
    ```ts
    it("shows the remaining expenses on page two after navigating", async () => {
      const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i), notes: `note-${i}` }));
      render(<ExpenseList expenses={many} />);
      await userEvent.click(screen.getByRole("button", { name: /next page/i }));
      expect(screen.getByText("note-11")).toBeInTheDocument();
      expect(screen.queryByText("note-0")).not.toBeInTheDocument();
    });
    ```
    Minimal code: `page` state incremented by the Next button, re-slicing `expenses`.
  - |
    AC9 - semantic table markup with ARIA-exposed headers (src/components/ExpenseList.test.tsx):
    ```ts
    it("exposes the expense list as a table with labeled columns", () => {
      render(<ExpenseList expenses={[makeExpense()]} />);
      expect(screen.getByRole("table", { name: /expenses/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /date/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /amount/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /category/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /description/i })).toBeInTheDocument();
    });
    ```
    Minimal code: `<table aria-label="Expenses">` (or `<caption>`) with `<th scope="col">` for each column.

assumptions_or_open_questions:
  - |
    I assumed a stub current-user id (`getCurrentUserId()` in `src/domain/currentUser.ts`
    returning a fixed constant) rather than building any authentication, since no auth/user
    concept exists anywhere in the codebase today. This is a seam for a future auth story, not
    an auth implementation — reverse/replace it if ET has an upstream auth story that already
    defines how the current user is determined.
  - |
    I chose `<table>` markup (not `<ul>`) for AC 9 since AC 1 already implies a fixed set of
    labeled columns per row; the AC's "table or list" wording permits either.
  - |
    I assumed a fixed page size of 10 expenses per page since the story does not specify a
    number; this is a plain constant (`PAGE_SIZE`), easy to change later.
  - |
    I assumed sorting by the `date` field (ISO `YYYY-MM-DD` string) descending via
    `localeCompare` is sufficient for AC 3, since dates are stored as plain ISO strings
    (`src/domain/expense.ts`) and always compare correctly lexicographically.
  - |
    I assumed the "call-to-action" in AC 5 is a button whose click is delegated to the parent
    (`onAddExpenseClick` prop) rather than the list owning navigation/scroll-to-form logic,
    since `App.tsx` already owns the `AddExpenseForm` above the list.

package_dependencies: []

notes: |
  This plan touches the domain layer (`expense.ts`, `expenseRepository.ts`, new
  `currentUser.ts`) and the component layer (`ExpenseList.tsx`, `App.tsx`,
  `AddExpenseForm.tsx`), so a flowchart is included below.

  ```mermaid
  flowchart TD
    App["App.tsx"]:::touched
    ExpenseList["ExpenseList.tsx"]:::touched
    AddExpenseForm["AddExpenseForm.tsx"]:::touched
    Repo["expenseRepository.ts"]:::touched
    CurrentUser["currentUser.ts (new)"]:::touched
    ExpenseType["expense.ts (Expense.userId added)"]:::touched

    App -->|"renders list, passes loadExpenses(userId) result"| ExpenseList
    App -->|"loadExpenses(getCurrentUserId())"| Repo
    AddExpenseForm -->|"saveExpense() stamps userId"| Repo
    Repo -->|"reads getCurrentUserId()"| CurrentUser
    Repo -->|"filters/sorts Expense[]"| ExpenseType
    AddExpenseForm -->|"builds Expense with userId"| ExpenseType

    classDef touched fill:#f96,color:#000
  ```

  Existing tests that must be updated as part of this work (not new tests, but required for
  the suite to keep passing): `src/domain/expenseRepository.test.ts` (`makeExpense` needs
  `userId`; `loadExpenses()` calls need a `userId` argument), `src/components/ExpenseList.test.tsx`
  (`makeExpense` needs `userId`; the existing "renders expenses in the given order" and
  "displays notes" assertions need to target table rows/cells instead of `listitem`/plain text
  nodes), and `src/App.test.tsx` (`makeExpense`/call sites, if present).
