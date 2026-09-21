import type { CSSProperties, ReactNode } from "react";
import { useBreakpoint } from "./useBreakpoint";
import { BottomTabBar } from "./BottomTabBar";
import { TopNavBar } from "./TopNavBar";
import { Sidebar } from "./Sidebar";

const mainStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: "auto",
};

function shellStyle(flexDirection: CSSProperties["flexDirection"]): CSSProperties {
  return {
    display: "flex",
    flexDirection,
    height: "100dvh",
    width: "100%",
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const breakpoint = useBreakpoint();

  if (breakpoint === "mobile") {
    return (
      <div style={shellStyle("column")}>
        <main style={mainStyle}>{children}</main>
        <BottomTabBar />
      </div>
    );
  }

  if (breakpoint === "tablet") {
    return (
      <div style={shellStyle("column")}>
        <TopNavBar />
        <main style={mainStyle}>{children}</main>
      </div>
    );
  }

  return (
    <div style={shellStyle("row")}>
      <Sidebar />
      <main style={mainStyle}>{children}</main>
    </div>
  );
}
