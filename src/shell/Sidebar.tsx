import type { CSSProperties } from "react";
import { navBarBaseStyle } from "./navBarStyle";
import { NavBar } from "./NavBar";

const barStyle: CSSProperties = { ...navBarBaseStyle, width: 240, flexDirection: "column" };

export function Sidebar() {
  return <NavBar ariaLabel="Sidebar" barStyle={barStyle} />;
}
