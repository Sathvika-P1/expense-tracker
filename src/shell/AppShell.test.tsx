import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { installMatchMediaStub } from "../test/matchMediaStub";
import { AppShell } from "./AppShell";

function renderAt(width: number, children = <div>content</div>) {
  installMatchMediaStub(width);
  return render(
    <MemoryRouter>
      <AppShell>{children}</AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("AC1: renders bottom tab bar only at mobile widths (320, 768)", () => {
    for (const width of [320, 768]) {
      const { unmount } = renderAt(width);
      expect(screen.getByRole("navigation", { name: "Bottom tab bar" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Top navigation bar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Sidebar" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("AC2: main content flexes to fill remaining height below/above fixed nav on mobile (column layout, nav after main, nav fixed height)", () => {
    renderAt(375);
    const main = screen.getByRole("main");
    const nav = screen.getByRole("navigation", { name: "Bottom tab bar" });
    const shell = main.parentElement as HTMLElement;

    expect(shell.style.flexDirection).toBe("column");
    expect(shell.style.height).toBe("100dvh");
    expect(main.style.flex).toBe("1 1 0%");
    expect(main.style.minHeight).toBe("0px");
    expect(nav.style.flexShrink).toBe("0");
    expect(nav.style.height).toBe("56px");
    expect(Array.from(shell.children).indexOf(main)).toBeLessThan(Array.from(shell.children).indexOf(nav));
  });

  it("AC3: renders top nav bar only at tablet widths (769, 1024)", () => {
    for (const width of [769, 1024]) {
      const { unmount } = renderAt(width);
      expect(screen.getByRole("navigation", { name: "Top navigation bar" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Bottom tab bar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Sidebar" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("AC4: main content flexes to fill remaining height below fixed top nav on tablet (column layout, nav before main, nav fixed height)", () => {
    renderAt(1024);
    const main = screen.getByRole("main");
    const nav = screen.getByRole("navigation", { name: "Top navigation bar" });
    const shell = main.parentElement as HTMLElement;

    expect(shell.style.flexDirection).toBe("column");
    expect(main.style.flex).toBe("1 1 0%");
    expect(nav.style.flexShrink).toBe("0");
    expect(nav.style.height).toBe("56px");
    expect(Array.from(shell.children).indexOf(nav)).toBeLessThan(Array.from(shell.children).indexOf(main));
  });

  it("AC5: renders sidebar only at desktop widths (1025, 1440)", () => {
    for (const width of [1025, 1440]) {
      const { unmount } = renderAt(width);
      expect(screen.getByRole("navigation", { name: "Sidebar" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Bottom tab bar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Top navigation bar" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("AC6: main content flexes to fill remaining width beside fixed-width sidebar on desktop (row layout, sidebar before main, sidebar fixed width)", () => {
    renderAt(1440);
    const main = screen.getByRole("main");
    const nav = screen.getByRole("navigation", { name: "Sidebar" });
    const shell = main.parentElement as HTMLElement;

    expect(shell.style.flexDirection).toBe("row");
    expect(main.style.flex).toBe("1 1 0%");
    expect(main.style.minWidth).toBe("0px");
    expect(nav.style.flexShrink).toBe("0");
    expect(nav.style.width).toBe("240px");
    expect(Array.from(shell.children).indexOf(nav)).toBeLessThan(Array.from(shell.children).indexOf(main));
  });

  it("AC7: switches chrome across a breakpoint boundary on resize without a page reload", () => {
    const stub = installMatchMediaStub(320);
    const { container } = render(
      <MemoryRouter>
        <AppShell>content</AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "Bottom tab bar" })).toBeInTheDocument();
    const shellBeforeResize = container.firstElementChild;

    act(() => {
      stub.setWidth(1440);
    });

    expect(screen.getByRole("navigation", { name: "Sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Bottom tab bar" })).not.toBeInTheDocument();
    expect(container.firstElementChild).toBe(shellBeforeResize);
  });

  it("AC8: chrome elements declare zero transition/animation duration, and the swap happens synchronously in one commit", () => {
    const stub = installMatchMediaStub(769);
    render(
      <MemoryRouter>
        <AppShell>content</AppShell>
      </MemoryRouter>,
    );
    const tabletNav = screen.getByRole("navigation", { name: "Top navigation bar" });
    expect(tabletNav.style.transition).toBe("none");
    expect(tabletNav.style.animation).toBe("none");

    act(() => {
      stub.setWidth(320);
    });

    const mobileNav = screen.getByRole("navigation", { name: "Bottom tab bar" });
    expect(mobileNav.style.transition).toBe("none");
    expect(mobileNav.style.animation).toBe("none");
    expect(screen.queryByRole("navigation", { name: "Top navigation bar" })).not.toBeInTheDocument();
  });

  it("AC9: renders full shell chrome with no empty-state markup when there is no expense data, at every breakpoint", () => {
    for (const width of [320, 1024, 1440]) {
      const { unmount } = renderAt(width, <div data-testid="no-data-placeholder">no expenses</div>);
      expect(screen.getAllByRole("navigation")).toHaveLength(1);
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.queryByText(/empty/i)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("AC10: renders routed child content fully within main without clipping or duplicating chrome", () => {
    renderAt(1024, <div data-testid="routed-content">{"x".repeat(500)}</div>);
    const main = screen.getByRole("main");
    expect(screen.getByTestId("routed-content")).toBeInTheDocument();
    expect(main.textContent).toContain("x".repeat(500));
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });
});
