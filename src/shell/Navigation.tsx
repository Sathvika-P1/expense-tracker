export type Destination = "expenses" | "reports";

const DESTINATIONS: { id: Destination; label: string }[] = [
  { id: "expenses", label: "Expenses" },
  { id: "reports", label: "Reports" },
];

type NavigationProps = {
  current: Destination;
  onSelect: (dest: Destination) => void;
};

export function Navigation({ current, onSelect }: NavigationProps) {
  return (
    <nav role="navigation">
      {DESTINATIONS.map((dest) => (
        <button
          key={dest.id}
          type="button"
          aria-current={current === dest.id ? "page" : undefined}
          onClick={() => onSelect(dest.id)}
        >
          {dest.label}
        </button>
      ))}
    </nav>
  );
}
