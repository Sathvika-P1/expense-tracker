import { useState } from "react";
import { getAccount, type Account } from "../domain/accountRepository";
import { CURRENCIES } from "../domain/currencies";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { EditProfileForm } from "./EditProfileForm";
import "./ProfileView.css";

type Panel = "none" | "edit" | "password";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function ProfileView() {
  const [account, setAccount] = useState<Account>(() => getAccount());
  const [panel, setPanel] = useState<Panel>("none");
  const [message, setMessage] = useState("");

  const currencyLabel =
    CURRENCIES.find((currency) => currency.code === account.currency)?.label ?? account.currency;

  function open(next: Panel) {
    setMessage("");
    setPanel(next);
  }

  return (
    <div className="profile" data-component="ProfileView">
      <div className="card">
        <div className="profile-header">
          <div className="profile-avatar" aria-hidden="true">
            {initials(account.name)}
          </div>
          <div>
            <h1 className="card-title">{account.name}</h1>
            <p className="text-md text-muted">{account.email}</p>
            <button type="button" className="btn btn-secondary">
              Change photo
            </button>
            <p className="text-sm text-muted">Coming soon</p>
          </div>
        </div>

        <p role="status">{message}</p>

        <section aria-labelledby="account-details-heading">
          <h2 id="account-details-heading" className="card-title">
            Account details
          </h2>
          <dl className="profile-details">
            <dt>Full name</dt>
            <dd>{account.name}</dd>
            <dt>Email</dt>
            <dd>{account.email}</dd>
            <dt>Default currency</dt>
            <dd>{currencyLabel}</dd>
          </dl>
        </section>

        <div className="actions-row">
          <button type="button" className="btn btn-primary" onClick={() => open("edit")}>
            Edit profile
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => open("password")}>
            Update password
          </button>
        </div>
      </div>

      {panel === "edit" && (
        <EditProfileForm
          account={account}
          onSaved={(saved) => {
            setAccount(saved);
            setPanel("none");
            setMessage("Profile updated.");
          }}
          onCancel={() => open("none")}
        />
      )}
      {panel === "password" && (
        <ChangePasswordForm
          accountId={account.id}
          onSaved={() => {
            setPanel("none");
            setMessage("Password updated.");
          }}
          onCancel={() => open("none")}
        />
      )}
    </div>
  );
}
