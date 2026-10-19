import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/services/apiClient";
import { Surface } from "./Surface";

interface StateCardProps {
  title: string;
  text?: string;
  // What to quote when reporting a problem. It matches the server's log lines
  // for the request.
  requestId?: string | null;
  role?: "alert";
  // Buttons or links under the text.
  children?: ReactNode;
  className?: string;
}

// An empty, not-found, notice or error state, on the card surface.
export function StateCard({
  title,
  text,
  requestId,
  role,
  children,
  className,
}: StateCardProps) {
  return (
    <Surface role={role} className={className}>
      <p className="text-body font-medium">{title}</p>
      {text && <p className="mt-1 text-small text-muted-foreground">{text}</p>}
      {requestId && (
        <p className="mt-1 text-small text-muted-foreground">
          Reference: <span className="font-mono">{requestId}</span>
        </p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </Surface>
  );
}

// A failed load, with the message, the request id and a retry.
export function ErrorCard({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <StateCard
      role="alert"
      title={title}
      text={error?.message ?? "Something went wrong."}
      requestId={error instanceof ApiError ? error.requestId : null}
    >
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </StateCard>
  );
}
