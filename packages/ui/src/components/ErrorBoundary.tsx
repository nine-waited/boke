import { Component, type ErrorInfo, type ReactNode } from "react";

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
          <h1 style={{ color: "#cdd6f4" }}>Boke 启动失败</h1>
          <pre style={{ whiteSpace: "pre-wrap", color: "#fab387" }}>{this.state.error.message}</pre>
          <p style={{ color: "#a6adc8" }}>请打开浏览器开发者工具 (F12) 查看 Console 获取详情。</p>
        </div>
      );
    }
    return this.props.children;
  }
}
