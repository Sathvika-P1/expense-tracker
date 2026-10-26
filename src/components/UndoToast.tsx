import { useEffect, useRef, useState } from "react";
import { UNDO_WINDOW_MS } from "../domain/expenseRepository";

interface UndoToastProps {
  onUndo: () => void;
  onExpire: () => void;
}

const RESTORED_TOAST_MS = 2200;

export function UndoToast({ onUndo, onExpire }: UndoToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(UNDO_WINDOW_MS / 1000);
  const [paused, setPaused] = useState(false);
  const [restored, setRestored] = useState(false);
  const [visible, setVisible] = useState(true);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (paused || restored) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [paused, restored]);

  useEffect(() => {
    if (secondsLeft === 0 && !restored && !expiredRef.current) {
      expiredRef.current = true;
      onExpire();
    }
  }, [secondsLeft, restored, onExpire]);

  useEffect(() => {
    if (!restored) return;
    const timer = setTimeout(() => setVisible(false), RESTORED_TOAST_MS);
    return () => clearTimeout(timer);
  }, [restored]);

  if (!visible) return null;

  function handleUndo() {
    onUndo();
    setRestored(true);
  }

  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {restored ? (
        <span>Expense restored</span>
      ) : (
        <>
          <span>Expense deleted</span>
          <span className="toast-count">{secondsLeft}s</span>
          <button type="button" className="toast-undo" onClick={handleUndo}>
            Undo
          </button>
        </>
      )}
    </div>
  );
}
