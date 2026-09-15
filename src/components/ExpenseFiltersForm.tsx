import { useId } from "react";
import { CATEGORIES } from "../domain/categories";
import type { ExpenseFilters } from "../domain/expenseFilters";

interface ExpenseFiltersFormProps {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
  onClear: () => void;
}

export function ExpenseFiltersForm({ filters, onChange, onClear }: ExpenseFiltersFormProps) {
  const startDateId = useId();
  const endDateId = useId();
  const categoryId = useId();
  const keywordId = useId();

  return (
    <div role="search" aria-label="Filter expenses">
      <div>
        <label htmlFor={startDateId}>Start date</label>
        <input
          id={startDateId}
          type="date"
          value={filters.startDate}
          onChange={(event) => onChange({ ...filters, startDate: event.target.value })}
        />
      </div>

      <div>
        <label htmlFor={endDateId}>End date</label>
        <input
          id={endDateId}
          type="date"
          value={filters.endDate}
          onChange={(event) => onChange({ ...filters, endDate: event.target.value })}
        />
      </div>

      <div>
        <label htmlFor={categoryId}>Category</label>
        <select
          id={categoryId}
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={keywordId}>Keyword</label>
        <input
          id={keywordId}
          type="text"
          value={filters.keyword}
          onChange={(event) => onChange({ ...filters, keyword: event.target.value })}
        />
      </div>

      <button type="button" onClick={onClear}>
        Clear all filters
      </button>
    </div>
  );
}
