import { useId, useState } from "react";
import { changePassword } from "../domain/accountRepository";
import {
  validatePasswordForm,
  type PasswordErrors,
  type PasswordInput,
} from "../domain/validateProfile";

interface ChangePasswordFormProps {
  accountId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function ChangePasswordForm({ accountId, onSaved, onCancel }: ChangePasswordFormProps) {
  const [form, setForm] = useState<PasswordInput>({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<PasswordErrors>({});

  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();
  const nextHintId = useId();
  const currentErrorId = useId();
  const nextErrorId = useId();
  const confirmErrorId = useId();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const formatErrors = validatePasswordForm(form);
    if (Object.keys(formatErrors).length > 0) {
      setErrors(formatErrors);
      return;
    }
    const result = await changePassword(accountId, form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSaved();
  }

  return (
    <div className="card" data-component="ChangePasswordForm">
      <h2 className="card-title">Update password</h2>
      <form noValidate onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor={currentId}>
            Current password
          </label>
          <input
            className={errors.current ? "input has-error" : "input"}
            id={currentId}
            type="password"
            autoComplete="current-password"
            value={form.current}
            aria-invalid={errors.current ? true : undefined}
            aria-describedby={errors.current ? currentErrorId : undefined}
            onChange={(event) => setForm({ ...form, current: event.target.value })}
          />
          {errors.current && (
            <p id={currentErrorId} className="error-text" role="alert">
              {errors.current}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={nextId}>
            New password
          </label>
          <input
            className={errors.next ? "input has-error" : "input"}
            id={nextId}
            type="password"
            autoComplete="new-password"
            value={form.next}
            aria-invalid={errors.next ? true : undefined}
            aria-describedby={errors.next ? `${nextHintId} ${nextErrorId}` : nextHintId}
            onChange={(event) => setForm({ ...form, next: event.target.value })}
          />
          <p id={nextHintId} className="text-sm text-muted">
            At least 8 characters.
          </p>
          {errors.next && (
            <p id={nextErrorId} className="error-text" role="alert">
              {errors.next}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={confirmId}>
            Confirm new password
          </label>
          <input
            className={errors.confirm ? "input has-error" : "input"}
            id={confirmId}
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? confirmErrorId : undefined}
            onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          />
          {errors.confirm && (
            <p id={confirmErrorId} className="error-text" role="alert">
              {errors.confirm}
            </p>
          )}
        </div>

        <div className="actions-row">
          <button type="submit" className="btn btn-primary">
            Update password
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
