import { useId } from "react";
import { CATEGORIES, type Category } from "../domain/categories";

interface CategoryFilterProps {
  selected: Category[];
  onChange: (next: Category[]) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const idPrefix = useId();

  function toggle(category: Category) {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  }

  return (
    <fieldset>
      <legend>Filter by category</legend>
      {CATEGORIES.map((category) => {
        const id = `${idPrefix}-${category}`;
        return (
          <div key={category}>
            <input
              id={id}
              type="checkbox"
              checked={selected.includes(category)}
              onChange={() => toggle(category)}
            />
            <label htmlFor={id}>{category}</label>
          </div>
        );
      })}
    </fieldset>
  );
}
