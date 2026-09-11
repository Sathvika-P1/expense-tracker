import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";

export function NavBar({ ariaLabel, barStyle }: { ariaLabel: string; barStyle: CSSProperties }) {
  return (
    <nav aria-label={ariaLabel} style={barStyle}>
      {NAV_ITEMS.map((item) => (
        <Link key={item.id} to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
