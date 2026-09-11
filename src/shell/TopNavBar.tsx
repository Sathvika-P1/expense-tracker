import type { CSSProperties } from "react";
import { navBarBaseStyle } from "./navBarStyle";
import { NavLinks } from "./NavLinks";

const barStyle: CSSProperties = { ...navBarBaseStyle, height: 56 };

export function TopNavBar() {
  return (
    <nav aria-label="Top navigation bar" style={barStyle}>
      <NavLinks />
    </nav>
  );
}
