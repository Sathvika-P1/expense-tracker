import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Error already surfaced via state; nothing else to do here.
  }

  render() {
    if (this.state.hasError) {
      return <div role="alert">Something went wrong loading this page.</div>;
    }
    return this.props.children;
  }
}
