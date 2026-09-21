import type { CSSProperties } from "react";
import { navBarBaseStyle } from "./navBarStyle";
import { NavBar } from "./NavBar";

const barStyle: CSSProperties = { ...navBarBaseStyle, height: 56 };

export function TopNavBar() {
  return <NavBar ariaLabel="Top navigation bar" barStyle={barStyle} />;
}
