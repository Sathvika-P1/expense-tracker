import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";

const barStyle: CSSProperties = {
  flexShrink: 0,
  width: 240,
  display: "flex",
  flexDirection: "column",
  transition: "none",
  animation: "none",
};

export function Sidebar() {
  return (
    <nav aria-label="Sidebar" style={barStyle}>
      {NAV_ITEMS.map((item) => (
        <Link key={item.id} to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
