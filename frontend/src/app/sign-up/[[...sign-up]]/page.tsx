import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <Container size="reading" short>
      <div className="flex justify-center py-8">
        <SignUp />
      </div>
    </Container>
  );
}
