import { Component, type ErrorInfo, type ReactNode } from "react";
import { getT } from "../i18n/index.js";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[boke] render error:", error, info);
  }

  render() {
    if (this.state.error) {
      const t = getT();
      return (
        <div
          style={{
            padding: 24,
            color: "#f38ba8",
            background: "#1e1e2e",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ color: "#cdd6f4" }}>{t("error.title")}</h1>
          <pre style={{ whiteSpace: "pre-wrap", color: "#fab387" }}>{this.state.error.message}</pre>
          <p style={{ color: "#a6adc8" }}>{t("error.hint")}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
