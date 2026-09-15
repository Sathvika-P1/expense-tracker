import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;

    const first = confirmRef.current;
    const last = cancelRef.current;
    if (!first || !last) return;

    const onContainer = document.activeElement === dialogRef.current;

    if (event.shiftKey) {
      if (onContainer || document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <p>{message}</p>
      <button ref={confirmRef} type="button" onClick={onConfirm}>
        Confirm
      </button>
      <button ref={cancelRef} type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
