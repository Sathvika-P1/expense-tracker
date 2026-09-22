import { useId, useState } from "react";
import { validateDateRange } from "../domain/dateRangeFilter";

interface DateRangeFilterProps {
  onRangeChange: (range: { start: string; end: string; isValid: boolean }) => void;
}

export function DateRangeFilter({ onRangeChange }: DateRangeFilterProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const startId = useId();
  const endId = useId();
  const startErrorId = useId();
  const endErrorId = useId();
  const rangeErrorId = useId();

  const errors = validateDateRange(start, end);

  function update(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    const nextErrors = validateDateRange(nextStart, nextEnd);
    onRangeChange({
      start: nextStart,
      end: nextEnd,
      isValid: Object.keys(nextErrors).length === 0,
    });
  }

  return (
    <div>
      <div>
        <label htmlFor={startId}>Start date</label>
        <input
          id={startId}
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          value={start}
          aria-describedby={errors.start ? startErrorId : undefined}
          onChange={(event) => update(event.target.value, end)}
        />
        {errors.start && (
          <p id={startErrorId} role="alert">
            {errors.start}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={endId}>End date</label>
        <input
          id={endId}
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          value={end}
          aria-describedby={errors.end ? endErrorId : undefined}
          onChange={(event) => update(start, event.target.value)}
        />
        {errors.end && (
          <p id={endErrorId} role="alert">
            {errors.end}
          </p>
        )}
      </div>
      {errors.range && (
        <p id={rangeErrorId} role="alert">
          {errors.range}
        </p>
      )}
    </div>
  );
}
