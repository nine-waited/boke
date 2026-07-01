import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, ErrorBoundary } from "@boke/ui";
import "@boke/ui/styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
