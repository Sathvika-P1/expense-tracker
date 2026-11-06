import { useId, useState } from "react";
import { updateProfile, type Account } from "../domain/accountRepository";
import { CURRENCIES } from "../domain/currencies";
import type { ProfileErrors, ProfileInput } from "../domain/validateProfile";

interface EditProfileFormProps {
  account: Account;
  onSaved: (account: Account) => void;
  onCancel: () => void;
}

export function EditProfileForm({ account, onSaved, onCancel }: EditProfileFormProps) {
  const [form, setForm] = useState<ProfileInput>({
    name: account.name,
    email: account.email,
    currency: account.currency,
  });
  const [errors, setErrors] = useState<ProfileErrors>({});

  const nameId = useId();
  const emailId = useId();
  const currencyId = useId();
  const nameErrorId = useId();
  const emailErrorId = useId();
  const currencyErrorId = useId();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = updateProfile(account.id, form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSaved(result.account);
  }

  return (
    <div className="card" data-component="EditProfileForm">
      <h2 className="card-title">Edit profile</h2>
      <form noValidate onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor={nameId}>
            Full name
          </label>
          <input
            className={errors.name ? "input has-error" : "input"}
            id={nameId}
            type="text"
            autoComplete="name"
            value={form.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? nameErrorId : undefined}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          {errors.name && (
            <p id={nameErrorId} className="error-text" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={emailId}>
            Email
          </label>
          <input
            className={errors.email ? "input has-error" : "input"}
            id={emailId}
            type="email"
            autoComplete="email"
            value={form.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? emailErrorId : undefined}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          {errors.email && (
            <p id={emailErrorId} className="error-text" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={currencyId}>
            Default currency
          </label>
          <select
            className={errors.currency ? "input has-error" : "input"}
            id={currencyId}
            value={form.currency}
            aria-invalid={errors.currency ? true : undefined}
            aria-describedby={errors.currency ? currencyErrorId : undefined}
            onChange={(event) => setForm({ ...form, currency: event.target.value })}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </select>
          {errors.currency && (
            <p id={currencyErrorId} className="error-text" role="alert">
              {errors.currency}
            </p>
          )}
        </div>

        <div className="actions-row">
          <button type="submit" className="btn btn-primary">
            Save changes
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
