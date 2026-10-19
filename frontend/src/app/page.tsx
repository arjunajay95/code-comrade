import { redirect } from "next/navigation";

// Build item 5 of Phase 9.5 replaces this redirect with the landing page.
export default function Home() {
  redirect("/feed");
}
