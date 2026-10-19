import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono text-small font-medium", className)}>
      <span className="text-muted-foreground">~/</span>codecomrade
    </span>
  );
}
