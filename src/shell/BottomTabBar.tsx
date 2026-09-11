import type { CSSProperties } from "react";
import { navBarBaseStyle } from "./navBarStyle";
import { NavLinks } from "./NavLinks";

const barStyle: CSSProperties = { ...navBarBaseStyle, height: 56 };

export function BottomTabBar() {
  return (
    <nav aria-label="Bottom tab bar" style={barStyle}>
      <NavLinks />
    </nav>
  );
}
