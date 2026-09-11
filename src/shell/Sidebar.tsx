import type { CSSProperties } from "react";
import { navBarBaseStyle } from "./navBarStyle";
import { NavLinks } from "./NavLinks";

const barStyle: CSSProperties = { ...navBarBaseStyle, width: 240, flexDirection: "column" };

export function Sidebar() {
  return (
    <nav aria-label="Sidebar" style={barStyle}>
      <NavLinks />
    </nav>
  );
}
