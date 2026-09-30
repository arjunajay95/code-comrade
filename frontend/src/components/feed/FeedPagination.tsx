import { Button } from "@/components/ui/button";

interface FeedPaginationProps {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}

export function FeedPagination({
  page,
  totalPages,
  disabled,
  onPageChange,
}: FeedPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Feed pages"
      className="flex items-center justify-between pt-6"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
