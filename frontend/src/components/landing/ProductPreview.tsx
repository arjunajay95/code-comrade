import { FeedItemRow } from "@/components/feed/FeedItemRow";
import { Container } from "@/components/shell/Container";
import { GLASS_BLUR, GLASS_HIGHLIGHT } from "@/components/shell/Surface";
import { createPreviewItems } from "@/content/landingPreview";
import { SITE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";
import { Spotlight } from "./Spotlight";

// The window label shows the real host, so it cannot drift from SITE_URL.
const PREVIEW_ADDRESS = `${new URL(SITE_URL).host}/feed`;

// A still copy of the tab pill, with For you selected. It has the same classes
// as FeedTabs but none of its roles or handlers.
function PreviewTabs() {
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1">
      <span className="inline-flex h-7 items-center rounded-md px-3 text-small text-muted-foreground">
        Latest
      </span>
      <span className="inline-flex h-7 items-center rounded-md bg-background px-3 text-small text-foreground ring-1 ring-foreground/10">
        For you
      </span>
    </div>
  );
}

export function ProductPreview() {
  const items = createPreviewItems();

  return (
    <section className="py-24">
      <Container size="wide" verticalPadding={false}>
        <div className="text-center md:text-left">
          <SectionTitle>A feed that knows your stack</SectionTitle>
          <p className="mt-3 text-body text-muted-foreground">
            Green tags are the ones that match yours.
          </p>
        </div>

        {/* inert takes everything inside out of the tab order and the
            accessibility tree, so the example links cannot be reached. */}
        <Spotlight className="mx-auto mt-12 max-w-3xl rounded-2xl">
          <div
            inert
            className={cn(
              "select-none overflow-hidden rounded-2xl border bg-card/40",
              GLASS_HIGHLIGHT,
              GLASS_BLUR,
            )}
          >
            <div className="flex h-10 items-center gap-2 border-b px-4">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-2 font-mono text-micro text-muted-foreground">
                {PREVIEW_ADDRESS}
              </span>
            </div>
            <div className="p-4 sm:p-6">
              <PreviewTabs />
              <ul className="mt-4 space-y-3">
                {items.map((item, index) => (
                  <FeedItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    animateIn={false}
                  />
                ))}
              </ul>
            </div>
          </div>
        </Spotlight>
        <p className="mt-4 text-center text-small text-muted-foreground">
          Example requests, for illustration.
        </p>
      </Container>
    </section>
  );
}
