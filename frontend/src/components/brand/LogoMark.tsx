export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        className="fill-card stroke-border"
      />
      <path
        d="M6.5 11.5h4.6"
        className="stroke-muted-foreground"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect
        x="13.4"
        y="9.8"
        width="11"
        height="3.4"
        rx="1.7"
        className="fill-muted-foreground"
      />
      <path
        d="M8.8 18.2v4.6M6.5 20.5h4.6"
        className="stroke-addition"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect
        x="13.4"
        y="18.8"
        width="13"
        height="3.4"
        rx="1.7"
        className="fill-addition"
      />
    </svg>
  );
}
