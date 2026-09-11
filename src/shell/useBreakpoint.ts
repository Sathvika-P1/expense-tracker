import { useEffect, useState } from "react";
import { MOBILE_QUERY, TABLET_QUERY } from "./breakpointQueries";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function resolveBreakpoint(mobileMql: MediaQueryList, tabletMql: MediaQueryList): Breakpoint {
  if (mobileMql.matches) return "mobile";
  if (tabletMql.matches) return "tablet";
  return "desktop";
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    const mobileMql = window.matchMedia(MOBILE_QUERY);
    const tabletMql = window.matchMedia(TABLET_QUERY);
    return resolveBreakpoint(mobileMql, tabletMql);
  });

  useEffect(() => {
    const mobileMql = window.matchMedia(MOBILE_QUERY);
    const tabletMql = window.matchMedia(TABLET_QUERY);

    const update = () => setBreakpoint(resolveBreakpoint(mobileMql, tabletMql));
    update();

    mobileMql.addEventListener("change", update);
    tabletMql.addEventListener("change", update);
    return () => {
      mobileMql.removeEventListener("change", update);
      tabletMql.removeEventListener("change", update);
    };
  }, []);

  return breakpoint;
}
