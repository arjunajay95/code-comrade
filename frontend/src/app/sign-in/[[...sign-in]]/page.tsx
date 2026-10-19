import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Container size="reading" short>
      <div className="flex justify-center py-8">
        <SignIn />
      </div>
    </Container>
  );
}
