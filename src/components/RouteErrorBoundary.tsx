import { Component, type ReactNode } from "react";

type Props = {
  routeLabel: string;
  onRetry: () => Promise<boolean>;
  children: ReactNode;
};

type State = { failed: boolean; failureCount: number; retrying: boolean };

const ESCALATION_THRESHOLD = 2;

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, failureCount: 0, retrying: false };
  private unmounted = false;

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch() {
    this.setState((s) => ({ failureCount: s.failureCount + 1 }));
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  private handleRetry = async () => {
    this.setState({ retrying: true });
    const ok = await this.props.onRetry();
    if (this.unmounted) return;
    if (ok) {
      this.setState({ failed: false, failureCount: 0, retrying: false });
    } else {
      this.setState((s) => ({ failureCount: s.failureCount + 1, retrying: false }));
    }
  };

  render() {
    const { failed, failureCount, retrying } = this.state;
    if (!failed) return this.props.children;

    const escalated = failureCount >= ESCALATION_THRESHOLD;
    return (
      <div className="error-panel" role="alert" aria-live="assertive">
        <div className="error-icon" aria-hidden="true">
          !
        </div>
        <div className="error-body">
          <h2>{escalated ? "Still having trouble loading this" : "This section couldn't load"}</h2>
          <p className="text-fg">
            {escalated
              ? "This keeps failing to load. It may be a longer-lasting problem — try again in a bit, or contact support if it continues."
              : `Something went wrong while loading ${this.props.routeLabel}. Check your connection and try again.`}
          </p>
          <div className="error-actions">
            <button
              type="button"
              className="btn btn-primary"
              aria-disabled={retrying}
              data-loading={retrying ? "true" : undefined}
              onClick={() => {
                if (!retrying) void this.handleRetry();
              }}
            >
              {retrying ? "Retrying…" : "Retry"}
            </button>
            <span className="text-sm text-muted">
              {retrying
                ? `Reattempting the ${this.props.routeLabel} route`
                : escalated
                  ? `Failed ${failureCount} times`
                  : ""}
            </span>
          </div>
        </div>
      </div>
    );
  }
}
