import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";

const barStyle: CSSProperties = {
  flexShrink: 0,
  height: 56,
  display: "flex",
  transition: "none",
  animation: "none",
};

export function BottomTabBar() {
  return (
    <nav aria-label="Bottom tab bar" style={barStyle}>
      {NAV_ITEMS.map((item) => (
        <Link key={item.id} to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
