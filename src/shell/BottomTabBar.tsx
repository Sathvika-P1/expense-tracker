import type { CSSProperties } from "react";
import { navBarBaseStyle } from "./navBarStyle";
import { NavBar } from "./NavBar";

const barStyle: CSSProperties = { ...navBarBaseStyle, height: 56 };

export function BottomTabBar() {
  return <NavBar ariaLabel="Bottom tab bar" barStyle={barStyle} />;
}
