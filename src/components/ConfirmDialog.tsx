import { useEffect, useId, useRef } from "react";
import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  details?: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  title,
  details,
  confirmLabel = "Confirm",
  pendingLabel,
  pending = false,
  error,
  destructive = false,
}: ConfirmDialogProps) {
  const titleId = useId();
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
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="dialog"
        role={destructive ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {title && <h2 id={titleId}>{title}</h2>}
        {error && (
          <div role="alert" className="banner">
            {error}
          </div>
        )}
        <p>{message}</p>
        {details}
        <div className="dialog-actions">
          <button
            ref={confirmRef}
            type="button"
            className={destructive ? "btn btn-danger" : "btn btn-secondary"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && pendingLabel ? pendingLabel : confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
