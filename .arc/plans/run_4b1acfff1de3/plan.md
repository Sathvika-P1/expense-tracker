summary: |
  Make the expense list (src/components/ExpenseList.tsx) responsive per the approved
  prototype at .arc/designs/ET-STORY-020-design.html: a table layout on wide containers
  and a stacked-card layout on narrow ones, toggled via a CSS container query rather than
  a media query (the prototype's own comment explains this choice was made so the reviewer
  harness's simulated device frames reflow independently of the real browser window; at
  app level the same container-query breakpoint tracks the real viewport width because the
  list's nearest sized ancestor is the viewport). This requires three things the codebase
  is currently missing: (1) a viewport meta tag in index.html, without which mobile
  browsers lay out at ~980px and AC1/AC4 are unachievable regardless of CSS; (2) wiring
  the already-authored but currently-unimported design tokens (src/design-system/tokens.css)
  and utility classes (src/design-system/prototype-utils.css) into the app entry point;
  and (3) a new ExpenseList.css that ports the prototype's table/card/pagination rules and
  its @container breakpoint onto the real component markup. Two existing ExpenseList.test.tsx
  assertions must be scoped to the table because rendering both representations
  (table hidden via CSS, cards hidden via CSS) makes jsdom, which does not apply CSS, see
  duplicate text nodes.
scope:
  - description: |
      Add a viewport meta tag to the document head so mobile browsers use the actual
      device width as the layout viewport instead of the ~980px desktop-emulation default.
      Matches the design prototype's own <head>, which has:
      `<meta name="viewport" content="width=device-width, initial-scale=1" />`
    files:
      - index.html
    rationale: |
      Without this tag, AC1 (no horizontal scroll at 320px) and AC4 (readable without zoom
      on a mobile touchscreen) are unachievable no matter what responsive CSS is written,
      because the browser would render a virtual 980px-wide page and scale it down.
  - description: |
      Import the design system stylesheets at the app entry point so the tokens (colors,
      spacing, radii, font sizes/families) and utility/component classes (.btn, .btn-primary,
      .btn-secondary, .chip, .input, heading styles) referenced by the new ExpenseList.css
      actually take effect. Add to src/main.tsx:
      `import "./design-system/tokens.css";`
      `import "./design-system/prototype-utils.css";`
    files:
      - src/main.tsx
    rationale: |
      Confirmed by reading src/main.tsx, src/App.tsx and index.html that neither tokens.css
      nor prototype-utils.css is imported anywhere today, so every CSS variable and utility
      class the design depends on is currently inert.
  - description: |
      Create src/components/ExpenseList.css porting the prototype's responsive rules
      (design HTML lines ~318-406) onto the real component's class names:
      - `.expense-list` wrapper: `container-type: inline-size; container-name: expense-list; min-width: 0;`
        (this replaces the prototype's `.device-frame`/`.app-shell`, which were reviewer-harness
        scaffolding for showing multiple simulated widths side by side, not app markup — the
        real component's own wrapper is what establishes the container).
      - `.expense-table` (table-layout: fixed, width: 100%, colgroup widths 18/16/20/46%,
        `overflow-wrap: anywhere` on td/th) for the wide/table view.
      - `.expense-cards` / `.expense-card` / `.expense-card-row1` / `.expense-card-amount` /
        `.expense-card-date` / `.expense-card-notes` for the narrow/card view, hidden by
        default (`.expense-cards { display: none; }`).
      - The reflow breakpoint, copied verbatim from the prototype (design HTML line 383):
        `@container expense-list (max-width: 559px) { .expense-table { display: none; } .expense-cards { display: block; } }`
      - `.pagination` nav styled per the prototype (flex, centered, wrap, `min-height`/`min-width`
        of `calc(var(--space-4) * 2)` on the buttons for a >=44px touch target, matching the
        design's stated intent for AC4).
    files:
      - src/components/ExpenseList.css
    rationale: |
      This is the concrete mechanism for AC1/AC2/AC3/AC4: a single container-query breakpoint
      drives an immediate reflow with no reload (AC3), the card layout removes the need for
      horizontal scrolling on a 320px viewport (AC1), the fixed-layout table with percentage
      columns and overflow-wrap uses full width without overflowing at 1440px (AC2), and the
      16px (--font-size-md) body text plus >=44px tap targets keep content readable and
      operable without zooming on a touchscreen (AC4).
  - description: |
      Update ExpenseList.tsx to render both the table (wide) and the card list (narrow)
      markup, matching the prototype's dual-markup structure, and wrap them in the
      container-query element. The component's props/behavior/pagination logic are unchanged;
      only the JSX structure and class names change. Sketch of the changed return
      (existing `pageItems`/`totalPages`/`page` state logic untouched):
      ```tsx
      return (
        <div className="expense-list">
          <table className="expense-table">
            {/* unchanged rows, now with className="expense-table" and colgroup */}
          </table>
          <div className="expense-cards">
            {pageItems.map((expense) => (
              <div className="expense-card" key={expense.id}>
                <div className="expense-card-row1">
                  <span className="expense-card-amount">{expense.amount.toFixed(2)}</span>
                  <span className="expense-card-date">{expense.date}</span>
                </div>
                <span className="chip">{expense.category}</span>
                <p className="expense-card-notes">{expense.notes ?? ""}</p>
              </div>
            ))}
          </div>
          {expenses.length > PAGE_SIZE && ( /* existing <nav> pagination, unchanged */ )}
        </div>
      );
      ```
      Also import the new stylesheet: `import "./ExpenseList.css";`
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      Read the design HTML (lines 469-548): it shows the identical expense data rendered
      once as `.expense-table` and once as `.expense-cards`, with the container query
      picking which one is visible. The empty-state branch (design lines 672-689: "No
      expenses recorded yet." + "Add an expense" button) already matches ExpenseList.tsx's
      existing empty-state markup exactly, so that branch is left unchanged.
  - description: |
      Fix two existing ExpenseList.test.tsx assertions that become ambiguous once both the
      table and card markup are present in the DOM simultaneously (jsdom does not apply
      CSS, so `display: none` does not remove the hidden branch from queries the way it
      would in a real browser). Scope each to the table:
      Before: `expect(screen.getByText("Lunch with team")).toBeInTheDocument();`
      After: `expect(within(screen.getByRole("table")).getByText("Lunch with team")).toBeInTheDocument();`
      Before: `expect(screen.getByText("note-11")).toBeInTheDocument();`
              `expect(screen.queryByText("note-0")).not.toBeInTheDocument();`
      After: `expect(within(screen.getByRole("table")).getByText("note-11")).toBeInTheDocument();`
             `expect(within(screen.getByRole("table")).queryByText("note-0")).not.toBeInTheDocument();`
      Requires adding `within` to the `@testing-library/react` import.
    files:
      - src/components/ExpenseList.test.tsx
    rationale: |
      This duplication is a jsdom artifact only: in a real browser `display: none` removes
      the hidden branch from the accessibility/text-query tree, so a screen reader or sighted
      user never sees both. `getAllByRole("row")` assertions are unaffected because the card
      markup uses `<div>`s, not table rows.
tests:
  - |
    New test in ExpenseList.test.tsx: viewport meta tag is present (guards AC1/AC4's
    precondition).
    ```ts
    import { readFileSync } from "node:fs";
    import { resolve } from "node:path";
    it("declares a device-width viewport in index.html", () => {
      const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
      expect(html).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1"/);
    });
    ```
  - |
    New test: the component renders both a table and a card representation of the same
    data, so a container-query CSS switch (untestable in jsdom) has both branches to pick
    from at runtime (guards AC1/AC2/AC3's structural precondition).
    ```ts
    it("renders both a table and a card representation of each expense for responsive reflow", () => {
      render(<ExpenseList expenses={[makeExpense({ notes: "Lunch" })]} onAddExpenseClick={vi.fn()} />);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(document.querySelector(".expense-cards .expense-card")).not.toBeNull();
    });
    ```
  - |
    New test: the container-query breakpoint and no-scroll rules exist in the shipped CSS,
    asserted by reading the source file directly since jsdom cannot evaluate `@container`
    (guards AC1/AC2/AC3 at the CSS-authoring level).
    ```ts
    it("defines a container-query breakpoint that switches table to cards", () => {
      const css = readFileSync(resolve(__dirname, "ExpenseList.css"), "utf8");
      expect(css).toMatch(/@container\s+expense-list\s*\(max-width:\s*559px\)/);
      expect(css).toMatch(/container-type:\s*inline-size/);
    });
    ```
  - |
    Updated existing tests in ExpenseList.test.tsx (see scope item on the test file) so
    `getByText("Lunch with team")` and the page-two `note-11`/`note-0` assertions are scoped
    with `within(screen.getByRole("table"))`, keeping them passing under dual table+card
    markup rather than throwing on multiple matches (guards no regression while adding AC1-4
    support).
  - |
    New test: pagination buttons meet a minimum touch-target size via the CSS class contract,
    checked structurally since jsdom has no computed layout — assert the button carries the
    `.btn-secondary` class that ExpenseList.css sizes to `min-height: calc(var(--space-4) * 2)`
    (44px+), guarding AC4's "readable/operable without zoom" intent for controls.
    ```ts
    it("renders pagination controls with the touch-target class", () => {
      const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
      render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} />);
      expect(screen.getByRole("button", { name: /next page/i })).toHaveClass("btn-secondary");
    });
    ```
assumptions_or_open_questions:
  - |
    jsdom does not compute layout, does not evaluate `@container`, and has no viewport
    concept, so none of AC1 (no horizontal scroll at 320px), AC2 (full-width use at 1440px
    without overflow), or AC3 (reflow on resize without reload) can be directly asserted by
    an automated test in this stack. The `tests` above cover the structural/CSS preconditions
    (viewport meta present, both representations rendered, breakpoint defined in the CSS);
    actual pixel-level verification of AC1-3 is manual, by opening the app at 320px and
    1440px and resizing the browser between them, as the reviewer harness in the design file
    itself demonstrates.
  - |
    The design prototype's page composition (an `<h1>Ledger</h1>` masthead, a separate
    `.toolbar` with an "Add expense" button, and loading/error/skeleton screens) differs
    from the current app (`<h1>Expense Tracker</h1>` in App.tsx, an always-visible
    AddExpenseForm, and no loading/error states because `loadExpenses()` reads
    localStorage synchronously). This plan does not reconcile that composition-level
    conflict; it scopes ExpenseList.tsx/css only, per this story's title and ACs, which are
    about the list's own responsiveness, not the page shell or loading/error states (those
    would belong to the "UI Shell & Responsiveness" epic's other, separately-planned items).
  - |
    The prototype's `.device-frame` / `.device-frame-inner` / `.harness*` elements are
    reviewer-harness scaffolding used only to simulate multiple viewport widths
    side-by-side in one static HTML file; they are not ported. The real app's own
    `.expense-list` wrapper is used as the container-query root instead, since in the
    actual browser its inline size already tracks the real viewport/parent width.
  - |
    Category is rendered as a `.chip` (text + background), matching the design's explicit
    note that category must never be color-only (design HTML line 512-513 comment); this
    plan keeps that as plain text without the chip's colored background/border styling
    change, since ExpenseList.tsx does not currently vary chip color by category and no AC
    requires it — flagging in case the reviewer wants chip coloring added to this scope.
package_dependencies: []
notes: |
  No new third-party packages are needed: Vite (vite.config.ts) already processes plain
  CSS imports with no additional plugin, so `import "./ExpenseList.css"` and the two
  design-system imports in main.tsx work out of the box.

  Module/call graph for the touched files and their real, already-existing neighbors:

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000
    main[src/main.tsx]:::touched -->|renders| App[src/App.tsx]
    main -->|new: imports tokens.css + prototype-utils.css| tokens[src/design-system/tokens.css]:::touched
    main -->|new import| protoUtils[src/design-system/prototype-utils.css]:::touched
    App -->|renders, props unchanged| ExpenseList[src/components/ExpenseList.tsx]:::touched
    ExpenseList -->|new import| ExpenseListCss[src/components/ExpenseList.css]:::touched
    ExpenseListCss -->|var references| tokens
    ExpenseListTest[src/components/ExpenseList.test.tsx]:::touched -->|renders + asserts| ExpenseList
    indexHtml[index.html]:::touched -->|loads| main
    App -->|renders, unchanged| AddExpenseForm[src/components/AddExpenseForm.tsx]
  ```
