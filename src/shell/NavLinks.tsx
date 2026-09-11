import { Link } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";

export function NavLinks() {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <Link key={item.id} to={item.to}>
          {item.label}
        </Link>
      ))}
    </>
  );
}
