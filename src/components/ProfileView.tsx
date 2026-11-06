import { useRef, useState } from "react";
import type { DeleteAccountResult } from "../domain/accountRepository";
import { ConfirmDialog } from "./ConfirmDialog";

interface ProfileViewProps {
  email: string;
  expenseCount: number;
  onDeleteAccount: () => DeleteAccountResult;
  onAccountGone: () => void;
}

const DELETE_FAILED_MESSAGE =
  "We couldn't delete your account. Something went wrong on our side. Your account and expenses are unchanged and you can still log in. Try again in a moment.";

export function ProfileView({ email, expenseCount, onDeleteAccount, onAccountGone }: ProfileViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  function handleConfirm() {
    setPending(true);
    setError(undefined);
    const result = onDeleteAccount();
    if (result.ok || result.reason === "session-expired") {
      onAccountGone();
      return;
    }
    setPending(false);
    setError(DELETE_FAILED_MESSAGE);
  }

  function handleCancel() {
    setDialogOpen(false);
    setError(undefined);
    setTimeout(() => deleteButtonRef.current?.focus(), 0);
  }

  return (
    <main>
      <h1>Profile</h1>
      <p className="text-md text-muted">{email}</p>
      <section className="card" aria-labelledby="account-details-title">
        <h2 id="account-details-title" className="card-title">
          Account details
        </h2>
        <div>
          <strong>Delete account</strong>
          <p className="text-md text-muted">Permanently removes your account and expenses.</p>
          <button
            ref={deleteButtonRef}
            type="button"
            className="btn btn-secondary"
            onClick={() => setDialogOpen(true)}
          >
            Delete
          </button>
        </div>
      </section>
      {dialogOpen && (
        <ConfirmDialog
          destructive
          title="Delete your account?"
          message={`This permanently deletes ${email} and cannot be undone.`}
          details={
            <ul>
              <li>All {expenseCount} of your expense records are removed.</li>
              <li>You won't be able to log in with this email and password again.</li>
            </ul>
          }
          confirmLabel="Delete account"
          pendingLabel="Deleting…"
          pending={pending}
          error={error}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </main>
  );
}
