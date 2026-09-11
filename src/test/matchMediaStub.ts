type Listener = (event: MediaQueryListEvent) => void;

function evaluateQuery(query: string, width: number): boolean {
  const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
  const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
  if (minWidthMatch && width < Number(minWidthMatch[1])) return false;
  if (maxWidthMatch && width > Number(maxWidthMatch[1])) return false;
  return true;
}

export function installMatchMediaStub(initialWidth: number) {
  let width = initialWidth;
  const listenersByQuery = new Map<string, Set<Listener>>();
  const mqlByQuery = new Map<string, MediaQueryList>();

  function getMql(query: string): MediaQueryList {
    let mql = mqlByQuery.get(query);
    if (mql) return mql;
    const listeners = new Set<Listener>();
    listenersByQuery.set(query, listeners);
    mql = {
      get matches() {
        return evaluateQuery(query, width);
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: Listener) => {
        listeners.delete(listener);
      },
      addListener: (listener: Listener) => {
        listeners.add(listener);
      },
      removeListener: (listener: Listener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
    mqlByQuery.set(query, mql);
    return mql;
  }

  window.matchMedia = ((query: string) => getMql(query)) as typeof window.matchMedia;

  return {
    setWidth(nextWidth: number) {
      width = nextWidth;
      for (const [query, listeners] of listenersByQuery) {
        const matches = evaluateQuery(query, width);
        const event = { matches, media: query } as MediaQueryListEvent;
        for (const listener of listeners) listener(event);
      }
    },
  };
}
