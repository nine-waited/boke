import type { ReactNode } from "react";

export function ToolbarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="boke-toolbar-icon-btn"
      onClick={onClick}
      aria-label={label}
      data-tooltip={label}
    >
      {children}
    </button>
  );
}
