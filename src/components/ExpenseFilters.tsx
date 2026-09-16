import { useId } from "react";
import { CATEGORIES, type Category } from "../domain/categories";
import type { ExpenseFilterCriteria } from "../domain/filterExpenses";

interface ExpenseFiltersProps {
  criteria: ExpenseFilterCriteria;
  onChange: (criteria: ExpenseFilterCriteria) => void;
}

export function ExpenseFilters({ criteria, onChange }: ExpenseFiltersProps) {
  const startDateId = useId();
  const endDateId = useId();
  const categoryId = useId();
  const keywordId = useId();

  return (
    <fieldset>
      <legend>Filters</legend>
      <div>
        <label htmlFor={startDateId}>Start date</label>
        <input
          id={startDateId}
          type="date"
          value={criteria.startDate ?? ""}
          onChange={(event) => onChange({ ...criteria, startDate: event.target.value || undefined })}
        />
      </div>

      <div>
        <label htmlFor={endDateId}>End date</label>
        <input
          id={endDateId}
          type="date"
          value={criteria.endDate ?? ""}
          onChange={(event) => onChange({ ...criteria, endDate: event.target.value || undefined })}
        />
      </div>

      <div>
        <label htmlFor={categoryId}>Category</label>
        <select
          id={categoryId}
          value={criteria.category ?? ""}
          onChange={(event) =>
            onChange({ ...criteria, category: (event.target.value as Category) || undefined })
          }
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
          value={criteria.keyword ?? ""}
          onChange={(event) => onChange({ ...criteria, keyword: event.target.value || undefined })}
        />
      </div>
    </fieldset>
  );
}
