import { useEffect, useId, useRef, useState } from "react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  title = "Confirm",
  confirmLabel = "Confirm",
  destructive = false,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleConfirm() {
    setSubmitting(true);
    onConfirm();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const first = cancelRef.current;
    const last = confirmRef.current;
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="dialog-scrim"
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className="card-title">
          {title}
        </h2>
        <p id={descriptionId} className="text-md text-muted">
          {message}
        </p>
        <div className="actions-row">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={destructive ? "btn btn-destructive" : "btn btn-primary"}
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
