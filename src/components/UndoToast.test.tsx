import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { UndoToast } from "./UndoToast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UndoToast", () => {
  it("counts down, pauses on hover, and calls onUndo", () => {
    const onUndo = vi.fn();
    const onExpire = vi.fn();
    render(<UndoToast onUndo={onUndo} onExpire={onExpire} />);

    expect(screen.getByRole("status")).toHaveTextContent("Expense deleted");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("7s")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("7s")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Expense restored");

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("resumes after mouse leave", () => {
    render(<UndoToast onUndo={vi.fn()} onExpire={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.mouseLeave(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(2000));

    expect(screen.getByText("8s")).toBeInTheDocument();
  });

  it("calls onExpire once when the 10s window elapses", () => {
    const onExpire = vi.fn();
    render(<UndoToast onUndo={vi.fn()} onExpire={onExpire} />);

    act(() => vi.advanceTimersByTime(10_000));
    act(() => vi.advanceTimersByTime(5_000));

    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
