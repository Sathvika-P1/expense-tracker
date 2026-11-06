import { useEffect, useRef, useState } from "react";
import { getAccount, type Account } from "../domain/accountRepository";
import { CURRENCIES } from "../domain/currencies";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { EditProfileForm } from "./EditProfileForm";
import "./ProfileView.css";

type Panel = "none" | "edit" | "password";
type FocusTarget = "heading" | "edit" | "password";

const INERT_MESSAGES = {
  "log-out": "Log in is built in ET-STORY-037.",
  "delete-account": "Delete account is built in ET-STORY-039.",
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatMemberSince(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ProfileView() {
  const [account, setAccount] = useState<Account>(() => getAccount());
  const [panel, setPanel] = useState<Panel>("none");
  const [message, setMessage] = useState("");
  const focusTargetRef = useRef<FocusTarget | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const passwordRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (panel !== "none" || !focusTargetRef.current) return;
    const target = { heading: headingRef, edit: editRef, password: passwordRef };
    target[focusTargetRef.current].current?.focus();
    focusTargetRef.current = null;
  }, [panel]);

  const currencyLabel =
    CURRENCIES.find((currency) => currency.code === account.currency)?.label ?? account.currency;
  const memberSince = formatMemberSince(account.createdAt);

  function open(next: "edit" | "password") {
    setMessage("");
    setPanel(next);
  }

  function close(opener: FocusTarget, notice = "") {
    setMessage(notice);
    focusTargetRef.current = opener;
    setPanel("none");
  }

  return (
    <div className="profile" data-component="ProfileView">
      <div className="profile-topbar">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setMessage(INERT_MESSAGES["log-out"])}
        >
          Log out
        </button>
      </div>

      <p role="status">{message}</p>

      {panel === "edit" && (
        <EditProfileForm
          account={account}
          onSaved={(saved) => {
            setAccount(saved);
            close("heading", "Profile updated.");
          }}
          onCancel={() => close("edit")}
        />
      )}
      {panel === "password" && (
        <ChangePasswordForm
          accountId={account.id}
          onSaved={() => close("heading", "Password updated.")}
          onCancel={() => close("password")}
        />
      )}

      {panel === "none" && (
        <div className="card">
          <div className="profile-header">
            <div className="profile-avatar" role="img" aria-label="Profile photo placeholder">
              {initials(account.name)}
            </div>
            <div>
              <button type="button" className="btn btn-secondary" aria-describedby="photo-hint">
                Change photo
              </button>
              <p id="photo-hint" className="text-sm text-muted">
                Coming soon
              </p>
            </div>
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="card-title">
                {account.name}
              </h1>
              <p className="text-md text-muted">{account.email}</p>
              <p className="text-md text-muted">Member since {memberSince}</p>
              <button
                ref={editRef}
                type="button"
                className="btn btn-primary"
                onClick={() => open("edit")}
              >
                Edit profile
              </button>
            </div>
          </div>

          <section aria-labelledby="account-details-heading">
            <h2 id="account-details-heading" className="card-title">
              Account details
            </h2>
            <dl className="profile-details">
              <dt>Full name</dt>
              <dd>{account.name}</dd>
              <dt>Email</dt>
              <dd>{account.email}</dd>
              <dt>Currency</dt>
              <dd>{currencyLabel}</dd>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </dl>
            <button
              ref={passwordRef}
              type="button"
              className="btn btn-secondary"
              onClick={() => open("password")}
            >
              <span>Password</span> <span>Update password</span>
            </button>
            <div className="profile-delete-row">
              <span>Delete account</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMessage(INERT_MESSAGES["delete-account"])}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
