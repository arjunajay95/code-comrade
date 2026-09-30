export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          CodeComrade is a peer code review platform built by Arjuna Jayasinghe.
        </p>
        <a
          href="https://github.com/arjunajay95/code-comrade"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
