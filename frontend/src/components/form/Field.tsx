import type { ReactNode } from "react";
import { ApiError } from "@/services/apiClient";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

// A label, the control, and the message under it. The error replaces nothing:
// its line is only rendered when there is one, and the hint stays above it.
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// A failure from the API shown at the bottom of a form, with the request id
// to quote when reporting it.
export function FormError({ error }: { error: Error | null }) {
  if (!error) return null;
  const requestId = error instanceof ApiError ? error.requestId : null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-destructive"
    >
      {error.message}
      {requestId ? ` (reference ${requestId})` : ""}
    </p>
  );
}
